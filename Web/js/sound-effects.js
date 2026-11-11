(function() {
  const selectionUrl = "assets/sfx/category_select.wav";
  let pool = null, nextSound = 0, lastClick = -1 / 0;
  function playClick(volume = 0.2) {
    try {
      if (window.parent !== window && window.parent.cupheadUiSounds) {
        window.parent.cupheadUiSounds.playClick(volume);
        return;
      }
    } catch {
    }
    const now = performance.now();
    if (now - lastClick < 60) return;
    lastClick = now, pool || (pool = Array.from({ length: 4 }, () => {
      const sound2 = new Audio(selectionUrl);
      return sound2.preload = "auto", sound2;
    }));
    const sound = pool[nextSound++ % pool.length];
    sound.currentTime = 0, sound.volume = volume, sound.play().catch(() => {
    });
  }
  window.cupheadUiSounds = { playClick }, window.playSound = function(url, volume = 0.2) {
    if (url.endsWith("category_select.wav")) return playClick(volume);
    const sound = new Audio(url);
    sound.volume = volume, sound.play().catch(() => {
    });
  }, document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a[href], [role='button'], input[type='checkbox'], input[type='radio'], input[type='range']");
    !control || control.matches(":disabled, [aria-disabled='true']") || playClick();
  }, !0), document.addEventListener("input", (event) => {
    event.target.matches("input[type='range']") && playClick(0.12);
  }, !0), document.addEventListener("change", (event) => {
    event.target.matches("select") && playClick();
  }, !0);
})();
