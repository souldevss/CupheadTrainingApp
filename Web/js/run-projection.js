const projectionWindow = 100;
let projectionTargetSeconds = null;

function projectSplit(row, recapOutcomes = []) {
    const outcomes = (row.outcomeHistory || []).slice(-projectionWindow);
    const practiceClears = outcomes.filter(outcome => outcome.isClear && Number.isFinite(outcome.clearSeconds) && outcome.clearSeconds > 0)
        .map(outcome => outcome.clearSeconds);
    const recapClears = recapOutcomes.filter(Number.isFinite);
    const inferredDeaths = recapOutcomes.length - recapClears.length;
    const clears = [...practiceClears, ...recapClears];
    const total = outcomes.length + recapOutcomes.length;
    const deaths = outcomes.filter(outcome => outcome.isDeath).length + inferredDeaths;
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
    const practiceStarts = Math.min(...route.map(split => split.count));
    const practiceOdds = practiceStarts > 0 ? route.reduce((chance, split) => chance * split.practiceClearRate, 1) : null;
    if (!recap?.runStarts) return practiceOdds;
    // The least-practiced split limits the number of complete routes supported by practice data.
    return (recap.firstTryFinishes + (practiceOdds ?? 0) * practiceStarts) / (recap.runStarts + practiceStarts);
}

function projectionResidual(route) {
    const rankIndices = [];
    for (const split of route) {
        const boss = bossArt.get(split.name);
        if (!boss || split.average === null) continue;
        const thresholds = boss.times || generateRankTimes(boss.fRankTime, { wrTime: boss.wrTime });
        if (thresholds.length) rankIndices.push(getRankIndexForTime(split.average, thresholds));
    }
    const averageRank = rankIndices.length
        ? Math.round(rankIndices.reduce((sum, rank) => sum + rank, 0) / rankIndices.length) : 0;
    return getResidualTotal(averageRank);
}

