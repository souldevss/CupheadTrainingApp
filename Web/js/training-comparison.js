const TRAINING_COMPARISON_KEY = "cupheadTrainingComparison";
const TRAINING_AVERAGE_KEY = "cupheadTrainingAverageCount";
const trainingComparison = {
  mode: localStorage.getItem(TRAINING_COMPARISON_KEY) === "average" ? "average" : "pb",
  count: Math.min(10000, Math.max(1, Math.trunc(Number(localStorage.getItem(TRAINING_AVERAGE_KEY))) || 10))
};
function normalizeTrainingBoss(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function getTrainingComparisonTimes(category) {
  if (trainingComparison.mode === "pb") return window.cupheadCategoryBests?.[category] || {};
  if (window.cupheadAverageCount !== trainingComparison.count) return {};
  return Object.fromEntries(Object.entries(window.cupheadCategoryAverages?.[category] || {}).map(([boss, row]) => [boss, row.seconds]));
}
function getTrainingComparisonTitle(name) {
  if (trainingComparison.mode === "pb") return t("training.pb");
  const category = getSelectedCategoryKey();
  const row = window.cupheadAverageCount === trainingComparison.count
    ? window.cupheadCategoryAverages?.[category]?.[normalizeTrainingBoss(name)] : null;
  return row?.samples === trainingComparison.count
    ? tf("autolog.average-label", { count: trainingComparison.count })
    : tf("training.average-missing", { required: trainingComparison.count, have: row?.samples || 0 });
}
window.refreshTrainingComparison = function () {
  if (trainingComparison.mode === "average") window.cupheadHost?.requestTrainingComparison(trainingComparison.count);
};
window.receiveTrainingComparison = function (message) {
  if (message.count !== trainingComparison.count) return;
  window.cupheadCategoryAverages = {};
  window.cupheadAverageCount = message.count;
  for (const row of message.rows || []) {
    const category = window.cupheadCategoryAverages[row.categoryKey] ||= {};
    category[normalizeTrainingBoss(row.bossName)] = row;
  }
  renderAutoTimesPage();
};
(function () {
  const input = document.getElementById("training-average-count");
  const choices = document.querySelectorAll('[name="training-comparison"]');
  let pending;
  function syncControls() {
    choices.forEach(radio => radio.checked = radio.value === trainingComparison.mode);
    input.value = trainingComparison.count;
  }
  choices.forEach(radio => radio.addEventListener("change", () => {
    if (!radio.checked) return;
    trainingComparison.mode = radio.value;
    localStorage.setItem(TRAINING_COMPARISON_KEY, radio.value);
    renderAutoTimesPage();
    window.refreshTrainingComparison();
  }));
  function setCount() {
    if (!input.value || !Number.isFinite(input.valueAsNumber)) return;
    trainingComparison.count = Math.min(10000, Math.max(1, Math.trunc(input.valueAsNumber)));
    localStorage.setItem(TRAINING_AVERAGE_KEY, String(trainingComparison.count));
    if (trainingComparison.mode === "average") {
      renderAutoTimesPage();
      window.refreshTrainingComparison();
    }
  }
  input.addEventListener("input", () => { clearTimeout(pending); pending = setTimeout(setCount, 200); });
  input.addEventListener("change", () => { clearTimeout(pending); setCount(); syncControls(); });
  window.addEventListener("storage", event => {
    if (![TRAINING_COMPARISON_KEY, TRAINING_AVERAGE_KEY, null].includes(event.key)) return;
    trainingComparison.mode = localStorage.getItem(TRAINING_COMPARISON_KEY) === "average" ? "average" : "pb";
    trainingComparison.count = Math.min(10000, Math.max(1, Math.trunc(Number(localStorage.getItem(TRAINING_AVERAGE_KEY))) || 10));
    syncControls(); renderAutoTimesPage(); window.refreshTrainingComparison();
  });
  syncControls();
})();
