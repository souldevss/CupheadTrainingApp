// DOM element references and shared application state

const table = document.getElementById("table");
const totals = document.getElementById("totals");
const rankChart = document.getElementById("rank-chart");
const rankChartPie = document.getElementById("rank-chart-pie");
const categoryTabs = document.getElementById("category-tabs");

const isPersonalTimesPage = document.body.dataset.page === "personal-times";
const categories = typeof speedrunCategories === "undefined"
    ? [{ id: "1-1", label: "1.1", title: "Game Version 1.1", description: "", islands }]
    : speedrunCategories;

const APP_SOUND_URLS = {
    selection: "https://myekul.com/shared-assets/cuphead/sfx/category_select.wav",
    loop: "https://myekul.com/shared-assets/cuphead/sfx/win_time_loop.wav",
    loopEnd: "https://myekul.com/shared-assets/cuphead/sfx/win_time_loop_end.wav"
};

let activeCategory = null;
let activeSubOption = null;
