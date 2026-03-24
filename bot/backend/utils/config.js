function isValidUrl(string) {
    if (!string || typeof string !== 'string') return false;
    try {
        const url = new URL(string.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function getBotApiConfig(caller = 'unknown') {
    const REAL_BOT_API = process.env.REAL_BOT_API;
    
    if (!REAL_BOT_API || REAL_BOT_API === 'undefined' || REAL_BOT_API.trim() === '') {
        console.warn(`[Config] REAL_BOT_API is not configured, skipping Bot API sync (called from ${caller})`);
        return { BOT_API: null, BOT_API_KEY: null };
    }
    
    if (!isValidUrl(REAL_BOT_API)) {
        console.warn(`[Config] REAL_BOT_API is not a valid URL: "${REAL_BOT_API}"`);
        console.warn(`[Config] REAL_BOT_API must start with http:// or https://`);
        console.warn(`[Config] If this value is a Discord token, it should be set in BOT_API_KEY instead`);
        console.warn(`[Config] Skipping Bot API sync (called from ${caller})`);
        return { BOT_API: null, BOT_API_KEY: null };
    }
    
    const BOT_API_KEY = process.env.BOT_API_KEY || process.env.REAL_BOT_API;
    const apiKey = (!BOT_API_KEY || BOT_API_KEY === 'undefined' || BOT_API_KEY.trim() === '') ? null : BOT_API_KEY;
    return { BOT_API: REAL_BOT_API, BOT_API_KEY: apiKey };
}

module.exports = {
    isValidUrl,
    getBotApiConfig
};
