function syncAutoRank(levelIndex) {
  const level = getLevelByFlatIndex(levelIndex), wrapper = table.querySelector(`[data-time-wrapper="${levelIndex}"]`), rankOutput = table.querySelector(`[data-rank-output="${levelIndex}"]`), display = table.querySelector(`[data-auto-time="${levelIndex}"]`), autoTimes = window.cupheadAutoTimes || {}, seconds = Number.isFinite(autoTimes[levelIndex]) ? autoTimes[levelIndex] : null;
  if (!wrapper || !rankOutput || !display || !level) return;
  !level.times && level.fRankTime && (level.times = generateRankTimes(level.fRankTime, {
    wrTime: level.wrTime,
    fallbackMultipliers: getActiveRankMultipliers()
  }));
  display.title = getTrainingComparisonTitle(level.name);
  const style = seconds === null ? getPersonalRankStyle(null) : getInterpolatedRankStyle(seconds, level.times), rankIndex = seconds === null ? null : getRankIndexForTime(seconds, level.times);
  wrapper.closest("td").style.background = style.background;
  wrapper.closest("td").style.setProperty("--rank-border", interpolateColor(style.background, style.color, .22));
  display.textContent = seconds === null ? "—" : formatTime(seconds), rankOutput.textContent = rankIndex === null ? "-" : ranks[rankIndex], rankOutput.classList.toggle("personal-rank-empty", rankIndex === null), rankOutput.style.background = style.background, rankOutput.style.color = style.color, rankOutput.style.fontWeight = style.fontWeight || "", seconds !== null ? (wrapper.style.setProperty("background", style.background, "important"), display.style.setProperty("color", style.color, "important")) : (wrapper.style.removeProperty("background"), display.style.removeProperty("color"));
}
function syncAllAutoRanks() {
  table && table.querySelectorAll("[data-auto-time]").forEach((el) => {
    syncAutoRank(Number(el.dataset.autoTime));
  });
}
function renderAutoTimesPage() {
  const categoryKey = activeCategory?.id === "DLC" ? `DLC:${activeSubOption}` : activeCategory?.id, bests = getTrainingComparisonTimes(categoryKey);
  if (window.cupheadAutoTimes = {}, getActiveLevels().forEach((level, index) => {
    const seconds = bests[(level.name || "").trim().toLowerCase().replace(/\s+/g, " ")];
    Number.isFinite(seconds) && (window.cupheadAutoTimes[index] = seconds);
  }), !getActiveLevels().length) {
    renderPlaceholderTable();
    return;
  }
  if (!activeCategory || !["1-1", "legacy", "DLC"].includes(activeCategory.id)) {
    table.innerHTML = `
            <p class="auto-category-hint">
                ${t("auto.category-hint")}
            </p>`, totals.hidden = !0, rankChart && (rankChart.innerHTML = ""), rankChartPie && (rankChartPie.innerHTML = "");
    return;
  }
  totals.hidden = !1;
  let levelCounter = 0;
  const isDlc = activeCategory.id === "DLC", groups = [];
  for (const island of getActiveIslands())
    groups.length && (isDlc || island.name === "Inkwell Hell") ? groups.at(-1).push(island) : groups.push([island]);
  const renderIsle = (island) => `
<table class="training-isle">
<colgroup><col><col class="training-time-width"></colgroup>
<thead>
    <tr><th colspan="2" class="isle-artwork"
        style="background-color:${island.color}; color:${island.textcolor}; ${isleArtworkStyle(island.name, island.color)}">
        ${escapeAttribute(cupheadDisplayName(island.name))}
    </th></tr>
</thead>
<tbody>
    ${island.levels.map((boss) => {
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
  table.innerHTML = groups.map(
    (group) => `<div class="training-isle-group">${group.map(renderIsle).join("")}</div>`
  ).join(""), syncAllAutoRanks(), renderPersonalTotals(), renderRankChart();
}
