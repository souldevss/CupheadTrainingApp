// Category tabs and localStorage migration

/**
 * Retrieves the initially selected category from localStorage
 * Handles migration from old category IDs to new structure
 * @returns {Object} The active category object
 */
function setActiveCategorySelection(nextCategoryId, nextSubOptionId = null)
{
    const nextCategory = categories.find(category => category.id === nextCategoryId);
    if (!nextCategory) return false;

    activeCategory = nextCategory;
    activeSubOption = nextCategory.id === "DLC"
        ? (nextSubOptionId || localStorage.getItem("cupheadDlcSubOption") || "lobber")
        : null;

    localStorage.setItem(
        "cupheadSpeedrunCategory",
        activeCategory.id
    );

    if (activeCategory.id === "DLC") {
        localStorage.setItem("cupheadDlcSubOption", activeSubOption || "lobber");
    }

    renderCategoryControls();
    renderActivePage();
    return true;
}

function getInitialCategory()
{
    const storedCategoryId = localStorage.getItem(
        "cupheadSpeedrunCategory"
    );

    if (storedCategoryId === "version-1-1") {
        localStorage.setItem("cupheadSpeedrunCategory", "1-1");
        return categories.find(category => category.id === "1-1") || categories[0];
    }

    if (storedCategoryId === "version-DLC") {
        localStorage.setItem("cupheadSpeedrunCategory", "DLC");
        return categories.find(category => category.id === "DLC") || categories[0];
    }

    if (storedCategoryId === "version-DLC-lobber" || storedCategoryId === "version-DLC-charge") {
        localStorage.setItem("cupheadSpeedrunCategory", "DLC");
        const subOptionId = storedCategoryId === "version-DLC-lobber" ? "lobber" : "charge";
        localStorage.setItem("cupheadDlcSubOption", subOptionId);
        return categories.find(category => category.id === "DLC") || categories[0];
    }

    if (storedCategoryId === "DLC-lobber" || storedCategoryId === "DLC-charge") {
        localStorage.setItem("cupheadSpeedrunCategory", "DLC");
        const subOptionId = storedCategoryId === "DLC-lobber" ? "lobber" : "charge";
        localStorage.setItem("cupheadDlcSubOption", subOptionId);
        return categories.find(category => category.id === "DLC") || categories[0];
    }

    return categories.find(category => category.id === storedCategoryId) || categories[0];
}

/**
 * Retrieves the initially selected DLC sub-option from localStorage
 * @returns {string|null} The sub-option ID (e.g., 'lobber', 'charge') or null if not DLC
 */
function getInitialSubOption()
{
    if (activeCategory.id !== "DLC") return null;
    const storedSubOption = localStorage.getItem("cupheadDlcSubOption");
    return storedSubOption || "lobber";
}

/**
 * Renders category selection tabs
 * For DLC categories with sub-options, displays icon buttons for weapon selection
 */
function renderCategoryControls(options = {})
{
    if (!categoryTabs) return;
    const displayedCategories = options.categories || categories;
    const selectCategory = options.onSelect || setActiveCategorySelection;

    categoryTabs.innerHTML = displayedCategories.map(category => {
        if (category.subOptions && category.id === activeCategory.id) {
            return `
                <div class="category-tab-group">
                    <button
                        class="category-tab is-active"
                        type="button"
                        data-category-id="${category.id}"
                    >
                        ${category.label}
                    </button>
                    <div class="category-sub-options">
                        ${category.subOptions.map(sub => `
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
            `;
        }

        return `
            <button
                class="category-tab ${category.id === activeCategory.id ? "is-active" : ""}"
                type="button"
                data-category-id="${category.id}"
            >
                ${category.label}
            </button>
        `;
    }).join("");

    categoryTabs.querySelectorAll(".category-tab").forEach(button =>
    {
        button.addEventListener("click", () =>
        {
            if (button.dataset.categoryId === activeCategory.id) return;
            selectCategory(button.dataset.categoryId);
        });
    });

    categoryTabs.querySelectorAll(".category-sub-option").forEach(button =>
    {
        button.addEventListener("click", () =>
        {
            const nextSubOption = button.dataset.subOptionId;
            if (!nextSubOption || nextSubOption === activeSubOption) return;
            selectCategory(activeCategory.id, nextSubOption);
        });
    });
}
