// WR times fetching from alt.json and data updates

const WR_TIMES_CACHE_KEY = "cupheadWrTimesCache";
const WR_TIMES_CACHE_DURATION = 24 * 60 * 60 * 1000;

const BOSS_NAME_MAP = {
    "forestfollies": "Forest Follies",
    "therootpack": "The Root Pack",
    "ribbyandcroaks": "Ribby & Croaks",
    "goopylegrande": "Goopy Le Grande",
    "hildaberg": "Hilda Berg",
    "cagneycarnation": "Cagney Carnation",
    "baronessvonbonbon": "Baroness Von Bon Bon",
    "wallywarbles": "Wally Warbles",
    "djimmithegreat": "Djimmi The Great",
    "beppitheclown": "Beppi The Clown",
    "grimmatchstick": "Grim Matchstick",
    "rumorhoneybottoms": "Rumor Honeybottoms",
    "drkahlsrobot": "Dr. Kahl's Robot",
    "sallystageplay": "Sally Stageplay",
    "wernerwerman": "Werner Werman",
    "captainbrineybeard": "Captain Brineybeard",
    "calamaria": "Cala Maria",
    "phantomexpress": "Phantom Express",
    "kingdice": "King Dice",
    "thedevil": "The Devil",
    "glumstonethegiant": "Glumstone The Giant",
    "mortimerfreeze": "Mortimer Freeze",
    "thehowlingaces": "The Howling Aces",
    "estherwinchester": "Esther Winchester",
    "moonshinemob": "Moonshine Mob",
    "chefsaltbaker": "Chef Saltbaker",
    "mausoleum": "Mausoleum"
};

/**
 * Fetches WR times from myekul.com and updates the data structure
 * Caches results in localStorage to avoid excessive fetching
 */
async function fetchAndUpdateWrTimes()
{
    try {
        const cached = localStorage.getItem(WR_TIMES_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < WR_TIMES_CACHE_DURATION) {
                console.log("Using cached WR times");
                updateWrTimesInData(data);
                return data;
            }
        }
    } catch (e) {
        console.error("Error reading cache:", e);
    }

    try {
        const response = await fetch("https://myekul.com/run-recap/resources/alt.json");
        if (!response.ok) {
            console.error("Failed to fetch WR times:", response.status);
            return;
        }

        const data = await response.json();

        console.log("Fetched WR data:", data);

        localStorage.setItem(WR_TIMES_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));

        console.log("Fetched and cached WR times");
        updateWrTimesInData(data);
        return data;
    } catch (error) {
        console.error("Error fetching WR times:", error);
    }
}

/**
 * Finds the fastest WR time from a boss strategy list in alt.json
 * @param {Array} strategies - Strategy entries for a boss
 * @returns {{ time: number, url: string|null, player: string|null }|null} Best entry or null
 */
function getBestWrTimeFromStrategies(strategies)
{
    let best = null;

    for (const strategy of strategies) {
        if (!strategy.time || strategy.title) continue;

        const time = parseTime(String(strategy.time));
        if (time !== null && (best === null || time < best.time)) {
            best = {
                time,
                url: strategy.url || null,
                player: strategy.player || null
            };
        }
    }

    return best;
}

/**
 * Updates the data structure with fetched WR times
 * @param {Object} wrData - The fetched alt.json data
 */
function updateWrTimesInData(wrData)
{
    if (wrData["1.1+"]) {
        updateCategoryTimes("1-1", wrData["1.1+"], BOSS_NAME_MAP);
    }

    if (wrData["DLC L/S"]) {
        updateCategoryTimes("DLC", wrData["DLC L/S"], BOSS_NAME_MAP, "lobber");
    }

    if (wrData["DLC C/S"]) {
        // Some bosses (Forest Follies, Mausoleum, Esther Winchester) don't have
        // Charge-specific entries in alt.json. Fall back to Lobber data for them.
        const chargeData = wrData["DLC C/S"];
        const lobberFallback = wrData["DLC L/S"] || {};
        const mergedData = { ...lobberFallback, ...chargeData };
        updateCategoryTimes("DLC", mergedData, BOSS_NAME_MAP, "charge");
    }

    // Calculate fallback rank multipliers based on WR/F ratio after updating times
    calculateRankMultipliers();
}

/**
 * Calculates rank multipliers for a specific category based on WR/F ratios
 * @param {Object} categoryData - The category object with islands data
 * @returns {Array} Array of multipliers for each rank
 */
