(function() {
  const pages = {
    training: document.getElementById("training"),
    "time-table": document.getElementById("time-table"),
    "attempt-log": document.getElementById("attempt-log"),
    info: document.getElementById("info"),
    backups: document.getElementById("backups")
  };
  let activePage = "training", pendingPage = null, preloading = null, initialized = !1, latestWatcherStatus = null;
  const backupOwners = /* @__PURE__ */ new Map();
  function notifyActivity() {
    for (const [name, frame] of Object.entries(pages))
      frame.dataset.ready === "true" && frame.contentWindow.postMessage({ type: "pageActivity", active: name === activePage }, "*");
  }
  function updateFrameTitles() {
    const portuguese = localStorage.getItem("cuphead-training-lang") === "pt-BR";
    document.documentElement.lang = portuguese ? "pt-BR" : "en", document.title = portuguese ? "App de treino de Cuphead" : "Cuphead Training App", sendToHost({ cmd: "setAppLanguage", portuguese }), pages.training.title = portuguese ? "Treino" : "Training", pages["time-table"].title = portuguese ? "Tabela de Tempos" : "Time Table", pages["attempt-log"].title = portuguese ? "Registro de tentativas" : "Attempt Log";
  }
  updateFrameTitles(), window.addEventListener("storage", (event) => {
    (event.key === "cuphead-training-lang" || event.key === null) && updateFrameTitles();
  });
  function sendToHost(message) {
    window.chrome?.webview?.postMessage(message);
  }
  function selectPage(name) {
    if (!Object.hasOwn(pages, name) || (pendingPage = null, name === activePage)) return;
    const frame = pages[name];
    if (frame.dataset.ready !== "true") {
      pendingPage = name, frame.hasAttribute("src") || (frame.src = frame.dataset.src);
      return;
    }
    activePage = name, Object.entries(pages).forEach(([page, frame2]) => {
      frame2.hidden = page !== name;
    }), initializeShell(), activatePage();
  }
  function preloadNextPage() {
    const name = ["time-table", "attempt-log", "backups", "info"].find((name2) => !pages[name2].hasAttribute("src"));
    if (preloading || !name) return;
    preloading = name;
    const load = () => {
      const frame = pages[name];
      frame.hasAttribute("src") || (frame.src = frame.dataset.src);
    };
    window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 500 }) : window.setTimeout(load, 50);
  }
  function activatePage() {
    document.documentElement.classList.remove("is-scrolling");
    notifyActivity();
    const frame = pages[activePage], includeHistory = activePage === "attempt-log", enabled = frame.dataset.ready === "true" && (activePage === "training" || includeHistory);
    sendToHost({ cmd: "setStatsMode", enabled, includeRecent: includeHistory, includeHistory }), frame.dataset.ready === "true" && (latestWatcherStatus && frame.contentWindow.postMessage({ type: "hostMessage", payload: latestWatcherStatus }, "*"), enabled && sendToHost({
      cmd: "getStats",
      includeRecent: includeHistory,
      includeHistory,
      categoryKey: localStorage.getItem("cupheadLogCategory") || "1-1"
    }));
  }
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.type === "pageScrollActivity") {
      if (event.origin === location.origin && event.source === pages[activePage].contentWindow)
        document.documentElement.classList.toggle("is-scrolling", message.active === true);
    } else if (message?.type === "switchPage") selectPage(message.page);
    else if (message?.type === "pageReady" && event.origin === location.origin) {
      const name = Object.keys(pages).find((name2) => pages[name2].contentWindow === event.source);
      name && pageReady(name, pages[name]);
    } else if (message?.type === "hostCommand" && message.command) {
      if (event.source !== pages[activePage].contentWindow || pages[activePage].dataset.ready !== "true") return;
      ["exportBackup", "importBackup"].includes(message.command.cmd) && backupOwners.set(message.command.cmd, event.source), sendToHost(message.command);
    }
  }), window.chrome?.webview?.addEventListener("message", (event) => {
    let message = event.data;
    if (typeof message == "string")
      try {
        message = JSON.parse(message);
      } catch {
        return;
      }
    if (!message) return;
    const backupCommand = message.type === "backupDatabase" ? "exportBackup" : ["backupImportComplete", "backupImportError"].includes(message.type) ? "importBackup" : null;
    if (backupCommand) {
      const target = backupOwners.get(backupCommand) || pages[activePage].contentWindow;
      backupOwners.delete(backupCommand), target.postMessage({ type: "hostMessage", payload: message }, "*");
      return;
    }
    message.type === "watcherStatus" && (latestWatcherStatus = message), pages[activePage].contentWindow.postMessage({ type: "hostMessage", payload: message }, "*");
  });
  function initializeShell() {
    if (initialized) return;
    initialized = !0, sendToHost({ cmd: "getWatcherState" });
    const localStorageSnapshot = () => Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return [key, localStorage.getItem(key)];
      })
    ), saveBackup = () => sendToHost({ cmd: "autoBackup", localStorage: localStorageSnapshot() });
    saveBackup(), window.setInterval(saveBackup, 600 * 1e3);
  }
  function pageReady(name, frame) {
    frame.dataset.ready === "true" || !frame.contentDocument || frame.contentDocument.URL === "about:blank" || (frame.dataset.ready = "true", name === activePage && (initializeShell(), activatePage()), name === pendingPage && selectPage(name), name === preloading && (preloading = null), initialized && preloadNextPage());
  }
  for (const [name, frame] of Object.entries(pages)) {
    const pageLoaded = () => pageReady(name, frame);
    frame.addEventListener("load", pageLoaded), frame.contentDocument?.readyState === "complete" && pageLoaded();
  }
})();
