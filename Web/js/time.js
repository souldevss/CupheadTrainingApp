function parseTime(value) {
  const cleanValue = value.trim().replace(",", ".");
  if (!cleanValue) return null;
  if (cleanValue.includes(":")) {
    const parts = cleanValue.split(":");
    if (parts.length !== 2) return null;
    const minutes = Number(parts[0]);
    let seconds2 = Number(parts[1]);
    return !Number.isFinite(minutes) || !Number.isFinite(seconds2) || minutes < 0 || seconds2 < 0 || seconds2 >= 60 ? null : (parts[1].includes(".") || (seconds2 += 0.5), minutes * 60 + seconds2);
  }
  let seconds = Number(cleanValue);
  return !Number.isFinite(seconds) || seconds < 0 ? null : (cleanValue.includes(".") || (seconds += 0.5), seconds);
}
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60), remainingSeconds = Math.round(seconds % 60 * 100) / 100, parts = String(remainingSeconds).split("."), paddedInteger = parts[0].padStart(2, "0");
  return parts.length > 1 ? `${minutes}:${paddedInteger}.${parts[1]}` : `${minutes}:${paddedInteger}`;
}
function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
