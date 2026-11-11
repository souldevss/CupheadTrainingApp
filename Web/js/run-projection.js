const projectionWindow = 100;
let projectionTargetSeconds = null;
function projectSplit(row, recapOutcomes = []) {
  const outcomes = (row.outcomeHistory || []).slice(-100), practiceClears = outcomes.filter((outcome) => outcome.isClear && Number.isFinite(outcome.clearSeconds) && outcome.clearSeconds > 0).map((outcome) => outcome.clearSeconds), recapClears = recapOutcomes.filter(Number.isFinite), inferredDeaths = recapOutcomes.length - recapClears.length, clears = [...practiceClears, ...recapClears], total = outcomes.length + recapOutcomes.length, deaths = outcomes.filter((outcome) => outcome.isDeath).length + inferredDeaths;
  return {
    name: row.level,
    count: outcomes.length,
    clears,
    recapCount: recapClears.length,
    inferredDeaths,
    practiceClearRate: outcomes.length ? practiceClears.length / outcomes.length : null,
    average: clears.length ? clears.reduce((sum, seconds) => sum + seconds, 0) / clears.length : null,
    deathRate: total ? deaths / total : null
  };
}
function firstTryProjectionOdds(route, recap) {
  if (!route.length) return null;
  const practiceStarts = Math.min(...route.map((split) => split.count)), practiceOdds = practiceStarts > 0 ? route.reduce((chance, split) => chance * split.practiceClearRate, 1) : null;
  return recap?.runStarts ? (recap.firstTryFinishes + (practiceOdds ?? 0) * practiceStarts) / (recap.runStarts + practiceStarts) : practiceOdds;
}
function projectionResidual(route) {
  const rankIndices = [];
  for (const split of route) {
    const boss = bossArt.get(split.name);
    if (!boss || split.average === null) continue;
    const thresholds = boss.times || generateRankTimes(boss.fRankTime, { wrTime: boss.wrTime });
    thresholds.length && rankIndices.push(getRankIndexForTime(split.average, thresholds));
  }
  const averageRank = rankIndices.length ? Math.round(rankIndices.reduce((sum, rank) => sum + rank, 0) / rankIndices.length) : 0;
  return getResidualTotal(averageRank);
}
function parseProjectionTarget(value) {
  const input = value.trim().replace(",", ".");
  if (!/^(?:\d+:){0,2}\d+(?:\.\d+)?$/.test(input)) return null;
  const parts = input.split(":").map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
function projectionTargetChance(route, budget) {
  const ranges = route.map(({ clears }) => ({ clears, min: Math.min(...clears), max: Math.max(...clears) })), minimum = ranges.reduce((sum, split) => sum + split.min, 0), maximum = ranges.reduce((sum, split) => sum + split.max, 0);
  if (budget < minimum - 1e-8) return 0;
  if (budget >= maximum - 1e-8) return 1;
  const binSize = Math.max(0.01, (maximum - minimum) / 4e3), limit = Math.max(0, Math.floor((budget - minimum) / binSize + 1e-8));
  let distribution = new Float64Array([1]);
  for (const { clears, min } of ranges) {
    const weights = /* @__PURE__ */ new Map();
    for (const seconds of clears) {
      const bin = Math.round((seconds - min) / binSize);
      bin <= limit && weights.set(bin, (weights.get(bin) || 0) + 1 / clears.length);
    }
    const next = new Float64Array(Math.min(limit + 1, distribution.length + Math.max(...weights.keys())));
    for (const [offset, weight] of weights) {
      const count = Math.min(distribution.length, next.length - offset);
      for (let index = 0; index < count; index++) next[index + offset] += distribution[index] * weight;
    }
    distribution = next;
  }
  return Math.min(1, distribution.reduce((sum, probability) => sum + probability, 0));
}
function renderRunProjection(rows, categoryKey) {
  const history = recapProjectionHistory(categoryKey), includeRecap = history?.compatible && recapProjectionCategory === categoryKey, route = rows.map((row) => projectSplit(row, includeRecap ? (history.outcomesByBoss.get(row.level) || []).slice(-100) : [])), islandsBySplit = /* @__PURE__ */ new Map();
  for (const island of getLogCategoryData()?.islands || [])
    for (const boss of island.levels) islandsBySplit.set(boss.name, island.name);
  const groups = /* @__PURE__ */ new Map();
  for (const split of route) {
    const island = islandsBySplit.get(split.name) || t("projection.other");
    groups.has(island) || groups.set(island, []), groups.get(island).push(split);
  }
  const language = getActiveLanguage(), exactOdds = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }), rareOdds = new Intl.NumberFormat(language, { notation: "scientific", maximumFractionDigits: 1 }), body = document.getElementById("projection-splits"), summary = document.getElementById("projection-summary"), targetForm = document.getElementById("projection-target-form"), target = document.getElementById("projection-target"), requireDeathless = document.getElementById("projection-target-deathless"), targetResult = document.getElementById("projection-target-result"), useRecap = document.getElementById("projection-use-recap"), source = document.getElementById("projection-source");
  useRecap.disabled = !history?.compatible, useRecap.checked = !!includeRecap, source.textContent = history ? history.compatible ? tf(includeRecap ? "projection.recap-source" : "projection.recap-available", { name: history.name, count: history.count }) : t("projection.recap-mismatch") : t("projection.recap-missing"), useRecap.onchange = () => {
    recapProjectionCategory = useRecap.checked ? categoryKey : null, renderRunProjection(rows, categoryKey);
  };
  function formatOdds(probability, zeroLabel = "projection.outside-sample") {
    if (probability === null) return "—";
    if (probability <= 0) return t(zeroLabel);
    const attempts = 1 / probability;
    if (attempts < 1.005) return t("projection.one-attempt");
    const count = attempts >= 1e9 ? rareOdds.format(attempts) : exactOdds.format(attempts >= 10 ? Math.round(attempts) : attempts);
    return tf("projection.one-in", { count });
  }
  function updateSummary() {
    if (targetResult.replaceChildren(), !route.length) {
      summary.textContent = t("projection.loading");
      return;
    }
    const missingClears = route.filter((split) => split.average === null).length, residual = projectionResidual(route), clearTime = missingClears ? "—" : formatProjectionTime(route.reduce((sum, split) => sum + split.average, residual)), deathless = firstTryProjectionOdds(route, includeRecap ? history : null), recordedFirstTries = includeRecap && history.runStarts ? tf("projection.recap-first-tries", {
      hits: history.firstTryFinishes,
      count: history.runStarts
    }) : "";
    if (summary.innerHTML = `<div class="projection-metrics">
            <div class="projection-metric"><span>${t("projection.total")}</span><strong>${clearTime}</strong>
                <small>${tf("projection.includes-residual", { time: formatProjectionTime(residual) })}</small></div>
            <div class="projection-metric projection-deathless"><span>${t("projection.deathless")}</span><strong>${formatOdds(deathless)}</strong>
                ${recordedFirstTries ? `<small>${safeText(recordedFirstTries)}</small>` : ""}</div>
        </div>${missingClears ? `<p>${tf("projection.missing-clears", { count: missingClears })}</p>` : ""}`, projectionTargetSeconds === null) return;
    if (missingClears) {
      targetResult.textContent = t("projection.target-unavailable");
      return;
    }
    const chance = projectionTargetChance(route, projectionTargetSeconds - residual), targetLabel = requireDeathless.checked ? "projection.target-overall" : "projection.target-pace", targetOdds = requireDeathless.checked ? deathless === null ? null : chance * deathless : chance, recordedResult = includeRecap && !requireDeathless.checked ? tf("projection.recorded-count", {
      hits: history.finishes.filter((time) => time <= projectionTargetSeconds).length,
      count: history.count
    }) : "";
    targetResult.innerHTML = `<div class="projection-metric projection-target-odds">
            <span>${t(targetLabel)}</span><strong>${formatOdds(targetOdds)}</strong>
            ${recordedResult ? `<small>${safeText(recordedResult)}</small>` : ""}
        </div>`;
  }
  targetForm.onsubmit = (event) => {
    if (event.preventDefault(), projectionTargetSeconds = parseProjectionTarget(target.value), projectionTargetSeconds === null) {
      targetResult.textContent = t("projection.target-invalid");
      return;
    }
    updateSummary();
  }, target.oninput = () => {
    projectionTargetSeconds = null, targetResult.replaceChildren();
  }, requireDeathless.onchange = updateSummary;
  function splitMarkup(split) {
    const name = safeText(cupheadDisplayName(split.name)), art = bossArt.get(split.name), icon = art?.icon ? `<img class="projection-boss-icon" src="${safeText(art.icon)}" alt="" loading="lazy">` : navigationIcon("boss"), warning = split.count < 100 ? `<span class="projection-warning" title="${safeText(t("projection.low-sample-detail"))}">⚠ ${t("projection.low-sample")}</span>` : "";
    return `<tr>
        <th scope="row"><span class="icon-reveal projection-boss-chip" role="img" tabindex="0" aria-label="${name}" style="background:${safeText(art?.background || "#354554")};color:${safeText(art?.color || "#fff")}">${icon}<span class="icon-caption" aria-hidden="true">${name}</span></span></th>
        <td>${split.average === null ? "—" : formatProjectionTime(split.average)}</td>
        <td>${formatOdds(split.deathRate, "projection.no-deaths")}</td>
        <td>${split.count} / 100${split.recapCount ? `<small> ${tf("projection.recap-count", { count: split.recapCount })}</small>` : ""}${split.inferredDeaths ? `<small> ${tf("projection.recap-deaths", { count: split.inferredDeaths })}</small>` : ""}${warning}</td>
    </tr>`;
  }
  body.innerHTML = Array.from(groups, ([island, group]) => {
    const palette = totalsRowsStyles.find((row) => row.name === island);
    return `<tr class="projection-island"><th class="isle-artwork" colspan="4" style="${palette ? `background-color:${palette.background};color:${palette.color};${isleArtworkStyle(island, palette.background)}` : ""}">${safeText(cupheadDisplayName(island))}</th></tr>${group.map(splitMarkup).join("")}`;
  }).join(""), updateSummary();
}
function formatProjectionTime(seconds) {
  return formatTime(Math.round(seconds * 100) / 100);
}
