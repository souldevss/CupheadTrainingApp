(function () {
    const pages = {
        training: document.getElementById("training"),
        "time-table": document.getElementById("time-table"),
        "attempt-log": document.getElementById("attempt-log"),
        info: document.getElementById("info"),
        backups: document.getElementById("backups")
    };
    let activePage = "training";
    let pendingPage = null;
    let preloading = null;
    let initialized = false;
    let latestWatcherStatus = null;
    const backupOwners = new Map();

    function notifyActivity() {
        for (const [name, frame] of Object.entries(pages)) {
            if (frame.dataset.ready === "true") {
                frame.contentWindow.postMessage({ type: "pageActivity", active: name === activePage }, "*");
            }
        }
    }

    function updateFrameTitles() {
        const portuguese = localStorage.getItem("cuphead-training-lang") === "pt-BR";
        document.documentElement.lang = portuguese ? "pt-BR" : "en";
        document.title = portuguese ? "App de treino de Cuphead" : "Cuphead Training App";
        sendToHost({ cmd: "setAppLanguage", portuguese });
        pages.training.title = portuguese ? "Treino" : "Training";
        pages["time-table"].title = portuguese ? "Tabela de Tempos" : "Time Table";
        pages["attempt-log"].title = portuguese ? "Registro de tentativas" : "Attempt Log";
    }

    updateFrameTitles();
    window.addEventListener("storage", event => {
        if (event.key === "cuphead-training-lang" || event.key === null) updateFrameTitles();
    });

    function sendToHost(message) {
        window.chrome?.webview?.postMessage(message);
    }

    function selectPage(name) {
        if (!Object.hasOwn(pages, name)) return;
        pendingPage = null;
        if (name === activePage) return;
        const frame = pages[name];
        if (frame.dataset.ready !== "true") {
            pendingPage = name;
            if (!frame.hasAttribute("src")) frame.src = frame.dataset.src;
            return;
        }
        activePage = name;
        Object.entries(pages).forEach(([page, frame]) => {
            frame.hidden = page !== name;
        });
        initializeShell();
        activatePage();
    }

    function preloadNextPage() {
        const name = ["time-table", "attempt-log", "backups", "info"].find(name => !pages[name].hasAttribute("src"));
        if (preloading || !name) return;
        preloading = name;
        const load = () => {
            const frame = pages[name];
            if (!frame.hasAttribute("src")) frame.src = frame.dataset.src;
        };
        if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 500 });
        else window.setTimeout(load, 50);
    }

    function activatePage() {
        notifyActivity();
        const frame = pages[activePage];
        const includeHistory = activePage === "attempt-log";
        const enabled = frame.dataset.ready === "true" && (activePage === "training" || includeHistory);
        sendToHost({ cmd: "setStatsMode", enabled, includeRecent: includeHistory, includeHistory });
        if (frame.dataset.ready !== "true") return;
        if (latestWatcherStatus) frame.contentWindow.postMessage({ type: "hostMessage", payload: latestWatcherStatus }, "*");
        if (enabled) sendToHost({ cmd: "getStats", includeRecent: includeHistory, includeHistory,
            categoryKey: includeHistory ? (localStorage.getItem("cupheadLogCategory") || "1-1") : undefined });
    }

    window.addEventListener("message", event => {
        const message = event.data;
        if (message?.type === "switchPage") selectPage(message.page);
        else if (message?.type === "pageReady" && event.origin === location.origin) {
            const name = Object.keys(pages).find(name => pages[name].contentWindow === event.source);
            if (name) pageReady(name, pages[name]);
        }
        else if (message?.type === "hostCommand" && message.command) {
            // Hidden, preloaded pages must not request history or alter stats mode.
            if (event.source !== pages[activePage].contentWindow || pages[activePage].dataset.ready !== "true") return;
            if (["exportBackup", "importBackup"].includes(message.command.cmd)) backupOwners.set(message.command.cmd, event.source);
            sendToHost(message.command);
        }
    });

    window.chrome?.webview?.addEventListener("message", event => {
        let message = event.data;
        if (typeof message === "string") {
            try { message = JSON.parse(message); } catch { return; }
        }
        if (!message) return;
        const backupCommand = message.type === "backupDatabase" ? "exportBackup"
            : ["backupImportComplete", "backupImportError"].includes(message.type) ? "importBackup" : null;
        if (backupCommand) {
            const target = backupOwners.get(backupCommand) || pages[activePage].contentWindow;
            backupOwners.delete(backupCommand);
            target.postMessage({ type: "hostMessage", payload: message }, "*");
            return;
        }
        if (message.type === "watcherStatus") latestWatcherStatus = message;
        // Keep one copy of history and redraw only the visible page. Each page
        // requests fresh stats when selected, retaining instant tab navigation.
        pages[activePage].contentWindow.postMessage({ type: "hostMessage", payload: message }, "*");
    });

    function initializeShell() {
        if (initialized) return;
        initialized = true;
        sendToHost({ cmd: "getWatcherState" });

        const localStorageSnapshot = () => Object.fromEntries(
            Array.from({ length: localStorage.length }, (_, index) => {
                const key = localStorage.key(index);
                return [key, localStorage.getItem(key)];
            })
        );
        const saveBackup = () => sendToHost({ cmd: "autoBackup", localStorage: localStorageSnapshot() });
        saveBackup();
        window.setInterval(saveBackup, 10 * 60 * 1000);
    }

    function pageReady(name, frame) {
        if (frame.dataset.ready === "true" || !frame.contentDocument || frame.contentDocument.URL === "about:blank") return;
        frame.dataset.ready = "true";
        if (name === activePage) {
            initializeShell();
            activatePage();
        }
        if (name === pendingPage) selectPage(name);
        if (name === preloading) preloading = null;
        if (initialized) preloadNextPage();
    }

    for (const [name, frame] of Object.entries(pages)) {
        const pageLoaded = () => pageReady(name, frame);
        frame.addEventListener("load", pageLoaded);
        if (frame.contentDocument?.readyState === "complete") pageLoaded();
    }
})();
