window.autoTrainingPage = isPersonalTimesPage;
function initializeApp() {
  updateReferenceTimes(), renderCategoryControls(), generateAllLevelTimes(), renderActivePage();
}
if (activeCategory = getInitialCategory(), activeSubOption = getInitialSubOption(), saveCategorySelection(), initializeApp(), isPersonalTimesPage) {
  const exportBtn = document.getElementById("export-btn"), importBtn = document.getElementById("import-btn"), importFile = document.getElementById("import-file");
  exportBtn && exportBtn.addEventListener("click", exportPersonalTimes), importBtn && importFile && (importBtn.addEventListener("click", () => importFile.click()), importFile.addEventListener("change", (event) => {
    event.target.files.length > 0 && (importPersonalTimes(event.target.files[0]), event.target.value = "");
  }));
}
