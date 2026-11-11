function getPersonalTimesStorageKey() {
  return activeCategory.id === "DLC" && activeSubOption ? `cupheadPersonalTimes:${activeCategory.id}:${activeSubOption}` : `cupheadPersonalTimes:${activeCategory.id}`;
}
function readStorageJson(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStorageJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getStoredPersonalTimes() {
  try {
    const storageKey = getPersonalTimesStorageKey(), categoryTimes = readStorageJson(storageKey, {}), oldTimes = activeCategory.id === "1-1" ? readStorageJson("cupheadPersonalTimes", {}) : {}, migrateLegacyTimes = (targetKey, legacyKeys) => {
      const mergedTimes = {};
      return legacyKeys.forEach((legacyKey) => {
        const legacyTimes = JSON.parse(localStorage.getItem(legacyKey)) || {};
        Object.assign(mergedTimes, legacyTimes);
      }), Object.keys(mergedTimes).length > 0 && (writeStorageJson(targetKey, mergedTimes), legacyKeys.forEach((legacyKey) => localStorage.removeItem(legacyKey))), mergedTimes;
    };
    let migratedTimes = {};
    return activeCategory.id === "1-1" && (migratedTimes = migrateLegacyTimes("cupheadPersonalTimes:1-1", ["cupheadPersonalTimes:version-1-1"])), activeCategory.id === "DLC" && activeSubOption === "lobber" && (migratedTimes = {
      ...migrateLegacyTimes("cupheadPersonalTimes:DLC:lobber", [
        "cupheadPersonalTimes:version-DLC",
        "cupheadPersonalTimes:version-DLC-lobber",
        "cupheadPersonalTimes:DLC-lobber"
      ]),
      ...migratedTimes
    }), activeCategory.id === "DLC" && activeSubOption === "charge" && (migratedTimes = {
      ...migrateLegacyTimes("cupheadPersonalTimes:DLC:charge", [
        "cupheadPersonalTimes:version-DLC-charge",
        "cupheadPersonalTimes:DLC-charge"
      ]),
      ...migratedTimes
    }), { ...oldTimes, ...categoryTimes, ...migratedTimes };
  } catch {
    return {};
  }
}
function exportPersonalTimes() {
  const exportData = {
    version: "1.0",
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    game: "cuphead",
    categories: {}
  };
  categories.forEach((category) => {
    if (category.subOptions)
      exportData.categories[category.id] = {
        label: category.label,
        subOptions: {}
      }, category.subOptions.forEach((subOption) => {
        const storageKey = `cupheadPersonalTimes:${category.id}:${subOption.id}`, times = readStorageJson(storageKey, {});
        exportData.categories[category.id].subOptions[subOption.id] = {
          label: subOption.label,
          times
        };
      });
    else {
      const storageKey = `cupheadPersonalTimes:${category.id}`, times = JSON.parse(localStorage.getItem(storageKey)) || {};
      exportData.categories[category.id] = {
        label: category.label,
        times
      };
    }
  });
  const jsonString = JSON.stringify(exportData, null, 2), blob = new Blob([jsonString], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url, a.download = `cuphead-times-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`, document.body.appendChild(a), a.click(), document.body.removeChild(a), URL.revokeObjectURL(url);
}
function importPersonalTimes(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      if (!importData.categories) {
        alert(t("times-import.invalid"));
        return;
      }
      let importCount = 0;
      Object.keys(importData.categories).forEach((categoryId) => {
        const categoryData = importData.categories[categoryId];
        if (categoryData.subOptions)
          Object.keys(categoryData.subOptions).forEach((subOptionId) => {
            const subOptionData = categoryData.subOptions[subOptionId];
            if (subOptionData.times && Object.keys(subOptionData.times).length > 0) {
              const storageKey = `cupheadPersonalTimes:${categoryId}:${subOptionId}`;
              writeStorageJson(storageKey, subOptionData.times), importCount++;
            }
          });
        else if (categoryData.times && Object.keys(categoryData.times).length > 0) {
          const storageKey = `cupheadPersonalTimes:${categoryId}`;
          writeStorageJson(storageKey, categoryData.times), importCount++;
        }
      }), importCount > 0 ? (alert(tf("times-import.success", { count: importCount })), renderActivePage()) : alert(t("times-import.empty"));
    } catch (error) {
      alert(t("times-import.error")), console.error("Import error:", error);
    }
  }, reader.readAsText(file);
}
