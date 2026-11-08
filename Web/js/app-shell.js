(function () {
    const pages = {
        training: document.getElementById("training"),
        "time-table": document.getElementById("time-table"),
        "attempt-log": document.getElementById("attempt-log"),
        info: document.getElementById("info"),
        backups: document.getElementById("backups")
    };
    let activePage = "training";
    let initialized = false;
    let latestWatcherStatus = null;
    const backupOwners = new Map();

    function notifyActivity() {
        Object.entries(pages).forEach(([name, frame]) => frame.contentWindow.postMessage({
            type: "pageActivity", active: name === activePage
        }, "*"));
    }

    function updateFrameTitles() {
        const portuguese = localStorage.getItem("cuphead-training-lang") === "pt-BR";
        pages.training.title = portuguese ? "Treino" : "Training";
        pages["time-table"].title = portuguese ? "Tabela de Tempos" : "Time Table";
        pages["attempt-log"].title = portuguese ? "Registro de tentativas" : "Attempt Log";
    }

    updateFrameTitles();
    window.addEventListener("storage", event => {
        if (event.key === "cuphead-training-lang") updateFrameTitles();
        if (event.key === "cupheadCompactMode" || event.key === null) {
            sendToHost({ cmd: "setCompactMode", value: localStorage.getItem("cupheadCompactMode") !== "false" });
        }
    });

    function sendToHost(message) {
        window.chrome?.webview?.postMessage(message);
    }

    function selectPage(name) {
        if (!Object.hasOwn(pages, name) || name === activePage) return;
        activePage = name;
        Object.entries(pages).forEach(([page, frame]) => {
            frame.hidden = page !== name;
        });
        const frame = pages[name];
        if (!frame.hasAttribute("src")) frame.src = frame.dataset.src;
        activatePage();
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
        else if (message?.type === "hostCommand" && message.command) {
            // Hidden, preloaded pages must not request history or alter stats mode.
            if (event.source !== pages[activePage].contentWindow) return;
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

        try {
            sendToHost({ cmd: "setCompactMode", value: localStorage.getItem("cupheadCompactMode") !== "false" });
        } catch { /* local storage may be unavailable */ }
    }

    for (const [name, frame] of Object.entries(pages)) {
        function pageLoaded() {
            if (!frame.contentDocument || frame.contentDocument.URL === "about:blank") return;
            frame.dataset.ready = "true";
            if (name === activePage) {
                initializeShell();
                activatePage();
            }
        }
        frame.addEventListener("load", pageLoaded);
        if (frame.contentDocument?.readyState === "complete") pageLoaded();
    }
})();
