// WR times fetching from alt.json and data updates

const WR_TIMES_CACHE_KEY = "cupheadRunViableTimesCache";
const WR_TIMES_CACHE_DURATION = 24 * 60 * 60 * 1000;

// runViable.json omits these entries. Keep the chosen references from alt.json
// explicit so cached/network records cannot replace the intended strategies.
const TABLE_REFERENCES_BY_VERSION = {
    "1.1+": {
        forestfollies: { time: 32.63, ILs: [{ name: "SBDWolf", url: "https://www.youtube.com/live/13ZSnTYvuGA?t=7173" }] }
    },
    "DLC": {
        forestfollies: { time: 33.27, ILs: [{ name: "GamerAttack27", url: "https://youtu.be/q6M5TBPLKps" }] },
        mausoleum: { time: 47.26, ILs: [{ name: "ExclamationMarkYT", url: "https://youtu.be/ro73lUU8jjQ" }] }
    }
};

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

// Exact times transcribed from linked Run Viable IL YouTube titles. Update
// these manually when those videos or the curated records change. Times are seconds.
const RUN_VIABLE_EXACT_TIMES = {
    "1.1+": {
        therootpack: 33.76,
        ribbyandcroaks: 40.79,
        goopylegrande: 21.21,
        hildaberg: 59.55,
        cagneycarnation: 29.81,
        baronessvonbonbon: 30.57,
        wallywarbles: 46.44,
        djimmithegreat: 74.96,
        beppitheclown: 37.91,
        grimmatchstick: 45.89,
        rumorhoneybottoms: 36.58,
        drkahlsrobot: 40.90,
        sallystageplay: 43.69,
        wernerwerman: 35.96,
        captainbrineybeard: 36.52,
        calamaria: 48.80,
        phantomexpress: 56.64,
        kingdice: 102.82,
        thedevil: 38.95
    },
    "DLC L/S": {
        glumstonethegiant: 45.66,
        mortimerfreeze: 40.45,
        thehowlingaces: 43.63,
        estherwinchester: 59.72,
        moonshinemob: 35.26,
        chefsaltbaker: 49.74
    },
    "DLC C/S": {
        glumstonethegiant: 47.15,
        mortimerfreeze: 38.70,
        thehowlingaces: 42.97,
        estherwinchester: 59.72,
        moonshinemob: 37.01,
        chefsaltbaker: 49.84
    }
};

const RUN_VIABLE_EXACT_TIME_VIDEO_IDS = {
    "1.1+": {
        therootpack: "UHC70HUdFjU",
        ribbyandcroaks: "-KvAjbtm56E",
        goopylegrande: "BGVRjK4zdFk",
        hildaberg: "PThx8scpvck",
        cagneycarnation: "l8oRg_H0yUM",
        baronessvonbonbon: "TxaWkOJgapQ",
        wallywarbles: "yP0lTtLRPzU",
        djimmithegreat: "35_5D9qWfLA",
        beppitheclown: "moBcYR2UqgQ",
        grimmatchstick: "wADPxhZkybg",
        rumorhoneybottoms: "7ffiWjfmSP4",
        drkahlsrobot: "X-3BKVEpcU4",
        sallystageplay: "OHhH3Wruraw",
        wernerwerman: "O16oNulllw0",
        captainbrineybeard: "1tJDk7gscp8",
        calamaria: "zPS6SYQGj1Q",
        phantomexpress: "cNlgq_i0x_c",
        kingdice: "UguybSEYODk",
        thedevil: "zLmqauewKEE"
    },
    "DLC L/S": {
        glumstonethegiant: "tuotj9TXeKs",
        mortimerfreeze: "oNAaIL4D73s",
        thehowlingaces: "uf0yhInpcW8",
        estherwinchester: "4nrjrwTZHw8",
        moonshinemob: "zQ7bGN1IDfw",
        chefsaltbaker: "N18iuwnwrDg"
    },
    "DLC C/S": {
        glumstonethegiant: "e3hJNxOG_mQ",
        mortimerfreeze: "UFkbukR0C6g",
        thehowlingaces: "dqqT2n-83cw",
        estherwinchester: "4nrjrwTZHw8",
        moonshinemob: "UCLkF-T0jUo",
        chefsaltbaker: "ZTuyj3HYtNw"
    }
};

