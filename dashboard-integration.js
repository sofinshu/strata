/**
 * STRATA Dashboard - UWU Chan SaaS Integration
 * Real-time data connection to bot API
 */

const API_CONFIG = {
    BASE_URL: 'https://uwu-chan-saas-production.up.railway.app',
    WS_URL: 'wss://uwu-chan-saas-production.up.railway.app',
    CLIENT_ID: '147326464491088213', // FIXED: Corrected from 1473264644910088213
    get REDIRECT_URI() {
        return encodeURIComponent(window.location.origin + window.location.pathname);
    }
};

// Global state
let currentToken = null;
let currentGuild = null;
let wsConnection = null;
let realtimeUpdates = true;

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    console.log('[Dashboard] Initializing...');

    // Check for OAuth callback
    if (window.location.hash.includes('access_token')) {
        await handleOAuthReturn();
    }

    // Setup real-time updates
    if (realtimeUpdates) {
        setupRealtimeConnection();
    }

    // Load initial data
    await loadPublicStats();
    await loadCommands();

    console.log('[Dashboard] Initialized successfully');
}

/**
 * Discord OAuth Login
 */
function loginWithDiscord() {
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${API_CONFIG.CLIENT_ID}&redirect_uri=${API_CONFIG.REDIRECT_URI}&response_type=token&scope=identify%20guilds`;
    window.location.href = oauthUrl;
}

/**
 * Handle OAuth Return
 */
async function handleOAuthReturn() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    currentToken = params.get('access_token');

    if (!currentToken) {
        showToast('Login failed - no token received', 'error');
        return;
    }

    // Clear hash
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
        // Verify token by fetching user
        const userRes = await fetch('https://discord.com/api/users/@me', {\n            headers: { Authorization: `Bearer ${currentToken}` }\n        });

        if (!userRes.ok) throw new Error('Invalid token');

        const user = await userRes.json();
        console.log('[Dashboard] Logged in as:', user.username);
        showToast(`Welcome, ${user.username}! ðŸ‘‹`, 'success');

        // Show guild picker
        await showGuildPicker();

    } catch (error) {\n        console.error('[Dashboard] OAuth error:', error);\n        showToast('Login failed. Please try again.', 'error');\n        currentToken = null;\n    }
}

/**
 * Fetch with auth header
 */
async function fetchAPI(endpoint, options = {}) {
    if (!currentToken) {
        throw new Error('Not authenticated');
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
    }

    return res.json();
}

/**
 * Load public stats
 */
async function loadPublicStats() {
    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/dashboard/stats`);
        const data = await res.json();

        // Update stats on page
        updateStat('stat-servers', '2,400+');
        animateStat('stat-staff', data.staffCount || 0);
        animateStat('stat-shifts', data.totalShifts || 0);
        updateStat('stat-commands', data.commandCount || 271);

        console.log('[Dashboard] Stats loaded:', data);
    } catch (error) {
        console.error('[Dashboard] Failed to load stats:', error);
        // Use fallback values
        updateStat('stat-servers', '2,400+');
        updateStat('stat-staff', '0');
        updateStat('stat-shifts', '0');
        updateStat('stat-commands', '271');
    }
}

/**
 * Show guild picker
 */
async function showGuildPicker() {
    switchPage('guildPicker');
    const grid = document.getElementById('guildGrid');
    grid.innerHTML = '<div class="loading">Loading your servers...</div>';

    try {
        // Get user's guilds from Discord
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {\n            headers: { Authorization: `Bearer ${currentToken}` }\n        });

        if (!guildsRes.ok) throw new Error('Failed to fetch guilds');

        const allGuilds = await guildsRes.json();

        // Filter guilds where user has Manage Server permission
        const managedGuilds = allGuilds.filter(g => {
            const permissions = BigInt(g.permissions);
            return (permissions & 0x20n) === 0x20n;
        });

        if (managedGuilds.length === 0) {
            grid.innerHTML = '<div class="no-guilds">No managed servers found.</div>';
            return;
        }

        grid.innerHTML = '';
        managedGuilds.forEach(guild => {
            const card = document.createElement('div');
            card.className = 'guild-card';
            card.innerHTML = `
                <img src="${guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${guild.name}">
                <h3>${guild.name}</h3>
                <button onclick="selectGuild('${guild.id}')">Manage</button>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('[Dashboard] Failed to load guilds:', error);
        grid.innerHTML = '<div class="error">Failed to load servers.</div>';
    }
}
