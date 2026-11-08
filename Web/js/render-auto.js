// Auto-captured times page (desktop) — same visuals as Enter Times, no manual input

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
    let html = `
<table class="personal-table">
<thead>
<tr>
    <th class="island sticky-col-1">${t("header.islands")}</th>
    <th class="boss sticky-col-2">${t("header.levels")}</th>
    <th class="personal-time-col"></th>
</tr>
</thead>
<tbody>
`;

    for (const island of getActiveIslands()) {
        island.levels.forEach((boss, index) => {
            html += "<tr>";
            if (index === 0) {
                html += `
            <td rowspan="${island.levels.length}" class="island isle-artwork"
                style="background-color:${island.color}; color:${island.textcolor}; ${isleArtworkStyle(island.name, island.color)}">
                ${island.name}
            </td>`;
            }

            html += `${createBossCellMarkup(boss)}
        <td class="personal-time-col">
            <div class="time-input-wrapper" data-time-wrapper="${levelCounter}">
                <span class="auto-time-display" data-auto-time="${levelCounter}">—</span>
                <span class="time-rank-display" data-rank-output="${levelCounter}">-</span>
            </div>
        </td>`;
            html += "</tr>";
            levelCounter++;
        });
    }

    html += "</tbody></table>";
    table.innerHTML = html;

    syncAllAutoRanks();
    renderPersonalTotals();
    renderRankChart();
}
