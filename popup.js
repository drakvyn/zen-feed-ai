(function () {
  const enabledEl = document.getElementById("enabled");
  const keywordsEl = document.getElementById("keywords");
  const errEl = document.getElementById("popup-error");

  const ext =
    typeof globalThis.browser !== "undefined" && globalThis.browser.storage?.local
      ? globalThis.browser
      : globalThis.chrome;
  const isMozilla = ext === globalThis.browser;

  function showError(msg) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = msg;
    }
  }

  if (!enabledEl || !keywordsEl) {
    showError("Popup UI failed to load.");
    return;
  }

  function storageLocalGet(keys) {
    if (isMozilla) return ext.storage.local.get(keys);
    return new Promise((resolve, reject) => {
      ext.storage.local.get(keys, (items) => {
        const err = ext.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(items);
      });
    });
  }

  function storageLocalSet(obj) {
    if (isMozilla) return ext.storage.local.set(obj);
    return new Promise((resolve, reject) => {
      ext.storage.local.set(obj, () => {
        const err = ext.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  async function load() {
    try {
      const items = await storageLocalGet({
        filterEnabled: true,
        customKeywords: "",
      });
      enabledEl.checked = items.filterEnabled !== false;
      keywordsEl.value = items.customKeywords || "";
    } catch (e) {
      showError(e.message || "Could not load settings.");
    }
  }

  function isLinkedInUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      const { hostname } = new URL(url);
      return (
        hostname === "linkedin.com" ||
        hostname === "www.linkedin.com" ||
        hostname.endsWith(".linkedin.com")
      );
    } catch (_) {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function queryAllTabs() {
    if (isMozilla) return ext.tabs.query({});
    return new Promise((resolve) => ext.tabs.query({}, resolve));
  }

  async function sendToTab(tabId, msg) {
    if (isMozilla) {
      await ext.tabs.sendMessage(tabId, msg);
      return;
    }
    await new Promise((resolve, reject) => {
      ext.tabs.sendMessage(tabId, msg, () => {
        if (ext.runtime.lastError) reject();
        else resolve();
      });
    });
  }

  async function notifyLinkedInTabs(state) {
    const msg = {
      type: "ln-hide-ai-reload",
      filterEnabled: state.filterEnabled,
      customKeywords: state.customKeywords,
    };
    let allTabs;
    try {
      allTabs = await queryAllTabs();
    } catch (_) {
      return;
    }
    const linkedInTabs = (allTabs || []).filter((t) => isLinkedInUrl(t.url));
    const attempts = 8;
    const gapMs = 100;
    for (const tab of linkedInTabs) {
      for (let i = 0; i < attempts; i++) {
        try {
          await sendToTab(tab.id, msg);
          break;
        } catch (_) {
          if (i < attempts - 1) await sleep(gapMs);
        }
      }
    }
  }

  async function save() {
    try {
      const state = {
        filterEnabled: enabledEl.checked,
        customKeywords: keywordsEl.value.trim(),
      };
      await storageLocalSet({
        filterEnabled: state.filterEnabled,
        customKeywords: state.customKeywords,
      });
      await notifyLinkedInTabs(state);
    } catch (e) {
      showError(e.message || "Could not save settings.");
    }
  }

  enabledEl.addEventListener("change", save);
  keywordsEl.addEventListener("input", () => {
    clearTimeout(keywordsEl._t);
    keywordsEl._t = setTimeout(save, 400);
  });
  // Flush pending debounce if the popup closes before 400ms (keywords would never save).
  keywordsEl.addEventListener("blur", () => {
    clearTimeout(keywordsEl._t);
    keywordsEl._t = null;
    save();
  });

  load();
})();
