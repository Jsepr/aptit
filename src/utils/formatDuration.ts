/**
 * Parse ISO 8601 duration format (e.g., PT150M, PT2H30M) into human-readable format
 * @param duration ISO 8601 duration string
 * @param locale Language code for formatting
 * @returns Formatted duration string (e.g., "2h 30m" or "150m")
 */
export const formatDuration = (duration: string | undefined, locale: string = "en"): string => {
	if (!duration) return "";

	// Parse ISO 8601 duration
	// Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
	const isoRegex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
	const match = duration.match(isoRegex);

	if (!match) {
		// If parsing fails, return original string
		return duration;
	}

	const hours = match[1] ? parseInt(match[1], 10) : 0;
	const minutes = match[2] ? parseInt(match[2], 10) : 0;
	const seconds = match[3] ? parseInt(match[3], 10) : 0;

	// Build human-readable format
	const parts: string[] = [];

	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	if (minutes > 0) {
		parts.push(`${minutes}m`);
	}
	if (seconds > 0 && hours === 0 && minutes === 0) {
		parts.push(`${seconds}s`);
	}

	return parts.length > 0 ? parts.join(" ") : "0m";
};
