function getPersonalTimeEntries() {
  const storedTimes = getStoredPersonalTimes(), currentTable = document.getElementById("table");
  return (currentTable ? [...currentTable.querySelectorAll(".time-input, [data-auto-time]")] : []).map((input) => {
    const levelIndex = Number(input.dataset.levelIndex ?? input.dataset.autoTime ?? 0), level = getLevelByFlatIndex(levelIndex), value = input.classList.contains("time-input") ? input.value.trim() : "", autoSeconds = input.dataset.autoTime !== void 0 && Number.isFinite(window.cupheadAutoTimes?.[levelIndex]) ? window.cupheadAutoTimes[levelIndex] : null, seconds = window.autoTrainingPage ? autoSeconds : autoSeconds !== null ? autoSeconds : value ? parseTime(value) : parseTime(storedTimes[input.id] || "");
    return level && !level.times && level.fRankTime && (level.times = generateRankTimes(level.fRankTime, {
      wrTime: level.wrTime,
      fallbackMultipliers: getActiveRankMultipliers()
    })), {
      input,
      level,
      seconds
    };
  }).filter((entry) => entry.level);
}
function getPersonalTotalsData() {
  const entries = getPersonalTimeEntries(), islandRows = [];
  let entryIndex = 0;
  getActiveIslands().forEach((island, islandIndex) => {
    const values = island.levels.map(() => {
      const entry = entries[entryIndex++];
      return entry ? entry.seconds : null;
    }), hasAllTimes = values.every((value) => value !== null);
    islandRows.push({
      name: island.name,
      total: hasAllTimes ? values.reduce((sum, value) => sum + value, 0) : null,
      thresholds: ranks.map((_, rankIndex) => getIslandTotal(islandIndex, rankIndex))
    });
  });
  const averageRankIndex = getAverageRankIndex(), residualArray = getResidualRankTimes();
  residualArray.length > 0 && averageRankIndex !== null ? islandRows.push({
    name: "Residual",
    total: residualArray[averageRankIndex],
    thresholds: residualArray
  }) : residualArray.length > 0 && islandRows.push({
    name: "Residual",
    total: residualArray[0],
    thresholds: residualArray
  });
  const levelRows = islandRows.filter((row) => row.name !== "Residual"), hasAllLevelRows = levelRows.every((row) => row.total !== null), residualRow = islandRows.find((row) => row.name === "Residual"), residualTotal = residualRow ? residualRow.total : 0, sobThresholds = ranks.map((_, rankIndex) => getSobTotal(rankIndex));
  return islandRows.push({
    name: "Sob",
    total: hasAllLevelRows ? levelRows.reduce((sum, row) => sum + row.total, residualTotal) : null,
    thresholds: sobThresholds
  }), islandRows;
}
function getAverageRankIndex() {
  const rankIndices = [];
  if (getPersonalTimeEntries().forEach((entry) => {
    if (entry.seconds === null) return;
    const rankIndex = getRankIndexForTime(entry.seconds, entry.level.times);
    rankIndices.push(rankIndex);
  }), rankIndices.length === 0) return null;
  const sum = rankIndices.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / rankIndices.length);
}
function getPersonalRankDistribution() {
  const counts = ranks.map((rank, rankIndex) => ({
    rank,
    rankIndex,
    count: 0,
    style: getRankStyle(rankIndex)
  }));
  return getPersonalTimeEntries().forEach((entry) => {
    if (entry.seconds === null) return;
    const rankIndex = getRankIndexForTime(entry.seconds, entry.level.times);
    counts[rankIndex].count++;
  }), counts;
}
