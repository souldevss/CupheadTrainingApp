(function() {
  const key = "trainingTablePaletteHue", root = document.documentElement;
  let hue, range, patternTimer, patternGeneration = 0, patternUrl = null, patternImage;
  let ownsBackground = true;
  try { ownsBackground = window.parent === window || !window.parent.document.getElementById("pages"); } catch { }
  function updatePattern() {
    // Tint the small tile once instead of filtering the full animated window.
    if (!ownsBackground) return;
    const generation = ++patternGeneration;
    const backgroundRotation = hue - 265 - 20;
    clearTimeout(patternTimer);
    if (backgroundRotation === 0) {
      root.style.removeProperty("--pattern-image");
      if (patternUrl) URL.revokeObjectURL(patternUrl);
      patternUrl = null;
      return;
    }
    patternTimer = setTimeout(async () => {
      patternImage ||= new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(image); image.onerror = reject;
        image.src = "assets/backgrounds/cuphead-pattern.png";
      });
      try {
        const image = await patternImage;
        if (generation !== patternGeneration) return;
        const canvas = document.createElement("canvas"); canvas.width = 360; canvas.height = 463;
        const context = canvas.getContext("2d");
        context.filter = "hue-rotate(" + backgroundRotation + "deg)";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob || generation !== patternGeneration) return;
          const previous = patternUrl; patternUrl = URL.createObjectURL(blob);
          root.style.setProperty("--pattern-image", 'url("' + patternUrl + '")');
          if (previous) URL.revokeObjectURL(previous);
        });
      } catch { patternImage = null; }
    }, 80);
  }
  function readHue(saved) {
    return saved !== null && /^\d{1,3}$/.test(saved) && Number(saved) <= 359 ? Number(saved) : 265;
  }
  function applyPalette(value) {
    hue = value, root.style.setProperty("--site-hue", hue), root.toggleAttribute("data-site-palette", hue !== 265), range && (range.value = hue), updatePattern();
  }
  applyPalette(readHue(localStorage.getItem(key))), window.addEventListener("storage", (event) => {
    (event.key === key || event.key === null) && applyPalette(readHue(localStorage.getItem(key)));
  }), document.addEventListener("DOMContentLoaded", () => {
    const flag = document.getElementById("lang-toggle-btn");
    if (!flag) return;
    const picker = document.createElement("details");
    picker.className = "site-palette", picker.innerHTML = `
            <summary data-i18n-aria-label="ui.palette" data-i18n-title="ui.palette" aria-label="Site palette" title="Site palette"></summary>
            <div class="site-palette-panel">
                <label for="site-palette-hue" data-i18n="ui.palette-hue">Palette hue</label>
                <div class="site-palette-wheel">
                    <input id="site-palette-hue" type="range" min="0" max="359" step="1" value="${hue}">
                    <span class="site-palette-marker" aria-hidden="true"></span>
                </div>
                <button type="button" data-i18n="ui.palette-reset">Reset to purple</button>
            </div>`, flag.before(picker), range = picker.querySelector("input");
    const wheel = picker.querySelector(".site-palette-wheel"), summary = picker.querySelector("summary");
    function savePalette(value) {
      value !== hue && (applyPalette(value), hue === 265 ? localStorage.removeItem(key) : localStorage.setItem(key, String(hue)));
    }
    function pickFromPointer(event) {
      const rect = wheel.getBoundingClientRect(), x = event.clientX - (rect.left + rect.width / 2), y = event.clientY - (rect.top + rect.height / 2);
      if (Math.hypot(x, y) < 8) return;
      const degrees = Math.atan2(x, -y) * 180 / Math.PI;
      savePalette((Math.round(degrees) + 360) % 360);
    }
    wheel.addEventListener("pointerdown", (event) => {
      event.button === 0 && (wheel.setPointerCapture(event.pointerId), range.focus({ preventScroll: !0 }), pickFromPointer(event));
    }), wheel.addEventListener("pointermove", (event) => {
      wheel.hasPointerCapture(event.pointerId) && pickFromPointer(event);
    }), range.addEventListener("input", () => savePalette(range.valueAsNumber)), picker.querySelector("button").addEventListener("click", () => savePalette(265)), picker.addEventListener("keydown", (event) => {
      event.key !== "Escape" || !picker.open || (picker.open = !1, summary.focus());
    }), document.addEventListener("pointerdown", (event) => {
      picker.open && !picker.contains(event.target) && (picker.open = !1);
    }), summary.title = t("ui.palette"), summary.setAttribute("aria-label", summary.title), picker.querySelector("label").textContent = t("ui.palette-hue"), picker.querySelector("button").textContent = t("ui.palette-reset");
  });
})();
