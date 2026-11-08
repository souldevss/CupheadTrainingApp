(function () {
    const storageKey = "cupheadCompactMode";
    const button = document.getElementById("compact-mode-toggle");
    let compact = localStorage.getItem(storageKey) !== "false";

    function applyCompactMode(notifyHost = false) {
        document.body.classList.toggle("compact-mode", compact);
        if (button) {
            button.setAttribute("aria-pressed", String(compact));
            button.dataset.i18n = compact ? "ui.compact-on" : "ui.compact";
            button.textContent = t(button.dataset.i18n);
        }
        if (notifyHost && window.parent === window && window.cupheadHost?.isDesktopApp) {
            window.cupheadHost.setCompactMode(compact);
        }
    }

    if (button) {
        button.addEventListener("click", () => {
            compact = localStorage.getItem(storageKey) === "false";
            localStorage.setItem(storageKey, String(compact));
            applyCompactMode(true);
        });
    }

    window.addEventListener("storage", event => {
        if (event.key !== storageKey && event.key !== null) return;
        compact = localStorage.getItem(storageKey) !== "false";
        applyCompactMode();
    });

    applyCompactMode();
})();
