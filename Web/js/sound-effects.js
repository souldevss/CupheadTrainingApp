// Shared by all pages. The desktop shell owns playback so switching tabs
// doesn't cut the click sound off when an iframe is hidden.
(function () {
    const selectionUrl = "assets/sfx/category_select.wav";
    let pool = null;
    let nextSound = 0;
    let lastClick = -Infinity;

    function playClick(volume = 0.2) {
        try {
            if (window.parent !== window && window.parent.cupheadUiSounds) {
                window.parent.cupheadUiSounds.playClick(volume);
                return;
            }
        } catch { /* Standalone page or cross-origin parent. */ }
        const now = performance.now();
        if (now - lastClick < 60) return;
        lastClick = now;
        if (!pool) pool = Array.from({ length: 4 }, () => {
            const sound = new Audio(selectionUrl);
            sound.preload = "auto";
            return sound;
        });
        const sound = pool[nextSound++ % pool.length];
        sound.currentTime = 0;
        sound.volume = volume;
        sound.play().catch(() => {});
    }

    window.cupheadUiSounds = { playClick };
    window.playSound = function (url, volume = 0.2) {
        if (url.endsWith("category_select.wav")) return playClick(volume);
        const sound = new Audio(url);
        sound.volume = volume;
        sound.play().catch(() => {});
    };

    document.addEventListener("click", event => {
        const control = event.target.closest("button, a[href], [role='button'], input[type='checkbox'], input[type='radio'], input[type='range']");
        if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
        playClick();
    }, true);
    document.addEventListener("input", event => {
        if (event.target.matches("input[type='range']")) playClick(0.12);
    }, true);
    document.addEventListener("change", event => {
        if (event.target.matches("select")) playClick();
    }, true);
})();
