const table = document.getElementById("table"), totals = document.getElementById("totals"), rankChart = document.getElementById("rank-chart"), rankChartPie = document.getElementById("rank-chart-pie"), categoryTabs = document.getElementById("category-tabs"), isPersonalTimesPage = document.body.dataset.page === "personal-times", categories = typeof speedrunCategories > "u" ? [{ id: "1-1", label: "1.1", title: "Game Version 1.1", description: "", islands }] : speedrunCategories, APP_SOUND_URLS = {
  selection: "https://myekul.com/shared-assets/cuphead/sfx/category_select.wav",
  loop: "https://myekul.com/shared-assets/cuphead/sfx/win_time_loop.wav",
  loopEnd: "https://myekul.com/shared-assets/cuphead/sfx/win_time_loop_end.wav"
};
let activeCategory = null, activeSubOption = null;
