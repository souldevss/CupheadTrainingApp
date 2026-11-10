// Time parsing, formatting, and display helpers

/**
 * Parses a time string into seconds
 * Supports formats: "MM:SS.ss", "MM:SS", "SS.ss", or just "SS"
 * @param {string} value - The time string to parse
 * @returns {number|null} Time in seconds, or null if invalid
 */
function parseTime(value)
{
    const cleanValue = value.trim().replace(",", ".");

    if (!cleanValue) return null;

    if (cleanValue.includes(":")) {
        const parts = cleanValue.split(":");
        if (parts.length !== 2) return null;

        const minutes = Number(parts[0]);
        let seconds = Number(parts[1]);

        if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
        if (minutes < 0 || seconds < 0 || seconds >= 60) return null;

        if (!parts[1].includes(".")) {
            seconds += 0.5;
        }

        return minutes * 60 + seconds;
    }

    let seconds = Number(cleanValue);
    if (!Number.isFinite(seconds) || seconds < 0) return null;

    if (!cleanValue.includes(".")) {
        seconds += 0.5;
    }

    return seconds;
}

/**
 * Formats a time in seconds into a human-readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "1:23.45" or "0:45.67")
 */
function formatTime(seconds)
{
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round((seconds % 60) * 100) / 100;
    const secondsStr = String(remainingSeconds);
    const parts = secondsStr.split('.');
    const paddedInteger = parts[0].padStart(2, "0");

    return parts.length > 1
        ? `${minutes}:${paddedInteger}.${parts[1]}`
        : `${minutes}:${paddedInteger}`;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} value - The string to escape
 * @returns {string} The escaped string
 */
function escapeAttribute(value)
{
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
