// Desktop Training page with one table per isle and automatic times.

function syncAutoRank(levelIndex) {
    const level = getLevelByFlatIndex(levelIndex);
    const wrapper = table.querySelector(`[data-time-wrapper="${levelIndex}"]`);
    const rankOutput = table.querySelector(`[data-rank-output="${levelIndex}"]`);
    const display = table.querySelector(`[data-auto-time="${levelIndex}"]`);
    const autoTimes = window.cupheadAutoTimes || {};
    const seconds = Number.isFinite(autoTimes[levelIndex]) ? autoTimes[levelIndex] : null;

    if (!wrapper || !rankOutput || !display || !level) return;

    if (!level.times && level.fRankTime) {
        level.times = generateRankTimes(level.fRankTime, {
            wrTime: level.wrTime,
            fallbackMultipliers: getActiveRankMultipliers()
        });
    }

    const style = seconds === null
        ? getPersonalRankStyle(null)
        : getInterpolatedRankStyle(seconds, level.times);
    const rankIndex = seconds === null ? null : getRankIndexForTime(seconds, level.times);

    display.textContent = seconds === null ? "—" : formatTime(seconds);
    rankOutput.textContent = rankIndex === null ? "-" : ranks[rankIndex];
    rankOutput.classList.toggle("personal-rank-empty", rankIndex === null);
    rankOutput.style.background = style.background;
    rankOutput.style.color = style.color;
    rankOutput.style.fontWeight = style.fontWeight || "";

    if (seconds !== null) {
        wrapper.style.setProperty("background", style.background, "important");
        display.style.setProperty("color", style.color, "important");
    } else {
        wrapper.style.removeProperty("background");
        display.style.removeProperty("color");
    }
}

function syncAllAutoRanks() {
    if (!table) return;
    table.querySelectorAll("[data-auto-time]").forEach(el => {
        syncAutoRank(Number(el.dataset.autoTime));
    });
}

function renderAutoTimesPage() {
    const categoryKey = activeCategory?.id === "DLC" ? `DLC:${activeSubOption}` : activeCategory?.id;
    const bests = window.cupheadCategoryBests?.[categoryKey] || {};
    window.cupheadAutoTimes = {};
    getActiveLevels().forEach((level, index) => {
        const seconds = bests[(level.name || "").trim().toLowerCase().replace(/\s+/g, " ")];
        if (Number.isFinite(seconds)) window.cupheadAutoTimes[index] = seconds;
    });
    if (!getActiveLevels().length) {
        renderPlaceholderTable();
        return;
    }

    if (!activeCategory || !["1-1", "DLC"].includes(activeCategory.id)) {
        table.innerHTML = `
            <p class="auto-category-hint">
                ${t("auto.category-hint")}
            </p>`;
        totals.hidden = true;
        if (rankChart) rankChart.innerHTML = "";
        if (rankChartPie) rankChartPie.innerHTML = "";
        return;
    }

    totals.hidden = false;
    let levelCounter = 0;
    const isDlc = activeCategory.id === "DLC";
    const groups = [];
    for (const island of getActiveIslands()) {
        if (groups.length && (isDlc || island.name === "Inkwell Hell")) groups.at(-1).push(island);
        else groups.push([island]);
    }

    const renderIsle = island => `
<table class="training-isle">
<colgroup><col><col class="training-time-width"></colgroup>
<thead>
    <tr><th colspan="2" class="isle-artwork"
        style="background-color:${island.color}; color:${island.textcolor}; ${isleArtworkStyle(island.name, island.color)}">
        ${escapeAttribute(cupheadDisplayName(island.name))}
    </th></tr>
</thead>
<tbody>
    ${island.levels.map(boss => {
        const index = levelCounter++;
        return `<tr>${createBossCellMarkup(boss)}
        <td class="personal-time-col">
            <div class="time-input-wrapper" data-time-wrapper="${index}">
                <span class="auto-time-display" data-auto-time="${index}">—</span>
                <span class="time-rank-display" data-rank-output="${index}">-</span>
            </div>
        </td></tr>`;
    }).join("")}
</tbody>
</table>`;

    table.innerHTML = groups.map(group =>
        `<div class="training-isle-group">${group.map(renderIsle).join("")}</div>`
    ).join("");

    syncAllAutoRanks();
    renderPersonalTotals();
    renderRankChart();
}
