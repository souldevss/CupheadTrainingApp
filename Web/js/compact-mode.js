(function () {
    const storageKey = "cupheadCompactMode";
    const button = document.getElementById("compact-mode-toggle");
    let compact = localStorage.getItem(storageKey) === "true";

    function applyCompactMode() {
        document.body.classList.toggle("compact-mode", compact);
        if (button) {
            button.setAttribute("aria-pressed", String(compact));
            button.textContent = compact ? t("ui.compact-on") : t("ui.compact");
        }
        if (window.cupheadHost?.isDesktopApp) {
            window.cupheadHost.setCompactMode(compact);
        }
    }

    if (button) {
        button.addEventListener("click", () => {
            compact = !compact;
            localStorage.setItem(storageKey, String(compact));
            applyCompactMode();
        });
    }

    applyCompactMode();
})();
