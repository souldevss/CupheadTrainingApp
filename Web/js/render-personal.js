// Personal times page rendering (index.html)

/**
 * Calculates the brightness of a hex color (0-255)
 * @param {string} hex - Hex color string (e.g., "#ffffff" or "#fff")
 * @returns {number} Brightness value (0-255)
 */
function getBrightness(hex)
{
    const hexValue = hex.replace("#", "");
    const r = parseInt(hexValue.substr(0, 2), 16);
    const g = parseInt(hexValue.substr(2, 2), 16);
    const b = parseInt(hexValue.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Renders the personal times page with input fields for user's times
 */
function renderPersonalTimesPage()
{
    if (!getActiveLevels().length) {
        renderPlaceholderTable();
        return;
    }

    const storedTimes = getStoredPersonalTimes();
    let levelCounter = 0;
    const hasIslands = true;
    let html = `
<table class="personal-table">
<thead>
<tr>
    ${hasIslands ? `<th class="island sticky-col-1">${t("header.islands")}</th>` : ""}
    <th class="boss ${hasIslands ? "sticky-col-2" : "split-cell"}">${hasIslands ? t("header.levels") : t("personal.split")}</th>
    <th class="personal-time-col"></th>
</tr>
</thead>
<tbody>
`;

    const renderLevelRow = (boss, island = null, index = 0) =>
        {
            const inputId = `personal-time-${levelCounter}`;
            const rowStyle = getPersonalRankStyle(null);

            html += "<tr>";

            if (island && index === 0) {
                html += `
            <td
                rowspan="${island.levels.length}"
                class="island"
                style="background:${island.color}; color:${island.textcolor};"
            >
                ${island.name}
            </td>
            `;
            }

            html += `${createBossCellMarkup(boss)}
        <td class="personal-time-col">
            <div class="time-input-wrapper" data-time-wrapper="${levelCounter}">
                <input
                    id="${inputId}"
                    class="time-input"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="0:00.00"
                    value="${escapeAttribute(storedTimes[inputId] || "")}"
                    data-level-index="${levelCounter}"
                >
                <span class="time-rank-display" data-rank-output="${levelCounter}" style="background: ${rowStyle.background}; color: ${rowStyle.color};">-</span>
            </div>
        </td>
        `;

            html += "</tr>";
            levelCounter++;
        };

    if (hasIslands) {
        for (const island of getActiveIslands()) {
            island.levels.forEach((boss, index) => renderLevelRow(boss, island, index));
        }
    } else {
        getActiveLevels().forEach(boss => renderLevelRow(boss));
    }

    html += `
</tbody>
</table>
`;

    table.innerHTML = html;
    renderPersonalTotals();
    syncAllPersonalRanks();
    renderRankChart();

    const personalInputs = [...table.querySelectorAll(".time-input")];

    if (personalInputs.length > 0) {
        table.addEventListener("keydown", event => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !target.classList.contains("time-input")) return;
            if (event.key !== "Enter" && event.key !== "NumpadEnter") return;

            event.preventDefault();
            const currentIndex = personalInputs.indexOf(target);
            const targetIndex = currentIndex >= 0 ? (currentIndex + 1) % personalInputs.length : 0;
            const nextInput = personalInputs[targetIndex];

            if (nextInput) {
                target.dispatchEvent(new Event("blur", { bubbles: true }));
                nextInput.focus();
                nextInput.select();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
            if (document.activeElement instanceof HTMLInputElement) return;

            event.preventDefault();
            const firstInput = personalInputs[0];
            if (firstInput) {
                firstInput.focus();
                firstInput.select();
            }
        });
    }

    personalInputs.forEach(input => {
        let loopAudio = null;

        const startLoopSound = () => {
            if (loopAudio) {
                loopAudio.pause();
                loopAudio.currentTime = 0;
            }
            loopAudio = new Audio(APP_SOUND_URLS.loop);
            loopAudio.loop = true;
            loopAudio.volume = 0.01;
            loopAudio.play().catch(() => {});
        };

        const stopLoopSound = () => {
            if (loopAudio) {
                loopAudio.pause();
                loopAudio.currentTime = 0;
            }
            playSound(APP_SOUND_URLS.loopEnd, 0.1);
        };

        input.addEventListener("focus", () => {
            startLoopSound();
        });

        input.addEventListener("blur", stopLoopSound);

        input.addEventListener("input", () => {
            storedTimes[input.id] = input.value;
            localStorage.setItem(getPersonalTimesStorageKey(), JSON.stringify(storedTimes));
            syncPersonalRank(input);
            renderPersonalTotals();
            renderRankChart();
        });
    });
}

/**
 * Renders the personal totals table showing user's times and ranks for each island
 */
function renderPersonalTotals()
{
    totals.hidden = false;
    const totalsData = getPersonalTotalsData();
    let totalsHtml = `
<table class="personal-totals-table">
<thead>
<tr>
    <th class="island sticky-col-1">${t("header.total")}</th>
    <th class="personal-time-col"></th>
</tr>
</thead>
<tbody>
`;

    totalsData.forEach(row =>
    {
        const rowStyle = totalsRowsStyles.find(r => r.name === row.name) || { background: "#333", color: "#fff" };
        const rankIndex = row.total === null ? null : getRankIndexForTime(row.total, row.thresholds);
        const rankStyle = getInterpolatedRankStyle(row.total, row.thresholds);

        let tooltipAttr = "";
        if (row.name === "Residual") {
            tooltipAttr = `data-tooltip="${escapeAttribute(t("tooltip.residual"))}"`;
        } else if (row.name === "Sob") {
            tooltipAttr = `data-tooltip="${escapeAttribute(t("tooltip.sob"))}"`;
        }

        totalsHtml += `
    <tr ${tooltipAttr}>
        <td class="island sticky-col-1 isle-artwork" style="background-color: ${rowStyle.background}; color: ${rowStyle.color}; ${isleArtworkStyle(row.name, rowStyle.background)}">${row.name}</td>
        <td class="personal-time-col" style="background: ${rankStyle.background}; color: ${rankStyle.color};">
            <div class="time-input-wrapper" style="background: transparent !important; justify-content: space-between; padding: 1px 6px;">
                <span>${row.total === null ? "-" : formatTime(row.total)}</span>
                <span class="time-rank-display" style="background: ${rankStyle.background}; color: ${rankStyle.color};">
                    ${rankIndex === null ? "-" : ranks[rankIndex]}
                </span>
            </div>
        </td>
    </tr>
    `;
    });

    totalsHtml += `
</tbody>
</table>
`;

    totals.innerHTML = totalsHtml;

    const tooltipRows = totals.querySelectorAll("[data-tooltip]");
    const infoTooltip = document.createElement("div");
    infoTooltip.className = "info-tooltip";
    infoTooltip.style.position = "fixed";
    infoTooltip.style.zIndex = "10000";
    infoTooltip.style.pointerEvents = "none";
    infoTooltip.style.opacity = "0";
    infoTooltip.style.transition = "opacity 0.15s ease";
    document.body.appendChild(infoTooltip);

    tooltipRows.forEach(row => {
        row.addEventListener("mouseenter", () => {
            infoTooltip.textContent = row.dataset.tooltip;
            infoTooltip.style.opacity = "1";
        });

        row.addEventListener("mousemove", (e) => {
            infoTooltip.style.left = `${e.clientX + 12}px`;
            infoTooltip.style.top = `${e.clientY + 12}px`;
        });

        row.addEventListener("mouseleave", () => {
            infoTooltip.style.opacity = "0";
        });
    });
}

/**
 * Renders the rank distribution chart showing statistics about user's performance
 */
function renderRankChart()
{
    if (!rankChart) return;

    const currentTable = document.getElementById("table");
    if (!currentTable) return;

    const distribution = getPersonalRankDistribution();
    const displayRanks = distribution.filter(item => item.count > 0);
    const filledCount = displayRanks.reduce((sum, item) => sum + item.count, 0);
    const totalCount = getTotalLevelCount();
    const topRank = displayRanks[0] || null;
    const mostCommonRank = displayRanks.reduce((best, item) =>
        !best || item.count > best.count ? item : best,
        null
    );

    const formatRankLabel = rank => {
        if (!rank) return t("personal.unknown-rank");
        const normalized = rank.trim();
        if (normalized.length === 0) return t("personal.unknown-rank");
        return normalized.endsWith("Rank") || normalized.endsWith("rank")
            ? normalized
            : `${normalized}${t("personal.rank-suffix")}`;
    };

    const segmentsHtml = filledCount === 0
        ? `<div class="rank-chart-empty-segment"></div>`
        : displayRanks.map(item =>
        {
            const percent = (item.count / filledCount) * 100;
            return `
            <span
                class="rank-chart-segment"
                title="${formatRankLabel(item.rank)}: ${item.count}"
                style="width: ${percent}%; background: ${item.style.background};"
            ></span>
            `;
        }).join("");

    const rowsHtml = filledCount === 0
        ? `<div class="rank-chart-empty">${t("personal.no-times")}</div>`
        : displayRanks.map(item =>
        {
            const percent = Math.round((item.count / filledCount) * 100);
            return `
            <div class="rank-chart-row" title="${formatRankLabel(item.rank)}: ${item.count}">
                <span class="rank-chart-badge" style="background: ${item.style.background}; color: ${item.style.color}; font-weight: ${item.style.fontWeight || "inherit"};">${item.rank}</span>
                <div class="rank-chart-track">
                    <span style="width: ${percent}%; background: ${item.style.background};"></span>
                </div>
                <span class="rank-chart-count">${item.count}</span>
            </div>
            `;
        }).join("");

    const pieChartSegments = filledCount === 0
        ? "repeating-linear-gradient(135deg, #2b2254 0 8px, #11092c 8px 16px)"
        : displayRanks.map((item, index) =>
        {
            const start = index === 0 ? 0 : displayRanks.slice(0, index).reduce((sum, previous) => sum + (previous.count / filledCount) * 100, 0);
            const end = start + (item.count / filledCount) * 100;
            const adjustedStart = Math.max(0, start - 0.1);
            const adjustedEnd = Math.min(100, end + 0.1);
            return `${item.style.background} ${adjustedStart.toFixed(2)}% ${adjustedEnd.toFixed(2)}%`;
        }).join(", ");

    const pieChartStyle = `background: ${filledCount === 0 ? "transparent" : `conic-gradient(${pieChartSegments})`};`;

    rankChart.innerHTML = `
    <div class="rank-chart-header">
        <div>
            <h2>${t("personal.rank-distribution")}</h2>
            <span>${filledCount}/${totalCount} ${t("personal.times-count")}</span>
        </div>
    </div>
    <div class="rank-chart-stack">${segmentsHtml}</div>
    <div class="rank-chart-stats">
        <div>
            <span>${t("personal.best")}</span>
            <strong>${topRank ? topRank.rank : "-"}</strong>
        </div>
        <div>
            <span>${t("personal.most")}</span>
            <strong>${mostCommonRank ? mostCommonRank.rank : "-"}</strong>
        </div>
    </div>
    <div class="rank-chart-list">
        ${rowsHtml}
    </div>
    `;

if (rankChartPie) {
    rankChartPie.innerHTML = filledCount === 0
        ? ""
        : `
        <div class="rank-chart-pie-wrapper">
            <div class="rank-chart-pie" style="${pieChartStyle}">
                <div class="rank-chart-pie-highlight"></div>
            </div>
            <div class="rank-chart-tooltip"></div>
        </div>
        `;

    if (filledCount > 0) {
        const pie = rankChartPie.querySelector(".rank-chart-pie");
        const highlight = rankChartPie.querySelector(".rank-chart-pie-highlight");
        const tooltip = rankChartPie.querySelector(".rank-chart-tooltip");

        const slices = [];
        let currentAngle = 0;
        let currentSliceIndex = -1;
        let cachedTooltipWidth = 0;

        displayRanks.forEach(item => {
            const sliceAngle = (item.count / filledCount) * 360;

            slices.push({
                start: currentAngle,
                end: currentAngle + sliceAngle,
                rank: formatRankLabel(item.rank),
                rankIndex: item.rankIndex,
                percent: Math.round((item.count / filledCount) * 100),
                color: item.style.background
            });

            currentAngle += sliceAngle;
        });

        highlight.style.position = "absolute";
        highlight.style.top = "0";
        highlight.style.left = "0";
        highlight.style.width = "100%";
        highlight.style.height = "100%";
        highlight.style.borderRadius = "50%";
        highlight.style.opacity = "0";
        highlight.style.transition = "opacity 0.2s ease, filter 0.2s ease, background 0.2s ease, transform 0.2s ease";
        highlight.style.pointerEvents = "none";

        pie.addEventListener("mouseenter", () => {
            pie.style.transition = "transform 0.2s ease, filter 0.2s ease";
        });

        pie.addEventListener("mousemove", e => {
            const rect = pie.getBoundingClientRect();

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > rect.width / 2) {
                tooltip.style.opacity = "0";
                return;
            }

            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            angle = (angle + 90 + 360) % 360;

            const slice = slices.find(
                s => angle >= s.start && angle < s.end
            );

            if (!slice) {
                tooltip.style.opacity = "0";
                highlight.style.opacity = "0";
                highlight.style.transform = "scale(1)";
                currentSliceIndex = -1;
                cachedTooltipWidth = 0;
                return;
            }

            const sliceIndex = slices.indexOf(slice);

            if (sliceIndex !== currentSliceIndex) {
                currentSliceIndex = sliceIndex;

                const brightness = getBrightness(slice.color);
                const tooltipBg = brightness > 128 ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.85)";
                const tooltipColor = brightness > 128 ? "#fff" : "#000";

                const entries = getPersonalTimeEntries();
                const matchingLevels = entries.filter(entry => {
                    if (entry.seconds === null) return false;
                    const rankIndex = getRankIndexForTime(entry.seconds, entry.level.times);
                    return rankIndex === slice.rankIndex;
                });

                const iconsHtml = matchingLevels.length > 0
                    ? matchingLevels.map(entry => {
                        const icon = entry.level.icon;
                        return icon ? `<img src="${icon}" class="tooltip-boss-icon" alt="">` : "";
                    }).join("")
                    : "";

                tooltip.innerHTML = `
                    <span style="color:${slice.color}">
                        ${slice.rank}
                    </span>
                    • ${slice.percent}%
                    <div class="tooltip-icons">${iconsHtml}</div>
                `;

                tooltip.style.background = tooltipBg;
                tooltip.style.color = tooltipColor;
                tooltip.style.width = "auto";
                tooltip.style.maxWidth = "calc(100vw - 40px)";
                tooltip.style.opacity = "0.9";

                const tooltipRect = tooltip.getBoundingClientRect();
                cachedTooltipWidth = tooltipRect.width;
                tooltip.style.width = `${cachedTooltipWidth}px`;
                tooltip.style.maxWidth = `${cachedTooltipWidth}px`;

                const highlightGradient = `conic-gradient(
                    transparent 0deg ${slice.start}deg,
                    ${slice.color} ${slice.start}deg ${slice.end}deg,
                    transparent ${slice.end}deg 360deg
                )`;
                highlight.style.background = highlightGradient;
                highlight.style.opacity = "1";
                highlight.style.filter = "brightness(1.1)";
                highlight.style.transform = "scale(1.05)";
            }

            tooltip.style.opacity = "1";

            tooltip.style.left = `${e.clientX}px`;
            tooltip.style.top = `${e.clientY}px`;
            tooltip.style.transform = `translate(-${cachedTooltipWidth + 12}px, 12px)`;
        });

        pie.addEventListener("mouseleave", () => {
            tooltip.style.opacity = "0";
            highlight.style.opacity = "0";
            highlight.style.transform = "scale(1)";
            currentSliceIndex = -1;
        });
    }
}
}

/**
 * Renders a placeholder table for categories without data
 */
function renderPlaceholderTable()
{
    table.innerHTML = `
    <div class="placeholder-table">
        <h2>${activeCategory.title}</h2>
        <p>${activeCategory.description}</p>
        <table>
            <thead>
                <tr>
                    <th>${t("personal.placeholder.section")}</th>
                    <th>${t("personal.placeholder.status")}</th>
                    <th>${t("personal.placeholder.times")}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${activeCategory.label}</td>
                    <td>${t("personal.placeholder.label")}</td>
                    <td>${t("personal.placeholder.coming")}</td>
                </tr>
            </tbody>
        </table>
    </div>
    `;
    totals.innerHTML = "";

    if (rankChart) {
        rankChart.innerHTML = "";
    }

    if (rankChartPie) {
        rankChartPie.innerHTML = "";
    }
}
