function sanitizeString(str) {
    return str.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll("\"", "\\\"");
}

module.exports = { sanitizeString };
