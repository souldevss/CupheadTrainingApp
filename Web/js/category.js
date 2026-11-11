function getInitialCategory() {
  let id = localStorage.getItem("cupheadSpeedrunCategory") || localStorage.getItem("cupheadLogCategory") || "1-1";
  id = id.replace(/^version-/, "");
  const dlc = /^DLC[:-](lobber|charge)$/.exec(id);
  if (dlc) {
    localStorage.setItem("cupheadDlcSubOption", dlc[1]);
    id = "DLC";
  }
  return categories.find(category => category.id === id) || categories[0];
}
function getInitialSubOption(category = activeCategory, requested = null) {
  if (!category.subOptions) return null;
  const id = requested || localStorage.getItem("cupheadDlcSubOption") || localStorage.getItem("cupheadLogDlcSubOption");
  return category.subOptions.find(option => option.id === id)?.id || category.subOptions[0].id;
}
function getSelectedCategoryKey() {
  return activeSubOption ? activeCategory.id + ":" + activeSubOption : activeCategory.id;
}
function saveCategorySelection() {
  localStorage.setItem("cupheadSpeedrunCategory", activeCategory.id);
  localStorage.setItem("cupheadLogCategory", getSelectedCategoryKey());
  if (activeSubOption) {
    localStorage.setItem("cupheadDlcSubOption", activeSubOption);
    localStorage.setItem("cupheadLogDlcSubOption", activeSubOption);
  }
}
function setActiveCategorySelection(categoryId, subOption = null) {
  const category = categories.find(category => category.id === categoryId);
  if (!category) return false;
  activeCategory = category;
  activeSubOption = getInitialSubOption(category, subOption);
  saveCategorySelection();
  renderCategoryControls();
  renderActivePage();
  return true;
}
function syncCategorySelection() {
  if (!activeCategory) return;
  const category = getInitialCategory();
  const subOption = getInitialSubOption(category);
  if (category.id === activeCategory.id && subOption === activeSubOption) return;
  if (typeof selectLogCategory === "function") selectLogCategory(category.id, subOption);
  else setActiveCategorySelection(category.id, subOption);
}
let categoryPageActive = !window.frameElement?.hidden;
window.addEventListener("storage", event => {
  if (categoryPageActive && [null, "cupheadSpeedrunCategory", "cupheadDlcSubOption"].includes(event.key)) syncCategorySelection();
});
window.addEventListener("message", event => {
  if (event.source !== window.parent || event.data?.type !== "pageActivity") return;
  categoryPageActive = event.data.active;
  if (categoryPageActive) syncCategorySelection();
});
function renderCategoryControls(options = {}) {
  if (!categoryTabs) return;
  const displayedCategories = options.categories || categories, selectCategory = options.onSelect || setActiveCategorySelection;
  categoryTabs.innerHTML = displayedCategories.map((category) => category.subOptions && category.id === activeCategory.id ? `
                <div class="category-tab-group">
                    <button
                        class="category-tab is-active"
                        type="button"
                        data-category-id="${category.id}"
                    >
                        ${category.label}
                    </button>
                    <div class="category-sub-options">
                        ${category.subOptions.map((sub) => `
                            <button
                                class="category-sub-option ${sub.id === activeSubOption ? "is-active" : ""}"
                                type="button"
                                data-sub-option-id="${sub.id}"
                                title="${sub.label}"
                            >
                                <img src="${sub.icon}" class="category-icon" alt="${sub.label}">
                            </button>
                        `).join("")}
                    </div>
                </div>
            ` : `
            <button
                class="category-tab ${category.id === activeCategory.id ? "is-active" : ""}"
                type="button"
                data-category-id="${category.id}"
            >
                ${category.label}
            </button>
        `).join(""), categoryTabs.querySelectorAll(".category-tab").forEach((button) => {
    button.addEventListener("click", () => {
      button.dataset.categoryId !== activeCategory.id && selectCategory(button.dataset.categoryId);
    });
  }), categoryTabs.querySelectorAll(".category-sub-option").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSubOption = button.dataset.subOptionId;
      !nextSubOption || nextSubOption === activeSubOption || selectCategory(activeCategory.id, nextSubOption);
    });
  });
}
