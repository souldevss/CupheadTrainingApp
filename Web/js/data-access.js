// Active category data accessors and totals calculations

/**
 * Gets the active category context for the current category and sub-option
 * @returns {Object} The current category data container
 */
function getActiveCategoryContext()
{
    if (!activeCategory) {
        return { data: null };
    }

    if (activeCategory.id === "DLC" && activeCategory.subOptions) {
        const subOption = activeCategory.subOptions.find(sub => sub.id === activeSubOption);
        return { data: subOption || activeCategory };
    }

    return { data: activeCategory };
}

/**
 * Gets the active islands data based on current category and sub-option
 * @returns {Array} Array of island objects with level data
 */
function getActiveIslands()
{
    const { data } = getActiveCategoryContext();
    return data?.islands || [];
}

function getActiveLevels()
{
    const { data } = getActiveCategoryContext();
    return data?.levels || getActiveIslands().flatMap(island => island.levels);
}

function getActiveLevelRankTotals()
{
    return ranks.map((_, rankIndex) =>
        roundTime(getActiveLevels().reduce((sum, level) => sum + (level.times?.[rankIndex] || 0), 0))
    );
}

/**
 * Gets the active residual times based on current category and sub-option
 * @returns {Array} Array of residual time values for each rank
 */
function getActiveResidual()
{
    const { data } = getActiveCategoryContext();
    return data?.residual || [];
}

function getResidualRankTimes()
{
    const residual = getActiveResidual();

    if (typeof residual === "number") {
        return generateRankTimes(residual, getActiveRankMultipliers());
    }

    if (residual && typeof residual === "object" && !Array.isArray(residual)) {
        const { fRankTime, wrTime } = residual;
        if (Number.isFinite(wrTime) && Number.isFinite(fRankTime)) {
            return generateRankTimes(fRankTime, { wrTime });
        }
        if (Number.isFinite(fRankTime)) {
            return generateRankTimes(fRankTime, getActiveRankMultipliers());
        }
    }

    return Array.isArray(residual) ? residual : [];
}

function getResidualTotal(rankIndex)
{
    const residualTimes = getResidualRankTimes();
    return residualTimes[rankIndex] || 0;
}

/**
 * Calculates the total time for an island at a specific rank
 * @param {number} islandIndex - Index of the island in active islands array
 * @param {number} rankIndex - Index of the rank to calculate for
 * @returns {number} Total time in seconds for all levels in the island at that rank
 */
function getIslandTotal(islandIndex, rankIndex)
{
    const multipliers = getActiveRankMultipliers();
    return getActiveIslands()[islandIndex].levels.reduce((sum, boss) => {
        // Generate times array from fRankTime if not already present
        if (!boss.times && boss.fRankTime) {
            boss.times = generateRankTimes(boss.fRankTime, multipliers);
        }
        return sum + (boss.times ? boss.times[rankIndex] : 0);
    }, 0);
}

/**
 * Calculates the sob (sum of best) time for a specific rank
 * Sob = sum of all island totals + residual for that rank
 * @param {number} rankIndex - The rank index to calculate for
 * @returns {number} The calculated sob time in seconds
 */
function getSobTotal(rankIndex)
{
    const islandsTotal = getActiveIslands().reduce(
        (sum, _, islandIndex) => sum + getIslandTotal(islandIndex, rankIndex),
        0
    );

    return roundTime(islandsTotal + getResidualTotal(rankIndex));
}

/**
 * Gets a level object by its flat index across all islands
 * @param {number} targetIndex - The flat index to search for
 * @returns {Object} The level object at the specified index
 */
function getLevelByFlatIndex(targetIndex)
{
    return getActiveLevels()[targetIndex] || getActiveLevels()[0];
}

/**
 * Gets the total number of levels across all active islands
 * @returns {number} Total level count
 */
function getTotalLevelCount()
{
    return getActiveLevels().length;
}

/**
 * Gets the rank multipliers for the current active category
 * @returns {Array} Array of multipliers for each rank
 */
function getActiveRankMultipliers()
{
    const { data } = getActiveCategoryContext();
    return data?.rankMultipliers || defaultRankMultipliers;
}

/**
 * Generates times arrays for all levels that only have fRankTime
 * This should be called before any rendering to ensure all levels have times data
 */
function generateAllLevelTimes()
{
    const multipliers = getActiveRankMultipliers();
    getActiveLevels().forEach(level => {
        if (!level.times && level.fRankTime) {
            level.times = generateRankTimes(level.fRankTime, {
                wrTime: level.wrTime,
                fallbackMultipliers: multipliers
            });
        }
    });
}
