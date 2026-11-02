// Personal totals and rank distribution calculations

/**
 * Calculates personal totals data including island times, residual, and sob
 * Residual is based on the user's average rank across all levels
 * @returns {Array} Array of row objects with name, total, and thresholds
 */
function getPersonalTimeEntries()
{
    const storedTimes = getStoredPersonalTimes();
    const currentTable = document.getElementById("table");
    const inputs = currentTable ? [...currentTable.querySelectorAll(".time-input, [data-auto-time]")] : [];

    return inputs.map(input =>
    {
        const levelIndex = Number(input.dataset.levelIndex ?? input.dataset.autoTime ?? 0);
        const level = getLevelByFlatIndex(levelIndex);
        const value = input.classList.contains("time-input") ? input.value.trim() : "";
        const autoSeconds = input.dataset.autoTime !== undefined
            ? (Number.isFinite(window.cupheadAutoTimes?.[levelIndex]) ? window.cupheadAutoTimes[levelIndex] : null)
            : null;
        const seconds = autoSeconds !== null ? autoSeconds : value ? parseTime(value) : parseTime(storedTimes[input.id] || "");

        // Generate times array from fRankTime if not already present
        if (level && !level.times && level.fRankTime) {
            level.times = generateRankTimes(level.fRankTime, {
                wrTime: level.wrTime,
                fallbackMultipliers: getActiveRankMultipliers()
            });
        }

        return {
            input,
            level,
            seconds
        };
    }).filter(entry => entry.level);
}

function getPersonalTotalsData()
{
    const entries = getPersonalTimeEntries();
    const islandRows = [];
    let entryIndex = 0;

    getActiveIslands().forEach((island, islandIndex) =>
    {
        const values = island.levels.map(() =>
        {
            const entry = entries[entryIndex++];
            return entry ? entry.seconds : null;
        });
        const hasAllTimes = values.every(value => value !== null);

        islandRows.push({
            name: island.name,
            total: hasAllTimes ? values.reduce((sum, value) => sum + value, 0) : null,
            thresholds: ranks.map((_, rankIndex) => getIslandTotal(islandIndex, rankIndex))
        });
    });

    const averageRankIndex = getAverageRankIndex();
    const residualArray = getResidualRankTimes();

    if (residualArray.length > 0 && averageRankIndex !== null) {
        islandRows.push({
            name: "Residual",
            total: residualArray[averageRankIndex],
            thresholds: residualArray
        });
    } else if (residualArray.length > 0) {
        islandRows.push({
            name: "Residual",
            total: residualArray[0],
            thresholds: residualArray
        });
    }

    const levelRows = islandRows.filter(row => row.name !== "Residual");
    const hasAllLevelRows = levelRows.every(row => row.total !== null);
    const residualRow = islandRows.find(row => row.name === "Residual");
    const residualTotal = residualRow ? residualRow.total : 0;
    const sobThresholds = ranks.map((_, rankIndex) => getSobTotal(rankIndex));

    islandRows.push({
        name: "Sob",
        total: hasAllLevelRows ? levelRows.reduce((sum, row) => sum + row.total, residualTotal) : null,
        thresholds: sobThresholds
    });

    return islandRows;
}

/**
 * Calculates the average rank index from all user's personal times
 * Used to determine which residual time to use
 * @returns {number|null} Average rank index (0-18) or null if no times entered
 */
function getAverageRankIndex()
{
    const rankIndices = [];

    getPersonalTimeEntries().forEach(entry =>
    {
        if (entry.seconds === null) return;

        const rankIndex = getRankIndexForTime(entry.seconds, entry.level.times);
        rankIndices.push(rankIndex);
    });

    if (rankIndices.length === 0) return null;

    const sum = rankIndices.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / rankIndices.length);
}

/**
 * Calculates the distribution of ranks across all user's personal times
 * @returns {Array} Array of rank objects with count and style information
 */
function getPersonalRankDistribution()
{
    const counts = ranks.map((rank, rankIndex) => ({
        rank,
        rankIndex,
        count: 0,
        style: getRankStyle(rankIndex)
    }));

    getPersonalTimeEntries().forEach(entry =>
    {
        if (entry.seconds === null) return;

        const rankIndex = getRankIndexForTime(entry.seconds, entry.level.times);
        counts[rankIndex].count++;
    });

    return counts;
}
