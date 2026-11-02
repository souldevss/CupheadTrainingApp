// Personal times localStorage, export, and import

/**
 * Generates the localStorage key for personal times based on current category and sub-option
 * @returns {string} The storage key for the current context
 */
function getPersonalTimesStorageKey()
{
    if (activeCategory.id === "DLC" && activeSubOption) {
        return `cupheadPersonalTimes:${activeCategory.id}:${activeSubOption}`;
    }
    return `cupheadPersonalTimes:${activeCategory.id}`;
}

/**
 * Retrieves stored personal times from localStorage with migration support
 * Handles migration from old storage keys to new structure
 * @returns {Object} Object mapping input IDs to time values
 */
function readStorageJson(key, fallback = {})
{
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function writeStorageJson(key, value)
{
    localStorage.setItem(key, JSON.stringify(value));
}

function getStoredPersonalTimes()
{
    try {
        const storageKey = getPersonalTimesStorageKey();
        const categoryTimes = readStorageJson(storageKey, {});
        const oldTimes = activeCategory.id === "1-1"
            ? readStorageJson("cupheadPersonalTimes", {})
            : {};

        const migrateLegacyTimes = (targetKey, legacyKeys) => {
            const mergedTimes = {};

            legacyKeys.forEach(legacyKey => {
                const legacyTimes = JSON.parse(localStorage.getItem(legacyKey)) || {};
                Object.assign(mergedTimes, legacyTimes);
            });

            if (Object.keys(mergedTimes).length > 0) {
                writeStorageJson(targetKey, mergedTimes);
                legacyKeys.forEach(legacyKey => localStorage.removeItem(legacyKey));
            }

            return mergedTimes;
        };

        let migratedTimes = {};

        if (activeCategory.id === "1-1") {
            migratedTimes = migrateLegacyTimes("cupheadPersonalTimes:1-1", ["cupheadPersonalTimes:version-1-1"]);
        }

        if (activeCategory.id === "DLC" && activeSubOption === "lobber") {
            migratedTimes = {
                ...migrateLegacyTimes("cupheadPersonalTimes:DLC:lobber", [
                    "cupheadPersonalTimes:version-DLC",
                    "cupheadPersonalTimes:version-DLC-lobber",
                    "cupheadPersonalTimes:DLC-lobber"
                ]),
                ...migratedTimes
            };
        }

        if (activeCategory.id === "DLC" && activeSubOption === "charge") {
            migratedTimes = {
                ...migrateLegacyTimes("cupheadPersonalTimes:DLC:charge", [
                    "cupheadPersonalTimes:version-DLC-charge",
                    "cupheadPersonalTimes:DLC-charge"
                ]),
                ...migratedTimes
            };
        }

        return { ...oldTimes, ...categoryTimes, ...migratedTimes };
    } catch {
        return {};
    }
}

/**
 * Exports all personal times across all categories to a downloadable JSON file
 */
function exportPersonalTimes()
{
    const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        game: "cuphead",
        categories: {}
    };

    categories.forEach(category => {
        if (category.subOptions) {
            exportData.categories[category.id] = {
                label: category.label,
                subOptions: {}
            };
            category.subOptions.forEach(subOption => {
                const storageKey = `cupheadPersonalTimes:${category.id}:${subOption.id}`;
                const times = readStorageJson(storageKey, {});
                exportData.categories[category.id].subOptions[subOption.id] = {
                    label: subOption.label,
                    times
                };
            });
        } else {
            const storageKey = `cupheadPersonalTimes:${category.id}`;
            const times = JSON.parse(localStorage.getItem(storageKey)) || {};
            exportData.categories[category.id] = {
                label: category.label,
                times
            };
        }
    });

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuphead-times-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Imports personal times from an uploaded JSON file
 * @param {File} file - The JSON file to import
 */
function importPersonalTimes(file)
{
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importData = JSON.parse(e.target.result);

            if (!importData.categories) {
                alert(t("times-import.invalid"));
                return;
            }

            let importCount = 0;

            Object.keys(importData.categories).forEach(categoryId => {
                const categoryData = importData.categories[categoryId];

                if (categoryData.subOptions) {
                    Object.keys(categoryData.subOptions).forEach(subOptionId => {
                        const subOptionData = categoryData.subOptions[subOptionId];
                        if (subOptionData.times && Object.keys(subOptionData.times).length > 0) {
                            const storageKey = `cupheadPersonalTimes:${categoryId}:${subOptionId}`;
                            writeStorageJson(storageKey, subOptionData.times);
                            importCount++;
                        }
                    });
                } else if (categoryData.times) {
                    if (Object.keys(categoryData.times).length > 0) {
                        const storageKey = `cupheadPersonalTimes:${categoryId}`;
                        writeStorageJson(storageKey, categoryData.times);
                        importCount++;
                    }
                }
            });

            if (importCount > 0) {
                alert(tf("times-import.success", { count: importCount }));
                renderActivePage();
            } else {
                alert(t("times-import.empty"));
            }
        } catch (error) {
            alert(t("times-import.error"));
            console.error("Import error:", error);
        }
    };
    reader.readAsText(file);
}