function parseProjectionTarget(value) {
    const input = value.trim().replace(",", ".");
    if (!/^(?:\d+:){0,2}\d+(?:\.\d+)?$/.test(input)) return null;
    const parts = input.split(":").map(Number);
    if (parts.slice(1).some(part => part >= 60)) return null;
    const seconds = parts.reduce((total, part) => total * 60 + part, 0);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function projectionTargetChance(route, budget) {
    const ranges = route.map(({ clears }) => ({ clears, min: Math.min(...clears), max: Math.max(...clears) }));
    const minimum = ranges.reduce((sum, split) => sum + split.min, 0);
    const maximum = ranges.reduce((sum, split) => sum + split.max, 0);
    if (budget < minimum - 1e-8) return 0;
    if (budget >= maximum - 1e-8) return 1;

    // Convolve the observed clear times. Bound the number of bins for routes with wide time ranges.
    const binSize = Math.max(0.01, (maximum - minimum) / 4000);
    const limit = Math.max(0, Math.floor((budget - minimum) / binSize + 1e-8));
    let distribution = new Float64Array([1]);
    for (const { clears, min } of ranges) {
        const weights = new Map();
        for (const seconds of clears) {
            const bin = Math.round((seconds - min) / binSize);
            if (bin <= limit) weights.set(bin, (weights.get(bin) || 0) + 1 / clears.length);
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
    const history = recapProjectionHistory(categoryKey);
    const includeRecap = history?.compatible && recapProjectionCategory === categoryKey;
    const route = rows.map(row => projectSplit(row, includeRecap ? (history.outcomesByBoss.get(row.level) || []).slice(-projectionWindow) : []));
    const islandsBySplit = new Map();
    for (const island of getLogCategoryData()?.islands || []) {
        for (const boss of island.levels) islandsBySplit.set(boss.name, island.name);
    }
    const groups = new Map();
    for (const split of route) {
        const island = islandsBySplit.get(split.name) || t("projection.other");
        if (!groups.has(island)) groups.set(island, []);
        groups.get(island).push(split);
    }
    const language = getActiveLanguage();
    const exactOdds = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
    const rareOdds = new Intl.NumberFormat(language, { notation: "scientific", maximumFractionDigits: 1 });
    const body = document.getElementById("projection-splits");
    const summary = document.getElementById("projection-summary");
    const targetForm = document.getElementById("projection-target-form");
    const target = document.getElementById("projection-target");
    const requireDeathless = document.getElementById("projection-target-deathless");
    const targetResult = document.getElementById("projection-target-result");
    const useRecap = document.getElementById("projection-use-recap");
    const source = document.getElementById("projection-source");
    useRecap.disabled = !history?.compatible;
    useRecap.checked = !!includeRecap;
    source.textContent = !history ? t("projection.recap-missing") : !history.compatible ? t("projection.recap-mismatch")
        : tf(includeRecap ? "projection.recap-source" : "projection.recap-available", { name: history.name, count: history.count });
    useRecap.onchange = () => {
        recapProjectionCategory = useRecap.checked ? categoryKey : null;
        renderRunProjection(rows, categoryKey);
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
        targetResult.replaceChildren();
        if (!route.length) {
            summary.textContent = t("projection.loading");
            return;
        }
        const missingClears = route.filter(split => split.average === null).length;
        const residual = projectionResidual(route);
        const clearTime = missingClears ? "—" : formatProjectionTime(route.reduce((sum, split) => sum + split.average, residual));
        const deathless = firstTryProjectionOdds(route, includeRecap ? history : null);
        const recordedFirstTries = includeRecap && history.runStarts ? tf("projection.recap-first-tries", {
            hits: history.firstTryFinishes, count: history.runStarts
        }) : "";
        summary.innerHTML = `<div class="projection-metrics">
            <div class="projection-metric"><span>${t("projection.total")}</span><strong>${clearTime}</strong>
                <small>${tf("projection.includes-residual", { time: formatProjectionTime(residual) })}</small></div>
            <div class="projection-metric projection-deathless"><span>${t("projection.deathless")}</span><strong>${formatOdds(deathless)}</strong>
                ${recordedFirstTries ? `<small>${safeText(recordedFirstTries)}</small>` : ""}</div>
        </div>${missingClears ? `<p>${tf("projection.missing-clears", { count: missingClears })}</p>` : ""}`;

        if (projectionTargetSeconds === null) return;
        if (missingClears) {
            targetResult.textContent = t("projection.target-unavailable");
            return;
        }
        const chance = projectionTargetChance(route, projectionTargetSeconds - residual);
        const targetLabel = requireDeathless.checked ? "projection.target-overall" : "projection.target-pace";
        const targetOdds = requireDeathless.checked ? (deathless === null ? null : chance * deathless) : chance;
        const recordedResult = includeRecap && !requireDeathless.checked ? tf("projection.recorded-count", {
            hits: history.finishes.filter(time => time <= projectionTargetSeconds).length, count: history.count
        }) : "";
        targetResult.innerHTML = `<div class="projection-metric projection-target-odds">
            <span>${t(targetLabel)}</span><strong>${formatOdds(targetOdds)}</strong>
            ${recordedResult ? `<small>${safeText(recordedResult)}</small>` : ""}
        </div>`;
    }

    targetForm.onsubmit = event => {
        event.preventDefault();
        projectionTargetSeconds = parseProjectionTarget(target.value);
        if (projectionTargetSeconds === null) {
            targetResult.textContent = t("projection.target-invalid");
            return;
        }
        updateSummary();
    };
    target.oninput = () => {
        projectionTargetSeconds = null;
        targetResult.replaceChildren();
    };
    requireDeathless.onchange = updateSummary;

    function splitMarkup(split) {
        const name = safeText(cupheadDisplayName(split.name));
        const art = bossArt.get(split.name);
        const icon = art?.icon ? `<img class="projection-boss-icon" src="${safeText(art.icon)}" alt="" loading="lazy">` : navigationIcon("boss");
        const warning = split.count < projectionWindow
            ? `<span class="projection-warning" title="${safeText(t("projection.low-sample-detail"))}">⚠ ${t("projection.low-sample")}</span>` : "";
        return `<tr>
        <th scope="row"><span class="icon-reveal projection-boss-chip" role="img" tabindex="0" aria-label="${name}" style="background:${safeText(art?.background || "#354554")};color:${safeText(art?.color || "#fff")}">${icon}<span class="icon-caption" aria-hidden="true">${name}</span></span></th>
        <td>${split.average === null ? "—" : formatProjectionTime(split.average)}</td>
        <td>${formatOdds(split.deathRate, "projection.no-deaths")}</td>
        <td>${split.count} / ${projectionWindow}${split.recapCount ? `<small> ${tf("projection.recap-count", { count: split.recapCount })}</small>` : ""}${split.inferredDeaths ? `<small> ${tf("projection.recap-deaths", { count: split.inferredDeaths })}</small>` : ""}${warning}</td>
    </tr>`;
    }

    body.innerHTML = Array.from(groups, ([island, group]) => {
        const palette = totalsRowsStyles.find(row => row.name === island);
        const style = palette ? `background-color:${palette.background};color:${palette.color};${isleArtworkStyle(island, palette.background)}` : "";
        return `<tr class="projection-island"><th class="isle-artwork" colspan="4" style="${style}">${safeText(cupheadDisplayName(island))}</th></tr>${group.map(splitMarkup).join("")}`;
    }).join("");
    updateSummary();
}

function formatProjectionTime(seconds) {
    return formatTime(Math.round(seconds * 100) / 100);
}
