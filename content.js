(function () {
  const browserAPI =
    typeof globalThis.browser !== "undefined" && globalThis.browser.storage
      ? globalThis.browser
      : globalThis.chrome;

  if (!document.querySelector("style[data-ln-hide-ai]")) {
    const s = document.createElement("style");
    s.setAttribute("data-ln-hide-ai", "1");
    s.textContent = ".ln-hide-ai--hidden{display:none !important;}";
    (document.head || document.documentElement).appendChild(s);
  }

  const PHRASES = [
    "ai",
    "ia",
    "artificial intelligence",
    "inteligencia artificial",
    "machine learning",
    "aprendizaje automático",
    "deep learning",
    "large language model",
    "language model",
    "generative ai",
    "generative artificial",
    "gen ai",
    "genai",
    "chatgpt",
    "chat gpt",
    "gpt-4",
    "gpt-3",
    "gpt 4",
    "gpt 3",
    "gpt4",
    "gpt3",
    "openai",
    "anthropic",
    "claude",
    "claude ",
    "midjourney",
    "dall-e",
    "dall·e",
    "stable diffusion",
    "prompt engineering",
    "ingeniería de prompts",
    "copilot",
    "github copilot",
    "google gemini",
    "gemini pro",
    "google bard",
    "neural network",
    "neural networks",
    "redes neuronales",
    "fine-tuning",
    "finetuning",
    "fine tuning",
    "retrieval augmented",
    "rag pipeline",
    "multimodal model",
    "diffusion model",
    "transformer model",
    "whisper",
    "embedding model",
    "vector database",
    "langchain",
    "haystack",
    "hugging face",
    "mistral ai",
    "cohere",
    "perplexity ai",
    "whatsapp",
    "whatsapp business",
  ];

  const SHORT_PATTERNS = [
    /\bai\b/i,
    /\bia\b/i,
    /\bml\b/i,
    /\bllm\b/i,
    /\bllms\b/i,
    /\brag\b/i,
    /\bagi\b/i,
  ];

  let enabled = true;
  let customPhrases = [];
  let lastStorageSig = null;

  /**
   * LinkedIn posts often use Unicode “mathematical” / sans-serif italic letters (same look as
   * normal text) so substrings like "ai" / "inteligencia artificial" never match in raw UTF-16.
   */
  function foldMathAndFullwidthLatin(str) {
    const upperLowerStarts = [
      [0x1d400, 0x1d41a],
      [0x1d434, 0x1d44e],
      [0x1d468, 0x1d482],
      [0x1d5a0, 0x1d5ba],
      [0x1d5d4, 0x1d5ee],
      [0x1d608, 0x1d622],
      [0x1d63c, 0x1d656],
    ];
    function mapMath(cp) {
      for (const [u0, l0] of upperLowerStarts) {
        if (cp >= u0 && cp < u0 + 26) return 0x41 + (cp - u0);
        if (cp >= l0 && cp < l0 + 26) return 0x61 + (cp - l0);
      }
      return null;
    }
    let out = "";
    for (let i = 0; i < str.length; ) {
      const cp = str.codePointAt(i);
      i += cp > 0xffff ? 2 : 1;
      let ascii = mapMath(cp);
      if (ascii == null && cp >= 0xff21 && cp <= 0xff3a) ascii = 0x41 + (cp - 0xff21);
      if (ascii == null && cp >= 0xff41 && cp <= 0xff5a) ascii = 0x61 + (cp - 0xff41);
      out += ascii != null ? String.fromCharCode(ascii) : String.fromCodePoint(cp);
    }
    return out;
  }

  function normalizeText(s) {
    const folded = foldMathAndFullwidthLatin((s || "").normalize("NFKC"));
    return folded.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function phraseMatches(p, lower, prepared) {
    if (!p) return false;
    if (p === "ai" || p === "ia") {
      return new RegExp(`\\b${p}\\b`, "iu").test(prepared);
    }
    return lower.includes(p);
  }

  function matchesPostText(raw) {
    const prepared = foldMathAndFullwidthLatin((raw || "").normalize("NFKC"));
    const lower = prepared.toLowerCase().replace(/\s+/g, " ").trim();
    if (!lower) return false;

    for (const p of PHRASES) {
      if (phraseMatches(p, lower, prepared)) return true;
    }
    for (const p of customPhrases) {
      if (phraseMatches(p, lower, prepared)) return true;
    }
    for (const re of SHORT_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(prepared)) return true;
    }
    return false;
  }

  function parseCustomKeywords(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);
  }

  function getFeedScope() {
    // LinkedIn’s feed column is often outside <main> (shell/nav vs content). Scanning only
    // main yields zero cards and hides nothing on /feed/.
    return document;
  }

  /**
   * Open shadow roots only. Substring match `*[class*="feed-shared-update-v2"]` hits
   * `feed-shared-update-v2__actor` etc.; closest() then stops on inner wrappers → wrong root, thin innerText.
   */
  function querySelectorAllDeep(root, selector) {
    const out = [];
    function search(node) {
      if (!node?.querySelectorAll) return;
      try {
        node.querySelectorAll(selector).forEach((el) => out.push(el));
      } catch (_) {}
      node.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) search(el.shadowRoot);
      });
    }
    search(root === document ? document.documentElement : root);
    return out;
  }

  /** New LinkedIn UI: hashed CSS; real posts are role=listitem + componentkey *MAIN_FEED*. */
  function isMainFeedListItem(el) {
    if (!el?.matches?.('div[role="listitem"]')) return false;
    const ck = el.getAttribute("componentkey") || "";
    const ckl = ck.toLowerCase();
    return (
      ckl.includes("main_feed_relevance") ||
      ckl.includes("feedtype_main_feed") ||
      /feedtype_.*main_feed/i.test(ck) ||
      (ckl.includes("feedtype") && ckl.includes("sponsored"))
    );
  }

  function closestMainFeedPostRoot(el) {
    let n = el;
    for (let i = 0; i < 45 && n && n.nodeType === 1; i++) {
      if (isMainFeedListItem(n)) return n;
      n = n.parentElement;
    }
    return null;
  }

  function isFeedCardComponentKey(ck) {
    const ckl = (ck || "").toLowerCase();
    return (
      ckl.includes("main_feed_relevance") ||
      ckl.includes("feedtype_main_feed") ||
      /feedtype_.*main_feed/i.test(ck || "")
    );
  }

  /** Outer wrapper (sometimes no role=listitem) for “X comentó esto” + post + comments. */
  function closestFeedCardShell(el) {
    let n = el;
    for (let i = 0; i < 55 && n && n.nodeType === 1; i++) {
      if (n.tagName === "DIV" && isFeedCardComponentKey(n.getAttribute("componentkey"))) return n;
      n = n.parentElement;
    }
    return null;
  }

  const DIGEST_LINE_MARKERS = [
    "han comentado esto",
    "han reaccionado a esto",
    "comentó esto",
    "reaccionó a esto",
    "commented on this",
    "reacted to this",
    "liked this",
    "reposted this",
  ];

  /** Prefer the full update card so innerText includes body copy (organic + promoted). */
  function bestRootFor(el) {
    if (!el || !el.closest) return el;
    const graph = closestMainFeedPostRoot(el);
    if (graph) return graph;
    const shell = closestFeedCardShell(el);
    if (shell) return shell;
    return (
      el.closest("div.feed-shared-update-v2") ||
      el.closest('div[class*="occludable-update"]') ||
      el.closest("div.feed-shared-card") ||
      el.closest('div[class*="feed-shared-card"]') ||
      el.closest('div[class*="fie-impression-container"]') ||
      el.closest("article") ||
      el
    );
  }

  /** One outer root per post so we do not only hide an inner chunk and leave an empty shell. */
  function keepOutermostOnly(roots) {
    const arr = roots.filter(Boolean);
    return arr.filter((r) => !arr.some((o) => o !== r && o.contains(r)));
  }

  const FEED_SCROLL_SELECTORS = [
    ".scaffold-finite-scroll__content",
    "[class*='scaffold-finite-scroll__content']",
    "main .scaffold-layout__list",
    "[class*='scaffold-layout__list']",
    "[class*='feed-container']",
    "[role='feed']",
  ];

  function isLikelySinglePostOccludable(el) {
    if (!el?.querySelectorAll) return false;
    let n = 0;
    el.querySelectorAll('div[class*="feed-shared-update-v2"]').forEach((d) => {
      if (/\bfeed-shared-update-v2\b/.test(d.className || "")) n += 1;
    });
    return n <= 1;
  }

  /** LinkedIn virtual feed: one slot per direct child of the scroll column. */
  function addFeedColumnChunkRoots(set) {
    const seen = new Set();
    const considerContainer = (container) => {
      if (!container || seen.has(container)) return;
      seen.add(container);
      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const tag = child.tagName;
        if (tag !== "DIV" && tag !== "LI" && tag !== "SECTION" && tag !== "ARTICLE") return;
        const len = (child.innerText || "").replace(/\s+/g, " ").trim().length;
        if (len < 20) return;
        set.add(child);
      });
    };

    FEED_SCROLL_SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((c) => considerContainer(c));
      } catch (_) {}
    });
    try {
      querySelectorAllDeep(document.documentElement, ".scaffold-finite-scroll__content").forEach((c) =>
        considerContainer(c)
      );
    } catch (_) {}
  }

  function addGraphQlFeedPostRoots(set) {
    const visit = (el) => {
      if (isMainFeedListItem(el)) set.add(el);
    };
    try {
      document.querySelectorAll('div[role="listitem"]').forEach(visit);
    } catch (_) {}
    try {
      querySelectorAllDeep(document.documentElement, 'div[role="listitem"]').forEach(visit);
    } catch (_) {}
    const boxSel = '[data-testid="expandable-text-box"]';
    const fromBox = (box) => {
      const li = closestMainFeedPostRoot(box);
      if (li) set.add(li);
      else {
        const shell = closestFeedCardShell(box);
        if (shell) set.add(shell);
      }
    };
    try {
      document.querySelectorAll(boxSel).forEach(fromBox);
    } catch (_) {}
    try {
      querySelectorAllDeep(document.documentElement, boxSel).forEach(fromBox);
    } catch (_) {}

    const fromTestId = (el) => {
      const li = el.closest?.('div[role="listitem"]');
      if (li && isMainFeedListItem(li)) set.add(li);
      else {
        const shell = closestFeedCardShell(el);
        if (shell) set.add(shell);
      }
    };
    try {
      document.querySelectorAll('[data-testid*="FeedType_MAIN_FEED"]').forEach(fromTestId);
    } catch (_) {}
    try {
      querySelectorAllDeep(document.documentElement, '[data-testid*="FeedType_MAIN_FEED"]').forEach(
        fromTestId
      );
    } catch (_) {}

    try {
      document.querySelectorAll("p").forEach((p) => {
        const it = (p.innerText || "").trim();
        if (it.length > 260) return;
        const il = it.toLowerCase();
        if (!DIGEST_LINE_MARKERS.some((m) => il.includes(m))) return;
        const li = closestMainFeedPostRoot(p);
        if (li) set.add(li);
        else {
          const shell = closestFeedCardShell(p);
          if (shell) set.add(shell);
        }
      });
    } catch (_) {}
  }

  function getPostRoots() {
    const set = new Set();
    const scope = getFeedScope();
    const rootEl = scope === document ? document.documentElement : scope;

    addGraphQlFeedPostRoots(set);
    addFeedColumnChunkRoots(set);

    const cardSelector = "div.feed-shared-update-v2";
    let cards = Array.from(scope.querySelectorAll(cardSelector));
    if (cards.length === 0) {
      cards = querySelectorAllDeep(rootEl, cardSelector);
    }
    cards.forEach((el) => set.add(el));
    if (set.size === 0) {
      scope.querySelectorAll('div[class*="feed-shared-update-v2"]').forEach((el) => {
        if (/\bfeed-shared-update-v2\b/.test(el.className || "")) set.add(el);
      });
    }

    const urnSelectors = [
      '[data-urn*="urn:li:activity"]',
      '[data-urn*="sponsored"]',
      '[data-urn*="ugcPost"]',
      '[data-id*="urn:li:activity"]',
      '[data-id*="sponsored"]',
    ];
    for (const sel of urnSelectors) {
      const addFrom = (el) => {
        const root = bestRootFor(el);
        if (root) set.add(root);
      };
      scope.querySelectorAll(sel).forEach(addFrom);
      querySelectorAllDeep(rootEl, sel).forEach(addFrom);
    }

    scope.querySelectorAll('div[class*="occludable-update"]').forEach((el) => {
      const t = (el.innerText || "").length;
      if (t < 30) return;
      if (!isLikelySinglePostOccludable(el)) return;
      set.add(el);
    });

    scope.querySelectorAll('[data-view-name="feed-full-update"]').forEach((el) => {
      const wrap =
        el.closest('div[class*="occludable-update"]') ||
        el.closest("div.feed-shared-update-v2") ||
        el;
      if (wrap) set.add(wrap);
    });

    scope.querySelectorAll('div[class*="fie-impression-container"]').forEach((el) => {
      const wrap = bestRootFor(el);
      if (wrap) set.add(wrap);
    });

    const merged = keepOutermostOnly([...set]);
    return new Set(merged);
  }

  const MAX_MATCH_CHARS = 120000;

  function getRootTextForMatch(root) {
    const a = root.innerText || "";
    const b = root.textContent || "";
    const slice = (s) => (s.length > MAX_MATCH_CHARS ? s.slice(0, MAX_MATCH_CHARS) : s);
    if (!b || b === a) return slice(a);
    return slice(a + "\n" + b);
  }

  function applyVisibility() {
    const roots = getPostRoots();
    roots.forEach((root) => {
      if (!enabled) {
        root.classList.remove("ln-hide-ai--hidden");
        return;
      }
      const text = getRootTextForMatch(root);
      if (matchesPostText(text)) {
        root.classList.add("ln-hide-ai--hidden");
      } else {
        root.classList.remove("ln-hide-ai--hidden");
      }
    });
  }

  function showAllPosts() {
    document.querySelectorAll(".ln-hide-ai--hidden").forEach((el) => {
      el.classList.remove("ln-hide-ai--hidden");
    });
  }

  let debounceId = null;
  function scheduleScan() {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      debounceId = null;
      if (enabled) applyVisibility();
    }, 50);
  }

  function storageLocalGet(keys) {
    if (typeof globalThis.browser !== "undefined" && globalThis.browser.storage?.local) {
      return globalThis.browser.storage.local.get(keys);
    }
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.get(keys, resolve);
    });
  }

  function applySettings(filterEnabledRaw, keywordsText) {
    enabled = filterEnabledRaw !== false;
    customPhrases = parseCustomKeywords(keywordsText || "");
    lastStorageSig = JSON.stringify([
      filterEnabledRaw,
      keywordsText || "",
    ]);
    if (enabled) applyVisibility();
    else showAllPosts();
  }

  async function refreshFromStorage() {
    const items = await storageLocalGet({
      filterEnabled: true,
      customKeywords: "",
    });
    const sig = JSON.stringify([
      items.filterEnabled,
      items.customKeywords || "",
    ]);
    if (sig === lastStorageSig) return;
    applySettings(items.filterEnabled, items.customKeywords);
  }

  async function loadSettings() {
    try {
      await refreshFromStorage();
    } catch (_) {
      if (enabled) applyVisibility();
    }
  }

  browserAPI.storage.onChanged.addListener((changes) => {
    if (!changes.filterEnabled && !changes.customKeywords) return;
    refreshFromStorage().catch(() => {});
  });

  browserAPI.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ln-hide-ai-reload" && "filterEnabled" in msg) {
      applySettings(msg.filterEnabled, msg.customKeywords);
    }
  });

  let domObserver = null;
  let rescanIntervalId = null;
  function startDomWatch() {
    if (domObserver || document.hidden) return;
    domObserver = new MutationObserver(() => scheduleScan());
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  function stopDomWatch() {
    domObserver?.disconnect();
    domObserver = null;
  }
  function startPeriodicRescan() {
    if (rescanIntervalId || document.hidden) return;
    rescanIntervalId = setInterval(() => {
      if (!document.hidden && enabled) applyVisibility();
    }, 900);
  }
  function stopPeriodicRescan() {
    if (rescanIntervalId) {
      clearInterval(rescanIntervalId);
      rescanIntervalId = null;
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopDomWatch();
      stopPeriodicRescan();
    } else {
      startDomWatch();
      startPeriodicRescan();
      refreshFromStorage().catch(() => {});
      scheduleScan();
    }
  });

  loadSettings();
  applyVisibility();
  scheduleScan();
  startDomWatch();
  startPeriodicRescan();
  [80, 400, 1200, 2800].forEach((ms) => {
    setTimeout(() => {
      if (enabled) applyVisibility();
    }, ms);
  });

  // Restored from bfcache: in-memory settings can be stale vs storage.
  window.addEventListener("pageshow", (ev) => {
    if (!ev.persisted) return;
    lastStorageSig = null;
    loadSettings();
    scheduleScan();
    startDomWatch();
    startPeriodicRescan();
  });
})();
