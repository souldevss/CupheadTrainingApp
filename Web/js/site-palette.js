(function () {
    const key = "trainingTablePaletteHue";
    const defaultHue = 265;
    const root = document.documentElement;
    let hue;
    let range;

    function readHue(saved) {
        return saved !== null && /^\d{1,3}$/.test(saved) && Number(saved) <= 359 ? Number(saved) : defaultHue;
    }

    function applyPalette(value) {
        hue = value;
        root.style.setProperty("--site-hue", hue);
        root.toggleAttribute("data-site-palette", hue !== defaultHue);
        if (range) range.value = hue;
    }

    applyPalette(readHue(localStorage.getItem(key)));
    window.addEventListener("storage", event => {
        if (event.key === key || event.key === null) applyPalette(readHue(localStorage.getItem(key)));
    });

    document.addEventListener("DOMContentLoaded", () => {
        const flag = document.getElementById("lang-toggle-btn");
        if (!flag) return;
        const picker = document.createElement("details");
        picker.className = "site-palette";
        picker.innerHTML = `
            <summary data-i18n-aria-label="ui.palette" data-i18n-title="ui.palette" aria-label="Site palette" title="Site palette"></summary>
            <div class="site-palette-panel">
                <label for="site-palette-hue" data-i18n="ui.palette-hue">Palette hue</label>
                <div class="site-palette-wheel">
                    <input id="site-palette-hue" type="range" min="0" max="359" step="1" value="${hue}">
                    <span class="site-palette-marker" aria-hidden="true"></span>
                </div>
                <button type="button" data-i18n="ui.palette-reset">Reset to purple</button>
            </div>`;
        flag.before(picker);
        range = picker.querySelector("input");
        const wheel = picker.querySelector(".site-palette-wheel");
        const summary = picker.querySelector("summary");

        function savePalette(value) {
            if (value === hue) return;
            applyPalette(value);
            if (hue === defaultHue) localStorage.removeItem(key);
            else localStorage.setItem(key, String(hue));
        }

        function pickFromPointer(event) {
            const rect = wheel.getBoundingClientRect();
            const x = event.clientX - (rect.left + rect.width / 2);
            const y = event.clientY - (rect.top + rect.height / 2);
            if (Math.hypot(x, y) < 8) return;
            const degrees = Math.atan2(x, -y) * 180 / Math.PI;
            savePalette((Math.round(degrees) + 360) % 360);
        }

        wheel.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            wheel.setPointerCapture(event.pointerId);
            range.focus({ preventScroll: true });
            pickFromPointer(event);
        });
        wheel.addEventListener("pointermove", event => {
            if (wheel.hasPointerCapture(event.pointerId)) pickFromPointer(event);
        });
        range.addEventListener("input", () => savePalette(range.valueAsNumber));
        picker.querySelector("button").addEventListener("click", () => savePalette(defaultHue));
        picker.addEventListener("keydown", event => {
            if (event.key !== "Escape" || !picker.open) return;
            picker.open = false;
            summary.focus();
        });
        document.addEventListener("pointerdown", event => {
            if (picker.open && !picker.contains(event.target)) picker.open = false;
        });
        summary.title = t("ui.palette");
        summary.setAttribute("aria-label", summary.title);
        picker.querySelector("label").textContent = t("ui.palette-hue");
        picker.querySelector("button").textContent = t("ui.palette-reset");
    });
})();
