function renderTimeTablePage() {
  if (!getActiveLevels().length) {
    renderPlaceholderTable();
    return;
  }
  let html = `
<table class="reference-table" style="border-right-color:${getRankBorderColor(ranks.length-1)}">
<colgroup><col class="reference-isle"><col class="reference-boss"><col span="${ranks.length}"></colgroup>
<thead>
<tr>
    <th class="island sticky-col-1">${t("header.islands")}</th>
    <th class="boss sticky-col-2">${t("header.levels")}</th>
    ${ranks.map((rank, index) => `<th class="rank-col rank-${index}" style="--rank-border:${getRankBorderColor(index)};color:${getRankStyle(index).background}">${rank}</th>`).join("")}
</tr>
</thead>
<tbody>
`;
  const renderLevelRow = (boss, island = null, index = 0) => {
    !boss.times && boss.fRankTime && (boss.times = generateRankTimes(boss.fRankTime, {
      wrTime: boss.wrTime,
      fallbackMultipliers: getActiveRankMultipliers()
    })), html += `<tr class="${index === 0 ? "isle-start" : ""}">`, island && index === 0 && (html += `
            <td rowspan="${island.levels.length}" class="island isle-artwork" style="background-color:${island.color}; color:${island.textcolor}; ${isleArtworkStyle(island.name, island.color)}">
                ${escapeAttribute(cupheadDisplayName(island.name))}
            </td>`), html += createBossCellMarkup(boss), boss.times.forEach((time, rankIndex) => {
      const style = getRankStyle(rankIndex), fontWeight = style.fontWeight || "inherit";
      rankIndex === 0 && boss.wrUrl ? html += `
            <td class="rank-col rank-0" style="--rank-border:${getRankBorderColor(rankIndex)};background: ${style.background}; color: ${style.color}; font-weight: ${fontWeight};">
                <a class="wr-link" href="${escapeAttribute(boss.wrUrl)}" target="_blank" rel="noopener" title="${escapeAttribute(boss.wrPlayer ? boss.wrPlayer + " — " + formatTime(time) : formatTime(time))}" style="color: ${style.color}; font-weight: ${fontWeight};">
                    ${formatTime(time)}
                </a>
            </td>` : html += `<td class="rank-col rank-${rankIndex}" style="--rank-border:${getRankBorderColor(rankIndex)};background: ${style.background}; color: ${style.color}; font-weight: ${fontWeight};">${formatTime(time)}</td>`;
    }), html += "</tr>";
  };
  for (const island of getActiveIslands())
    island.levels.forEach((boss, index) => renderLevelRow(boss, island, index));
  html += `
</tbody>
</table>
`, table.innerHTML = html, totals.hidden = !1, renderTimeTableTotals(), getDeveloperRankEditor()?.decorateTimeTable(table, totals, getActiveLevels(), getActiveResidual(), () => {
    refreshDeveloperRankOverrides(), calculateRankMultipliers(), renderTimeTablePage();
  });
}
function renderTimeTableTotals() {
  let totalsHtml = `
<table class="reference-table reference-totals-table" style="border-right-color:${getRankBorderColor(ranks.length-1)}">
<colgroup><col class="reference-total-label"><col span="${ranks.length}"></colgroup>
<thead>
<tr>
    <th class="island sticky-col-1">${t("header.isle-times")}</th>
    ${ranks.map((rank, index) => `<th class="rank-col rank-${index}" style="--rank-border:${getRankBorderColor(index)};color:${getRankStyle(index).background}">${rank}</th>`).join("")}
</tr>
</thead>
<tbody>
`;
  const activeIslands = getActiveIslands();
  for (let i = 0; i < activeIslands.length; i++) {
    const rowStyle = totalsRowsStyles.find((r) => r.name === activeIslands[i].name) || { background: "#333", color: "#fff" };
    totalsHtml += `
    <tr>
        <td class="island sticky-col-1 isle-artwork" style="background-color: ${rowStyle.background}; color: ${rowStyle.color}; ${isleArtworkStyle(activeIslands[i].name, rowStyle.background)}">${escapeAttribute(cupheadDisplayName(activeIslands[i].name))}</td>
        ${ranks.map((_, rankIndex) => {
      const total = getIslandTotal(i, rankIndex), style = getRankStyle(rankIndex);
      return `
            <td class="rank-${rankIndex}" style="--rank-border:${getRankBorderColor(rankIndex)};background: ${style.background}; color: ${style.color}; font-weight: ${style.fontWeight || "inherit"};">
                ${formatTime(total)}
            </td>
            `;
    }).join("")}
    </tr>
    `;
  }
  const residualStyle = totalsRowsStyles.find((r) => r.name === "Residual") || { background: "#333", color: "#fff" }, residualArray = getResidualRankTimes();
  totalsHtml += `
<tr data-rank-residual data-tooltip="${escapeAttribute(t("tooltip.residual"))}">
    <td class="island sticky-col-1" style="background: ${residualStyle.background}; color: ${residualStyle.color};">${t("header.residual")}</td>
    ${residualArray.map(
    (value, rankIndex) => {
      const style = getRankStyle(rankIndex);
      return `
            <td class="rank-${rankIndex}" style="--rank-border:${getRankBorderColor(rankIndex)};background: ${style.background}; color: ${style.color}; font-weight: ${style.fontWeight || "inherit"};">
                ${formatTime(value)}
            </td>
            `;
    }
  ).join("")}
</tr>
`;
  const sobStyle = totalsRowsStyles.find((r) => r.name === "Sob") || { background: "#333", color: "#fff" };
  totalsHtml += `
<tr data-tooltip="${escapeAttribute(t("tooltip.sob"))}">
    <td class="island sticky-col-1" style="background: ${sobStyle.background}; color: ${sobStyle.color};">${t("header.sob")}</td>
    ${ranks.map((_, rankIndex) => {
    const total = getSobTotal(rankIndex), style = getRankStyle(rankIndex);
    return `
        <td class="rank-${rankIndex}" style="--rank-border:${getRankBorderColor(rankIndex)};background: ${style.background}; color: ${style.color}; font-weight: ${style.fontWeight || "inherit"};">
            ${formatTime(total)}
        </td>
        `;
  }).join("")}
</tr>
`, totalsHtml += `
</tbody>
</table>
`, totals.innerHTML = totalsHtml;
  const tooltipRows = totals.querySelectorAll("[data-tooltip]");
  let infoTooltip = document.querySelector(".info-tooltip");
  infoTooltip || (infoTooltip = document.createElement("div"), infoTooltip.className = "info-tooltip", infoTooltip.style.position = "fixed", infoTooltip.style.zIndex = "10000", infoTooltip.style.pointerEvents = "none", infoTooltip.style.opacity = "0", infoTooltip.style.transition = "opacity 0.15s ease", document.body.appendChild(infoTooltip)), tooltipRows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      infoTooltip.textContent = row.dataset.tooltip, infoTooltip.style.opacity = "1";
    }), row.addEventListener("mousemove", (e) => {
      infoTooltip.style.left = `${e.clientX + 12}px`, infoTooltip.style.top = `${e.clientY + 12}px`;
    }), row.addEventListener("mouseleave", () => {
      infoTooltip.style.opacity = "0";
    });
  });
}
