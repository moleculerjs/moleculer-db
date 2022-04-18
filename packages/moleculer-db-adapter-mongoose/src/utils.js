function escapeRegex(string) {
	return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
exports.escapeRegex = escapeRegex
