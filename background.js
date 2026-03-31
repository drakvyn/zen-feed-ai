const rt = globalThis.browser?.runtime || globalThis.chrome?.runtime;
if (rt?.onInstalled) rt.onInstalled.addListener(() => {});
