// Myekul's Vanilla ILs snapshot (times in seconds).
// https://myekul.com/run-recap/resources/vanilla.json
// Forest Follies and Mausoleum keep their version-specific references in data.js.
const WR_REFERENCES = {
    "1-1": {
        "The Root Pack": [34.01, "Rayted", "https://youtu.be/z7ep_y600FA"],
        "Ribby & Croaks": [41.68, "Quincely0", "https://youtu.be/P4LDAalU78s"],
        "Goopy Le Grande": [21.63, "myekul", "https://youtu.be/OPcRQy3nDU4?t=33"],
        "Hilda Berg": [59, "Grondious", "https://youtu.be/9HRw4AUIsO4?t=47"],
        "Cagney Carnation": [32.47, "SBDWolf", "https://youtu.be/tfEUte2Da4s?t=10448"],
        "Baroness Von Bon Bon": [31.5, "Quincely0", "https://youtu.be/NgR0aLzuT6g"],
        "Wally Warbles": [46.82, "SBDWolf", "https://youtu.be/5ZmciUW-3xA?t=4792"],
        "Djimmi The Great": [76.44, "SBDWolf", "https://youtu.be/13ZSnTYvuGA?t=14467"],
        "Beppi The Clown": [39.87, "Quincely0", "https://www.twitch.tv/videos/2811006787?t=00h00m38s"],
        "Grim Matchstick": [46.91, "Quincely0", "https://youtu.be/vo1yZkUN29U"],
        "Rumor Honeybottoms": [38.46, "GamerAttack27", "https://youtu.be/SMbBPbD8dw8?t=1007"],
        "Dr. Kahl's Robot": [40.8, "lewzr", "https://www.twitch.tv/lewzr__/clip/TenaciousTallPicklesANELE-JQIc1MZ2FLA3ZBaz"],
        "Sally Stageplay": [45.55, "SBDWolf", "https://youtu.be/ICvTJwh-km0?&t=6739"],
        "Werner Werman": [35.93, "Myekul", "https://www.youtube.com/watch?v=YFxJIWKmoOM"],
        "Captain Brineybeard": [36.9, "SBDWolf", "https://youtu.be/g0cez6yFqn8?t=4149"],
        "Cala Maria": [51, "Quincely0", "https://www.twitch.tv/videos/2627472807?t=00h00m43s"],
        "Phantom Express": [57.77, "SBDWolf", "https://youtu.be/93DiDn9VsVI?t=16585"],
        "King Dice": [105.11, "SBDWolf", "https://youtu.be/93DiDn9VsVI?t=11759"],
        "The Devil": [40.57, "myekul", "https://youtu.be/BUkJ2Kv2-Lc"],
    },
    "lobber": {
        "Esther Winchester": [60.04, "MarkinSws", "https://youtu.be/SKxj-gOE_E4?t=33"],
        // Existing Run Viable references for splits missing from Vanilla ILs.
        "Glumstone The Giant": [45.66, "GamerAttack27", "https://youtu.be/tuotj9TXeKs"],
        "Mortimer Freeze": [40.45, "lewzr", "https://youtu.be/oNAaIL4D73s"],
        "The Howling Aces": [43.63, "MarkinSws", "https://youtu.be/uf0yhInpcW8"],
        "Moonshine Mob": [35.26, "ExclamationMarkYT", "https://youtu.be/zQ7bGN1IDfw"],
        "Chef Saltbaker": [49.74, "ExclamationMarkYT", "https://youtu.be/N18iuwnwrDg"],
    },
    "charge": {
        "Glumstone The Giant": [47.15, "myekul", "https://youtu.be/e3hJNxOG_mQ"],
        "Mortimer Freeze": [38.47, "myekul", "https://youtu.be/hYkCoXfQwM8?t=317"],
        "The Howling Aces": [42.97, "myekul", "https://youtu.be/dqqT2n-83cw?t=30"],
        "Moonshine Mob": [37.66, "myekul", "https://youtu.be/UCLkF-T0jUo?t=30"],
        "Chef Saltbaker": [50.29, "DaniStuff2345", "https://youtu.be/e47OFe39QLA"],
        // Existing Run Viable references for splits missing from Vanilla ILs.
        "Esther Winchester": [59.72, "MarkinSws", "https://youtu.be/4nrjrwTZHw8"],
    },
};

function updateReferenceTimes()
{
    for (const category of categories) {
        for (const route of category.subOptions || [category]) {
            const records = WR_REFERENCES[route.id];
            for (const level of route.islands.flatMap(island => island.levels)) {
                const record = records?.[level.name];
                if (record) [level.wrTime, level.wrPlayer, level.wrUrl] = record;
                level.times = generateRankTimes(level.fRankTime, { wrTime: level.wrTime });
            }
        }
    }

    refreshDeveloperRankOverrides();
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

    // Collect WR/F ratios from all levels using the current F-rank targets
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
    // Individual levels with a reference time are still anchored to their own WR.
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
