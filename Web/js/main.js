// Application entry point

function initializeApp()
{
    updateReferenceTimes();
    renderCategoryControls();
    generateAllLevelTimes();
    renderActivePage();
}

activeCategory = getInitialCategory();
activeSubOption = getInitialSubOption();
initializeApp();

if (isPersonalTimesPage) {
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const importFile = document.getElementById("import-file");

    if (exportBtn) {
        exportBtn.addEventListener("click", exportPersonalTimes);
    }

    if (importBtn && importFile) {
        importBtn.addEventListener("click", () => importFile.click());

        importFile.addEventListener("change", event => {
            if (event.target.files.length > 0) {
                importPersonalTimes(event.target.files[0]);
                event.target.value = "";
            }
        });
    }
}
