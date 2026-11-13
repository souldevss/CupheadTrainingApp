function getActiveCategoryContext() {
  return activeCategory ? activeCategory.id === "DLC" && activeCategory.subOptions ? { data: activeCategory.subOptions.find((sub) => sub.id === activeSubOption) || activeCategory } : { data: activeCategory } : { data: null };
}
function getActiveIslands() {
  const { data } = getActiveCategoryContext();
  return data?.islands || [];
}
function getActiveLevels() {
  const { data } = getActiveCategoryContext();
  return data?.levels || getActiveIslands().flatMap((island) => island.levels);
}
function getActiveResidual() {
  const { data } = getActiveCategoryContext();
  return data?.residual || [];
}
function getResidualRankTimes() {
  const residual = getActiveResidual();
  if (typeof residual == "number")
    return generateRankTimes(residual, getActiveRankMultipliers());
  if (residual && typeof residual == "object" && !Array.isArray(residual)) {
    const { fRankTime, wrTime } = residual;
    if (Number.isFinite(wrTime) && Number.isFinite(fRankTime))
      return generateRankTimes(fRankTime, { wrTime });
    if (Number.isFinite(fRankTime))
      return generateRankTimes(fRankTime, getActiveRankMultipliers());
  }
  return Array.isArray(residual) ? residual : [];
}
function getResidualTotal(rankIndex) {
  return getResidualRankTimes()[rankIndex] || 0;
}
function getIslandTotal(islandIndex, rankIndex) {
  const multipliers = getActiveRankMultipliers();
  return getActiveIslands()[islandIndex].levels.reduce((sum, boss) => (!boss.times && boss.fRankTime && (boss.times = generateRankTimes(boss.fRankTime, multipliers)), sum + (boss.times ? boss.times[rankIndex] : 0)), 0);
}
function getSobTotal(rankIndex) {
  const islandsTotal = getActiveIslands().reduce(
    (sum, _, islandIndex) => sum + getIslandTotal(islandIndex, rankIndex),
    0
  );
  return roundTime(islandsTotal + getResidualTotal(rankIndex));
}
function getLevelByFlatIndex(targetIndex) {
  return getActiveLevels()[targetIndex] || getActiveLevels()[0];
}
function getTotalLevelCount() {
  return getActiveLevels().length;
}
function getActiveRankMultipliers() {
  const { data } = getActiveCategoryContext();
  return data?.rankMultipliers || defaultRankMultipliers;
}
function generateAllLevelTimes() {
  const multipliers = getActiveRankMultipliers();
  getActiveLevels().forEach((level) => {
    !level.times && level.fRankTime && (level.times = generateRankTimes(level.fRankTime, {
      wrTime: level.wrTime,
      fallbackMultipliers: multipliers
    }));
  });
}
