(function() {
  const hasHost = !!(window.chrome && window.chrome.webview), embedded = window.parent !== window;
  let inAppShell = !1, latestWatcherPayload = null;
  if (embedded)
    try {
      inAppShell = !!window.parent.document.getElementById("pages");
    } catch {
    }
  inAppShell && document.documentElement.classList.add("app-shell-page");
  const desktopConnected = hasHost || inAppShell;
  let pendingBackupStorage = null;
  function normalizeName(name) {
    return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function findInputIdForCategory(levelName, categoryKey) {
    if (typeof speedrunCategories > "u") return null;
    const [categoryId, subOption] = categoryKey.split(":");
    let cat = speedrunCategories.find((c) => c.id === categoryId);
    if (subOption && (cat = cat?.subOptions?.find((option) => option.id === subOption)), !cat || !cat.islands) return null;
    const target = normalizeName(levelName);
    let counter = 0;
    for (const island of cat.islands)
      for (const boss of island.levels) {
        if (normalizeName(boss.name) === target)
          return `personal-time-${counter}`;
        counter++;
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
    if (!Number.isFinite(seconds) || seconds <= 0 || typeof formatTime != "function" || typeof parseTime != "function") return !1;
    const inputId = findInputIdForCategory(levelName, categoryKey);
    if (!inputId) return !1;
    const storageKey = `cupheadPersonalTimes:${categoryKey}`, stored = readStorage(storageKey), nextValue = formatTime(seconds), currentSeconds = parseTime(stored[inputId] || "");
    if (currentSeconds !== null && currentSeconds <= seconds) return !1;
    stored[inputId] = nextValue, localStorage.setItem(storageKey, JSON.stringify(stored));
    const input = document.getElementById(inputId), displayedCategory = typeof activeCategory < "u" ? activeCategory.id + (activeCategory.id === "DLC" ? `:${activeSubOption}` : "") : null;
    return input && displayedCategory === categoryKey && (input.value = nextValue, input.dispatchEvent(new Event("input", { bubbles: !0 }))), !0;
  }
  function ensureWatcherDock() {
    if (document.getElementById("host-watcher-dock")) return;
    const dock = document.createElement("div");
    dock.id = "host-watcher-dock", dock.className = "host-watcher-dock", dock.innerHTML = `
            <span id="host-watcher-dot" class="host-watcher-dot"></span>
            <span id="host-watcher-text" class="host-watcher-text">${t("host.desktop-connected")}</span>
            <button id="host-watcher-toggle" type="button" class="host-watcher-btn">${t("host.watch")}</button>
            <a class="host-watcher-link" href="autolog.html">${t("nav.attempt-log")}</a>
        `, document.body.appendChild(dock), document.body.classList.add("has-watcher-dock"), document.getElementById("host-watcher-toggle").addEventListener("click", () => {
      postToHost({ cmd: "toggleWatching" });
    });
  }
  function setWatcherUi(payload) {
    latestWatcherPayload = payload, ensureWatcherDock();
    const dot = document.getElementById("host-watcher-dot"), text = document.getElementById("host-watcher-text"), toggle = document.getElementById("host-watcher-toggle");
    !dot || !text || !toggle || (dot.classList.remove("active", "warn"), payload.watching && dot.classList.add("active"), payload.warning && dot.classList.add("warn"), text.textContent = translateWatcherStatus(payload.status || "Ready"), toggle.textContent = payload.watching ? t("host.stop-watching") : t("host.watch"), toggle.classList.toggle("active", !!payload.watching));
  }
  window.refreshHostLanguage = function() {
    const dock = document.getElementById("host-watcher-dock");
    if (!dock) return;
    const text = document.getElementById("host-watcher-text");
    latestWatcherPayload ? setWatcherUi(latestWatcherPayload) : text && (text.textContent = t("host.desktop-connected"));
    const link = dock.querySelector(".host-watcher-link");
    link && (link.textContent = t("nav.attempt-log"));
  };
  function postToHost(message) {
    inAppShell ? window.parent.postMessage({ type: "hostCommand", command: message }, "*") : hasHost && window.chrome.webview.postMessage(message);
  }
  const updateButton = document.getElementById("check-for-updates");
  updateButton && (inAppShell || hasHost) && (updateButton.hidden = !1, updateButton.addEventListener("click", () => postToHost({ cmd: "checkForUpdates" })));
  function handleHostMessage(raw) {
    let msg = raw;
    if (typeof raw == "string")
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
    if (!(!msg || !msg.type))
      switch (msg.type) {
        case "watcherStatus":
          setWatcherUi(msg), window.updateAutologLiveAttempt?.(msg.liveAttempt);
          break;
        case "applyClear":
          if (msg.bossName && Number.isFinite(msg.seconds))
            if (msg.categoryKey === "DLC:shared")
              for (const key of ["DLC:lobber", "DLC:charge"]) applyPersonalTimeIfBetter(msg.bossName, msg.seconds, key);
            else applyPersonalTimeIfBetter(msg.bossName, msg.seconds, msg.categoryKey);
          break;
        case "overallProgress":
          window.receiveOverallProgress?.(msg, msg.categoryKey);
          break;
        case "statsPayload":
          if (window.cupheadCategoryBests = {}, (msg.categoryBests || []).forEach((row) => {
            if (!Number.isFinite(row.seconds)) return;
            (row.categoryKey === "DLC:shared" ? ["DLC:lobber", "DLC:charge"] : [row.categoryKey]).forEach((key) => {
              const category = window.cupheadCategoryBests[key] ||= {}, boss = normalizeName(row.bossName);
              category[boss] = Math.min(category[boss] ?? 1 / 0, row.seconds);
            });
          }), !Array.isArray(msg.categoryBests)) {
            const baseCategory = typeof speedrunCategories < "u" ? speedrunCategories.find((category) => category.id === "1-1") : null, baseBosses = new Set((baseCategory?.islands || []).flatMap((island) => island.levels).map((boss) => normalizeName(boss.name))), base = window.cupheadCategoryBests["1-1"] ||= {};
            (msg.rows || []).forEach((row) => {
              const boss = normalizeName(row.level);
              baseBosses.has(boss) && Number.isFinite(row.bestSeconds) && (base[boss] = row.bestSeconds);
            });
          }
          typeof window.renderAutologStats == "function" && window.renderAutologStats(msg.rows || [], msg.recent || [], msg.statsCategoryKey, msg.totalPlaytime), window.autoTrainingPage && typeof renderAutoTimesPage == "function" && renderAutoTimesPage();
          break;
        case "backupDatabase": {
          const backup = {
            format: "cuphead-training-table-backup",
            version: 1,
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            localStorage: pendingBackupStorage || {},
            database: msg.database || { attempts: [], deaths: [] }
          };
          pendingBackupStorage = null;
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = url, link.download = `cuphead-training-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, document.body.appendChild(link), link.click(), link.remove(), URL.revokeObjectURL(url);
          const backupStatus = document.getElementById("backup-status");
          backupStatus && (backupStatus.textContent = t("backup.downloaded"));
          break;
        }
        case "backupImportComplete":
          try {
            const backupStorage = window.pendingCupheadBackupStorage;
            if (!backupStorage || typeof backupStorage != "object" || Array.isArray(backupStorage))
              throw new Error(t("backup.storage-missing"));
            Object.entries(backupStorage).forEach(([key, value]) => localStorage.setItem(key, String(value))), window.pendingCupheadBackupStorage = null, alert(t("backup.imported")), window.location.reload();
          } catch (error) {
            alert(tf("backup.import-partial", { error: error.message }));
          }
          break;
        case "backupImportError":
          window.pendingCupheadBackupStorage = null, alert(tf("backup.import-error", { error: msg.message || t("backup.invalid") }));
          break;
      }
  }
  if (window.cupheadHost = {
    isDesktopApp: desktopConnected,
    applyPersonalTimeIfBetter,
    postToHost,
    requestStats(categoryKey) {
      postToHost({ cmd: "getStats", categoryKey, includeHistory: !!categoryKey, includeRecent: !!categoryKey });
    },
    deleteAttempt(id) {
      postToHost({ cmd: "deleteAttempt", id });
    },
    deleteDeath(id) {
      postToHost({ cmd: "deleteDeath", id });
    },
    clearAttempts() {
      postToHost({ cmd: "clearAllAttempts" });
    },
    exportBackup() {
      return desktopConnected ? (pendingBackupStorage = Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return [key, localStorage.getItem(key)];
      })), postToHost({ cmd: "exportBackup" }), !0) : !1;
    },
    importBackup(database, storage) {
      return desktopConnected ? (window.pendingCupheadBackupStorage = storage, postToHost({ cmd: "importBackup", database }), !0) : !1;
    },
    setWatching(value) {
      postToHost({ cmd: "setWatching", value: !!value });
    },
    autoBackup() {
      postToHost({
        cmd: "autoBackup",
        localStorage: Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
          const key = localStorage.key(index);
          return [key, localStorage.getItem(key)];
        }))
      });
    }
  }, hasHost && !embedded) {
    ensureWatcherDock(), window.chrome.webview.addEventListener("message", (ev) => handleHostMessage(ev.data)), postToHost({ cmd: "getWatcherState" });
    const includeRecent = document.body.dataset.page === "attempt-log";
    postToHost({ cmd: "setStatsMode", includeRecent }), document.body.dataset.page !== "time-table" && postToHost({ cmd: "getStats", includeRecent }), window.cupheadHost.autoBackup(), window.setInterval(() => window.cupheadHost.autoBackup(), 600 * 1e3);
  }
  inAppShell && (window.addEventListener("message", (event) => {
    if (event.source === window.parent) {
      if (event.data?.type === "pageActivity") {
        event.data.active || window.releaseAutologPage?.();
        return;
      }
      event.data?.type === "hostMessage" && handleHostMessage(event.data.payload);
    }
  }), document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const page = { "index.html": "training", "index2.html": "time-table", "autolog.html": "attempt-log", "info.html": "info", "backups.html": "backups" }[link.getAttribute("href")];
    page && (event.preventDefault(), window.parent.postMessage({ type: "switchPage", page }, "*"));
  }, !0)), document.addEventListener("DOMContentLoaded", () => {
    desktopConnected && ensureWatcherDock(), inAppShell && window.parent.postMessage({ type: "pageReady" }, location.origin);
  });
})();