function calculateCategoryMultipliers(categoryData)
{
    let wrToFratios = [];

    // Collect WR/F ratios from all levels using original fRankTime values
    if (categoryData.islands) {
        categoryData.islands.forEach(island => {
            island.levels.forEach(level => {
                if (level.fRankTime && level.times && level.times.length >= 19) {
                    const wrTime = Number.isFinite(level.wrTime) ? level.wrTime : level.times[0];
                    const fRankTime = level.fRankTime;
                    if (wrTime > 0 && fRankTime > 0) {
                        wrToFratios.push(wrTime / fRankTime);
                    }
                }
            });
        });
    }

    // Calculate average WR/F ratio
    if (wrToFratios.length === 0) return null;

    const avgRatio = wrToFratios.reduce((sum, ratio) => sum + ratio, 0) / wrToFratios.length;

    // Generate fallback multipliers from the average WR/F ratio.
    // Individual levels with a fetched WR are still anchored to their own WR.
    const multipliers = createRankMultipliers(avgRatio);

    return multipliers;
}

/**
 * Calculates rank multipliers for all categories based on the ratio between WR and F rank times
 * This allows dynamic interpolation of intermediate ranks per category
 */
function calculateRankMultipliers()
{
    // Calculate multipliers for 1.1+ category
    const category11 = categories.find(cat => cat.id === "1-1");
    if (category11 && category11.islands) {
        const multipliers = calculateCategoryMultipliers(category11);
        if (multipliers) {
            category11.rankMultipliers = multipliers;
            console.log("Calculated 1.1+ rank multipliers:", multipliers);
            // Regenerate times for 1.1+ with new multipliers
            regenerateCategoryTimes(category11, multipliers);
        }
    }

    // Calculate multipliers for DLC sub-options
    const dlcCategory = categories.find(cat => cat.id === "DLC");
    if (dlcCategory && dlcCategory.subOptions) {
        dlcCategory.subOptions.forEach(subOption => {
            if (subOption.islands) {
                const multipliers = calculateCategoryMultipliers(subOption);
                if (multipliers) {
                    subOption.rankMultipliers = multipliers;
                    console.log(`Calculated ${subOption.id} rank multipliers:`, multipliers);
                    // Regenerate times for this sub-option with new fallback multipliers
                    regenerateCategoryTimes(subOption, multipliers);
                }
            }
        });
    }
}

/**
 * Regenerates times arrays for a category using new multipliers
 * @param {Object} categoryData - The category object with islands data
 * @param {Array} multipliers - The new multipliers to use
 */
function regenerateCategoryTimes(categoryData, multipliers)
{
    if (categoryData.islands) {
        categoryData.islands.forEach(island => {
            island.levels.forEach(level => {
                if (level.fRankTime) {
                    level.times = generateRankTimes(level.fRankTime, {
                        wrTime: level.wrTime,
                        fallbackMultipliers: multipliers
                    });
                }
            });
        });
    }
}

/**
 * Updates times for a specific category
 * @param {string} categoryId - The category ID to update
 * @param {Object} categoryData - The WR data for this category
 * @param {Object} bossNameMap - Mapping of JSON boss names to data.js names
 * @param {string|null} subOptionId - Optional DLC sub-option id (lobber/charge)
 */
function updateCategoryTimes(categoryId, categoryData, bossNameMap, subOptionId = null)
{
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const targets = [];

    if (subOptionId && category.subOptions) {
        const subOption = category.subOptions.find(sub => sub.id === subOptionId);
        if (subOption?.islands) {
            targets.push(subOption);
        }
    } else if (category.islands) {
        targets.push(category);
    }

    targets.forEach(target => {
        let oldWrSum = 0;
        let newWrSum = 0;
        let updatedLevelCount = 0;

        target.islands.forEach(island => {
            island.levels.forEach(level => {
                const jsonBossKey = Object.keys(bossNameMap).find(key =>
                    bossNameMap[key].toLowerCase() === level.name.toLowerCase()
                );

                if (!jsonBossKey || !categoryData[jsonBossKey]) return;

                const wrEntry = getBestWrTimeFromStrategies(categoryData[jsonBossKey]);
                if (wrEntry === null) return;

                const wrTime = wrEntry.time;

                if (!level.times && level.fRankTime) {
                    level.times = generateRankTimes(level.fRankTime);
                }

                if (!level.times || level.times.length === 0) return;

                const oldWr = Number.isFinite(level.wrTime) ? level.wrTime : level.times[0];
                level.wrTime = wrTime;
                level.wrUrl = wrEntry.url;
                level.wrPlayer = wrEntry.player;
                level.times = generateRankTimes(level.fRankTime || level.times[level.times.length - 1], {
                    wrTime
                });
                oldWrSum += oldWr;
                newWrSum += wrTime;
                updatedLevelCount++;
            });
        });

        if (updatedLevelCount > 0 && oldWrSum > 0) {
            const totalRatio = newWrSum / oldWrSum;

            if (typeof target.residual === 'number') {
                target.residual = roundTime(target.residual * totalRatio);
            } else if (target.residual && typeof target.residual === 'object' && !Array.isArray(target.residual)) {
                // Object residuals have calibrated wrTime/fRankTime values that should NOT be scaled.
                // They represent independent measurements, not sums derived from boss times.
            } else if (target.residual?.length) {
                target.residual = target.residual.map(time =>
                    roundTime(time * totalRatio)
                );
            }

        }
    });
}
