// Desktop host integration (WebView2): game watcher + personal time sync

(function () {
    const hasHost = !!(window.chrome && window.chrome.webview);
    const embedded = window.parent !== window;
    let inAppShell = false;
    let latestWatcherPayload = null;
    if (embedded) {
        try { inAppShell = !!window.parent.document.getElementById("pages"); }
        catch { /* cross-origin parent */ }
    }
    const desktopConnected = hasHost || inAppShell;
    let pendingBackupStorage = null;

    function normalizeName(name) {
        return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function findInputIdForCategory(levelName, categoryKey) {
        if (typeof speedrunCategories === "undefined") return null;
        const [categoryId, subOption] = categoryKey.split(":");
        let cat = speedrunCategories.find(c => c.id === categoryId);
        if (subOption) cat = cat?.subOptions?.find(option => option.id === subOption);
        if (!cat || !cat.islands) return null;

        const target = normalizeName(levelName);
        let counter = 0;
        for (const island of cat.islands) {
            for (const boss of island.levels) {
                if (normalizeName(boss.name) === target) {
                    return `personal-time-${counter}`;
                }
                counter++;
            }
        }
        return null;
    }

    function readStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || {};
        } catch {
            return {};
        }
    }

    function applyPersonalTimeIfBetter(levelName, seconds, categoryKey = "1-1") {
        if (!Number.isFinite(seconds) || seconds <= 0) return false;
        if (typeof formatTime !== "function" || typeof parseTime !== "function") return false;

        const inputId = findInputIdForCategory(levelName, categoryKey);
        if (!inputId) return false;

        const storageKey = `cupheadPersonalTimes:${categoryKey}`;
        const stored = readStorage(storageKey);
        const nextValue = formatTime(seconds);
        const currentSeconds = parseTime(stored[inputId] || "");
        if (currentSeconds !== null && currentSeconds <= seconds) return false;

        stored[inputId] = nextValue;
        localStorage.setItem(storageKey, JSON.stringify(stored));

        const input = document.getElementById(inputId);
        const displayedCategory = typeof activeCategory !== "undefined"
            ? activeCategory.id + (activeCategory.id === "DLC" ? `:${activeSubOption}` : "") : null;
        if (input && displayedCategory === categoryKey) {
            input.value = nextValue;
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        return true;
    }

    function ensureWatcherDock() {
        if (document.getElementById("host-watcher-dock")) return;

        const dock = document.createElement("div");
        dock.id = "host-watcher-dock";
        dock.className = "host-watcher-dock";
        dock.innerHTML = `
            <span id="host-watcher-dot" class="host-watcher-dot"></span>
            <span id="host-watcher-text" class="host-watcher-text">${t("host.desktop-connected")}</span>
            <button id="host-watcher-toggle" type="button" class="host-watcher-btn">${t("host.watch")}</button>
            <a class="host-watcher-link" href="autolog.html">${t("nav.attempt-log")}</a>
        `;
        document.body.appendChild(dock);

        const toggle = document.getElementById("host-watcher-toggle");
        toggle.addEventListener("click", () => {
            postToHost({ cmd: "toggleWatching" });
        });
    }

    function setWatcherUi(payload) {
        latestWatcherPayload = payload;
        ensureWatcherDock();
        const dot = document.getElementById("host-watcher-dot");
        const text = document.getElementById("host-watcher-text");
        const toggle = document.getElementById("host-watcher-toggle");
        if (!dot || !text || !toggle) return;

        dot.classList.remove("active", "warn");
        if (payload.watching) dot.classList.add("active");
        if (payload.warning) dot.classList.add("warn");

        text.textContent = translateWatcherStatus(payload.status || "Ready");
        toggle.textContent = payload.watching ? t("host.stop-watching") : t("host.watch");
        toggle.classList.toggle("active", !!payload.watching);
    }

    window.refreshHostLanguage = function () {
        const dock = document.getElementById("host-watcher-dock");
        if (!dock) return;
        const text = document.getElementById("host-watcher-text");
        if (latestWatcherPayload) setWatcherUi(latestWatcherPayload);
        else if (text) text.textContent = t("host.desktop-connected");
        const link = dock.querySelector(".host-watcher-link");
        if (link) link.textContent = t("nav.attempt-log");
    };

    function postToHost(message) {
        if (inAppShell) window.parent.postMessage({ type: "hostCommand", command: message }, "*");
        else if (hasHost) window.chrome.webview.postMessage(message);
    }

    const updateButton = document.getElementById("check-for-updates");
    if (updateButton && (inAppShell || hasHost)) {
        updateButton.hidden = false;
        updateButton.addEventListener("click", () => postToHost({ cmd: "checkForUpdates" }));
    }

    function handleHostMessage(raw) {
        let msg = raw;
        if (typeof raw === "string") {
            try { msg = JSON.parse(raw); } catch { return; }
        }
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case "watcherStatus":
                setWatcherUi(msg);
                window.updateAutologLiveAttempt?.(msg.liveAttempt);
                break;
            case "applyClear":
                if (msg.bossName && Number.isFinite(msg.seconds)) {
                    if (msg.categoryKey === "DLC:shared") {
                        for (const key of ["DLC:lobber", "DLC:charge"]) applyPersonalTimeIfBetter(msg.bossName, msg.seconds, key);
                    } else applyPersonalTimeIfBetter(msg.bossName, msg.seconds, msg.categoryKey);
                }
                break;
            case "overallProgress":
                window.receiveOverallProgress?.(msg, msg.categoryKey);
                break;
            case "statsPayload":
                window.cupheadCategoryBests = {};
                (msg.categoryBests || []).forEach(row => {
                    if (!Number.isFinite(row.seconds)) return;
                    const keys = row.categoryKey === "DLC:shared" ? ["DLC:lobber", "DLC:charge"] : [row.categoryKey];
                    keys.forEach(key => {
                        const category = window.cupheadCategoryBests[key] ||= {};
                        const boss = normalizeName(row.bossName);
                        category[boss] = Math.min(category[boss] ?? Infinity, row.seconds);
                    });
                });
                // Older hosts only send aggregate rows. Keep accepted base-game
                // history visible when an older payload reaches the current page.
                if (!Array.isArray(msg.categoryBests)) {
                    const baseCategory = typeof speedrunCategories !== "undefined"
                        ? speedrunCategories.find(category => category.id === "1-1") : null;
                    const baseBosses = new Set((baseCategory?.islands || []).flatMap(island => island.levels).map(boss => normalizeName(boss.name)));
                    const base = window.cupheadCategoryBests["1-1"] ||= {};
                    (msg.rows || []).forEach(row => {
                        const boss = normalizeName(row.level);
                        if (baseBosses.has(boss) && Number.isFinite(row.bestSeconds)) base[boss] = row.bestSeconds;
                    });
                }
                if (typeof window.renderAutologStats === "function") {
                    window.renderAutologStats(msg.rows || [], msg.recent || [], msg.statsCategoryKey, msg.totalPlaytime);
                }
                if (window.autoTrainingPage && typeof renderAutoTimesPage === "function") renderAutoTimesPage();
                break;
            case "backupDatabase": {
                const backup = {
                    format: "cuphead-training-table-backup",
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    localStorage: pendingBackupStorage || {},
                    database: msg.database || { attempts: [], deaths: [] }
                };
                pendingBackupStorage = null;
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `cuphead-training-backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                const backupStatus = document.getElementById("backup-status");
                if (backupStatus) backupStatus.textContent = t("backup.downloaded");
                break;
            }
            case "backupImportComplete":
                try {
                    const backupStorage = window.pendingCupheadBackupStorage;
                    if (!backupStorage || typeof backupStorage !== "object" || Array.isArray(backupStorage))
                    throw new Error(t("backup.storage-missing"));
                    Object.entries(backupStorage).forEach(([key, value]) => localStorage.setItem(key, String(value)));
                    window.pendingCupheadBackupStorage = null;
                    alert(t("backup.imported"));
                    window.location.reload();
                } catch (error) {
                    alert(tf("backup.import-partial", { error: error.message }));
                }
                break;
            case "backupImportError":
                window.pendingCupheadBackupStorage = null;
                alert(tf("backup.import-error", { error: msg.message || t("backup.invalid") }));
                break;
        }
    }

    window.cupheadHost = {
        isDesktopApp: desktopConnected,
        applyPersonalTimeIfBetter,
        postToHost,
        requestStats(categoryKey) { postToHost({ cmd: "getStats", categoryKey, includeHistory: !!categoryKey, includeRecent: !!categoryKey }); },
        deleteAttempt(id) { postToHost({ cmd: "deleteAttempt", id }); },
        deleteDeath(id) { postToHost({ cmd: "deleteDeath", id }); },
        clearAttempts() { postToHost({ cmd: "clearAllAttempts" }); },
        exportBackup() {
            if (!desktopConnected) return false;
            pendingBackupStorage = Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
                const key = localStorage.key(index);
                return [key, localStorage.getItem(key)];
            }));
            postToHost({ cmd: "exportBackup" });
            return true;
        },
        importBackup(database, storage) {
            if (!desktopConnected) return false;
            window.pendingCupheadBackupStorage = storage;
            postToHost({ cmd: "importBackup", database });
            return true;
        },
        setCompactMode(value) { postToHost({ cmd: "setCompactMode", value: !!value }); },
        setWatching(value) { postToHost({ cmd: "setWatching", value: !!value }); },
        autoBackup() {
            postToHost({
                cmd: "autoBackup",
                localStorage: Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
                    const key = localStorage.key(index);
                    return [key, localStorage.getItem(key)];
                }))
            });
        }
    };

    if (hasHost && !embedded) {
        ensureWatcherDock();
        window.chrome.webview.addEventListener("message", ev => handleHostMessage(ev.data));
        postToHost({ cmd: "getWatcherState" });
        const includeRecent = document.body.dataset.page === "attempt-log";
        postToHost({ cmd: "setStatsMode", includeRecent });
        if (document.body.dataset.page !== "time-table") postToHost({ cmd: "getStats", includeRecent });
        window.cupheadHost.autoBackup();
        window.setInterval(() => window.cupheadHost.autoBackup(), 10 * 60 * 1000);
    }

    if (inAppShell) {
        window.addEventListener("message", event => {
            if (event.source !== window.parent) return;
            if (event.data?.type === "pageActivity") {
                if (!event.data.active) window.releaseAutologPage?.();
                return;
            }
            if (event.data?.type !== "hostMessage") return;
            handleHostMessage(event.data.payload);
        });
        document.addEventListener("click", event => {
            const link = event.target.closest("a[href]");
            if (!link) return;
            const page = {"index.html":"training", "index2.html":"time-table", "autolog.html":"attempt-log", "info.html":"info", "backups.html":"backups"}[link.getAttribute("href")];
            if (!page) return;
            event.preventDefault();
            window.parent.postMessage({type:"switchPage",page}, "*");
        }, true);
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (hasHost) ensureWatcherDock();
    });
})();
