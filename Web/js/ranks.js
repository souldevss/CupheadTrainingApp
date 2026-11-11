function getRankIndexForTime(seconds, thresholds) {
  const rankIndex = thresholds.findIndex((threshold) => seconds <= threshold);
  return rankIndex === -1 ? ranks.length - 1 : rankIndex;
}
function getRankStyle(rankIndex) {
  return ranksStyles[rankIndex] || { background: "transparent", color: "#ffffff" };
}
function getPersonalRankStyle(rankIndex) {
  return rankIndex === null ? {
    background: "#11092c",
    color: "#ffffff"
  } : getRankStyle(rankIndex);
}
function getLuminance(hexColor) {
  const c = hexColor.replace("#", ""), r = parseInt(c.substring(0, 2), 16) / 255, g = parseInt(c.substring(2, 4), 16) / 255, b = parseInt(c.substring(4, 6), 16) / 255, linearR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4), linearG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4), linearB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}
function interpolateColor(color1, color2, factor) {
  const c1 = color1.replace("#", ""), c2 = color2.replace("#", ""), r1 = parseInt(c1.substring(0, 2), 16), g1 = parseInt(c1.substring(2, 4), 16), b1 = parseInt(c1.substring(4, 6), 16), r2 = parseInt(c2.substring(0, 2), 16), g2 = parseInt(c2.substring(2, 4), 16), b2 = parseInt(c2.substring(4, 6), 16), r = Math.round(r1 + (r2 - r1) * factor), g = Math.round(g1 + (g2 - g1) * factor), b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function getInterpolatedRankStyle(seconds, thresholds) {
  if (seconds === null)
    return {
      background: "#11092c",
      color: "#ffffff"
    };
  const rankIndex = thresholds.findIndex((threshold) => seconds <= threshold), currentRankIndex = rankIndex === -1 ? ranks.length - 1 : rankIndex;
  if (currentRankIndex === 0 && seconds <= thresholds[0])
    return getRankStyle(0);
  if (currentRankIndex === ranks.length - 1)
    return getRankStyle(ranks.length - 1);
  const currentThreshold = thresholds[currentRankIndex], range = thresholds[currentRankIndex - 1] - currentThreshold, position = seconds - currentThreshold, factor = range === 0 ? 0 : Math.max(0, Math.min(1, position / range)), currentStyle = getRankStyle(currentRankIndex), previousStyle = getRankStyle(currentRankIndex - 1), interpolatedBackground = interpolateColor(
    currentStyle.background || "#000000",
    previousStyle.background || "#000000",
    factor
  ), interpolatedTextColor = interpolateColor(
    currentStyle.color || "#ffffff",
    previousStyle.color || "#ffffff",
    factor
  );
  return {
    background: interpolatedBackground,
    color: interpolatedTextColor,
    ...currentRankIndex === 1 ? { fontWeight: "900" } : {}
  };
}
function syncAllPersonalRanks() {
  table.querySelectorAll(".time-input").forEach(syncPersonalRank);
}
function syncPersonalRank(input) {
  const level = getLevelByFlatIndex(Number(input.dataset.levelIndex)), wrapper = table.querySelector(`[data-time-wrapper="${input.dataset.levelIndex}"]`), rankOutput = table.querySelector(`[data-rank-output="${input.dataset.levelIndex}"]`), seconds = parseTime(input.value);
  if (!wrapper || !rankOutput) {
    console.error("Wrapper or rank output not found for level index:", input.dataset.levelIndex);
    return;
  }
  const style = seconds === null ? getPersonalRankStyle(null) : getInterpolatedRankStyle(seconds, level.times), rankIndex = seconds === null ? null : getRankIndexForTime(seconds, level.times);
  rankOutput.textContent = rankIndex === null ? "-" : ranks[rankIndex], rankOutput.classList.toggle("personal-rank-empty", rankIndex === null), rankOutput.style.background = style.background, rankOutput.style.color = style.color, rankOutput.style.fontWeight = style.fontWeight || "", seconds !== null ? (wrapper.style.setProperty("background", style.background, "important"), input.style.setProperty("color", style.color, "important"), input.style.setProperty("border-color", style.background, "important")) : (wrapper.style.removeProperty("background"), input.style.removeProperty("color"), input.style.removeProperty("border-color"));
}
