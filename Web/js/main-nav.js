// Minimal nav script for pages that don't need the full app (e.g. info page)

const APP_SOUND_URLS_NAV = {
    selection: "https://myekul.com/shared-assets/cuphead/sfx/category_select.wav"
};

function playNavSound(url, volume = 0.2) {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {});
}

document.querySelectorAll("a[data-page-link]").forEach(link => {
    link.addEventListener("click", event => {
        if (link.classList.contains("active")) return;
        event.preventDefault();
        document.body.classList.add("is-transitioning");
        playNavSound(APP_SOUND_URLS_NAV.selection, 0.2);
        window.setTimeout(() => {
            window.location.href = link.getAttribute("href");
        }, 200);
    });
});

document.body.classList.add("is-ready");