/**
 * Fetches curated run-viable IL times from myekul.com and updates the data structure
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
        const response = await fetch("https://myekul.com/run-recap/resources/runViable.json");
        if (!response.ok) {
            console.error("Failed to fetch WR times:", response.status);
            return;
        }

        const data = await response.json();

        console.log("Fetched run-viable IL data:", data);

        localStorage.setItem(WR_TIMES_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));

        console.log("Fetched and cached run-viable IL times");
        updateWrTimesInData(data);
        return data;
    } catch (error) {
        console.error("Error fetching WR times:", error);
    }
}

/**
 * Reads a boss's curated run-viable record from runViable.json.
 * @param {Object} runViableBoss - Run-viable time and IL references for a boss
 * @returns {{ time: number, url: string|null, player: string|null }|null} Best entry or null
 */
function getRunViableTime(runViableBoss, exactTimeOverride, exactVideoId)
{
    const time = Number.isFinite(exactTimeOverride)
        ? exactTimeOverride
        : Number(runViableBoss?.time);
    if (!Number.isFinite(time) || time <= 0) return null;

    const representativeIL = exactVideoId
        ? runViableBoss.ILs?.find(il => il.url?.includes(exactVideoId))
        : null;
    const bestIL = representativeIL || runViableBoss.ILs?.[0];
    return {
        time,
        url: bestIL?.url || null,
        player: bestIL?.name?.replace(/^\*/, "") || null
    };
}

/**
 * Updates the data structure with fetched WR times
 * @param {Object} wrData - The fetched runViable.json data
 */
function updateWrTimesInData(wrData)
{
    if (wrData["1.1+"]) {
        updateCategoryTimes("1-1", { ...wrData["1.1+"], ...TABLE_REFERENCES_BY_VERSION["1.1+"] }, BOSS_NAME_MAP, null,
            RUN_VIABLE_EXACT_TIMES["1.1+"], RUN_VIABLE_EXACT_TIME_VIDEO_IDS["1.1+"]);
    }

    if (wrData["DLC L/S"]) {
        updateCategoryTimes("DLC", { ...wrData["DLC L/S"], ...TABLE_REFERENCES_BY_VERSION.DLC }, BOSS_NAME_MAP, "lobber",
            RUN_VIABLE_EXACT_TIMES["DLC L/S"], RUN_VIABLE_EXACT_TIME_VIDEO_IDS["DLC L/S"]);
    }

    if (wrData["DLC C/S"]) {
        // Some bosses don't have charge-specific entries. Fall back to Lobber data.
        const chargeData = wrData["DLC C/S"];
        const lobberFallback = wrData["DLC L/S"] || {};
        const mergedData = { ...lobberFallback, ...chargeData, ...TABLE_REFERENCES_BY_VERSION.DLC };
        updateCategoryTimes("DLC", mergedData, BOSS_NAME_MAP, "charge", {
            ...RUN_VIABLE_EXACT_TIMES["DLC L/S"],
            ...RUN_VIABLE_EXACT_TIMES["DLC C/S"]
        }, {
            ...RUN_VIABLE_EXACT_TIME_VIDEO_IDS["DLC L/S"],
            ...RUN_VIABLE_EXACT_TIME_VIDEO_IDS["DLC C/S"]
        });
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
    const levels = categoryData.levels || categoryData.islands?.flatMap(island => island.levels) || [];
    levels.forEach(level => {
        if (level.fRankTime && level.times && level.times.length >= 19) {
            const wrTime = Number.isFinite(level.wrTime) ? level.wrTime : level.times[0];
            const fRankTime = level.fRankTime;
            if (wrTime > 0 && fRankTime > 0) {
                wrToFratios.push(wrTime / fRankTime);
            }
        }
    });

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
    const levels = categoryData.levels || categoryData.islands?.flatMap(island => island.levels) || [];
    levels.forEach(level => {
        if (level.fRankTime) {
            level.times = generateRankTimes(level.fRankTime, {
                wrTime: level.wrTime,
                fallbackMultipliers: multipliers
            });
        }
    });
}

/**
 * Updates times for a specific category
 * @param {string} categoryId - The category ID to update
 * @param {Object} categoryData - The WR data for this category
 * @param {Object} bossNameMap - Mapping of JSON boss names to data.js names
 * @param {string|null} subOptionId - Optional DLC sub-option id (lobber/charge)
 */
function updateCategoryTimes(categoryId, categoryData, bossNameMap, subOptionId = null, exactTimes = null, exactVideoIds = null)
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

                const wrEntry = getRunViableTime(
                    categoryData[jsonBossKey],
                    exactTimes?.[jsonBossKey],
                    exactVideoIds?.[jsonBossKey]
                );
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
