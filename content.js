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

  function normalizeText(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function matchesPostText(raw) {
    const lower = normalizeText(raw);
    if (!lower) return false;

    for (const p of PHRASES) {
      if (lower.includes(p)) return true;
    }
    for (const p of customPhrases) {
      if (p && lower.includes(p)) return true;
    }
    for (const re of SHORT_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(raw)) return true;
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

  function getPostRoots() {
    const set = new Set();
    document
      .querySelectorAll('div[class*="feed-shared-update-v2"]')
      .forEach((el) => set.add(el));
    document.querySelectorAll('[data-urn*="urn:li:activity"]').forEach((el) => {
      const card = el.closest('div[class*="feed-shared-update-v2"]');
      set.add(card || el);
    });
    return set;
  }

  function applyVisibility() {
    const roots = getPostRoots();
    roots.forEach((root) => {
      if (!enabled) {
        root.classList.remove("ln-hide-ai--hidden");
        return;
      }
      const text = root.innerText || "";
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
    }, 200);
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
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopDomWatch();
    } else {
      startDomWatch();
      refreshFromStorage().catch(() => {});
      scheduleScan();
    }
  });

  loadSettings();
  scheduleScan();
  startDomWatch();
})();
