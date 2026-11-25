(function () {
  const key = "cupheadLightMode";
  function refresh() {
    const light = localStorage.getItem(key) === "true";
    document.documentElement.dataset.mode = light ? "light" : "dark";
    const button = document.getElementById("mode-toggle-btn");
    if (button) {
      const label = light ? "ui.dark-mode" : "ui.light-mode";
      button.setAttribute("aria-label", typeof t === "function" ? t(label) : light ? "Switch to dark mode" : "Switch to light mode");
      button.setAttribute("aria-pressed",String(light));
      button.querySelector("img").src = light ? "assets/icons/dark%20mode.png" : "assets/icons/light%20mode.png";
    }
    window.redrawCurveGraph?.();
  }
  window.refreshAppearanceLanguage = refresh;
  refresh();
  window.addEventListener("storage",event=>{if(event.key === key || event.key === null)refresh();});
  document.addEventListener("DOMContentLoaded",()=>{
    refresh();
    document.getElementById("mode-toggle-btn")?.addEventListener("click",()=>{localStorage.setItem(key,String(localStorage.getItem(key)!=="true"));refresh();});
  });
})();
