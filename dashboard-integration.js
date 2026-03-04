/**
 * STRATA Dashboard - UWU Chan SaaS Integration
 * Real-time data connection to bot API
 */

const API_CONFIG = {
    BASE_URL: 'https://uwu-chan-saas-production.up.railway.app',
    WS_URL: 'wss://uwu-chan-saas-production.up.railway.app',
    CLIENT_ID: '1473264644910088213',
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
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${currentToken}` }
        });

        if (!userRes.ok) throw new Error('Invalid token');

        const user = await userRes.json();
        console.log('[Dashboard] Logged in as:', user.username);
        showToast(`Welcome, ${user.username}! 👋`, 'success');

        // Show guild picker
        await showGuildPicker();

    } catch (error) {
        console.error('[Dashboard] OAuth error:', error);
        showToast('Login failed. Please try again.', 'error');
        currentToken = null;
    }
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
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${currentToken}` }
        });

        if (!guildsRes.ok) throw new Error('Failed to fetch guilds');

        const allGuilds = await guildsRes.json();

        // Filter guilds where user has Manage Server permission
        const managedGuilds = allGuilds.filter(g => {
            const permissions = BigInt(g.permissions);
            return g.owner || (permissions & BigInt(0x20)); // MANAGE_GUILD
        });

        // Check which guilds have the bot installed
        const guildData = await Promise.all(
            managedGuilds.map(async (g) => {
                try {
                    const res = await fetchAPI(`/api/dashboard/guild/${g.id}`);
                    return { ...g, hasBot: true, data: res };
                } catch {
                    return { ...g, hasBot: false };
                }
            })
        );

        renderGuildGrid(guildData);

    } catch (error) {
        console.error('[Dashboard] Guild picker error:', error);
        grid.innerHTML = '<div class="error">Failed to load servers. Please refresh and try again.</div>';
    }
}

/**
 * Render guild grid
 */
function renderGuildGrid(guilds) {
    const grid = document.getElementById('guildGrid');

    if (guilds.length === 0) {
        grid.innerHTML = '<div class="empty">No servers found where you have Manage Server permission.</div>';
        return;
    }

    grid.innerHTML = guilds.map(guild => {
        const iconUrl = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
            : null;

        const statusClass = guild.hasBot ? 'installed' : 'not-installed';
        const statusText = guild.hasBot ? '✓ Bot Installed' : '✗ Add Bot';

        return `
            <div class="guild-card ${statusClass}" onclick="selectGuild('${guild.id}')">
                <div class="guild-icon">
                    ${iconUrl
                ? `<img src="${iconUrl}" alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='${guild.name[0]}';">`
                : guild.name[0]
            }
                </div>
                <div class="guild-info">
                    <div class="guild-name">${escapeHtml(guild.name)}</div>
                    <div class="guild-status">${statusText}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Select guild
 */
async function selectGuild(guildId) {
    console.log('[Dashboard] Selecting guild:', guildId);

    // Check if bot is installed
    try {
        const guildData = await fetchAPI(`/api/dashboard/guild/${guildId}`);
        currentGuild = { id: guildId, ...guildData };

        // Show dashboard
        switchPage('dashboard');

        // Update sidebar
        updateSidebar(guildData);

        // Load all dashboard data
        await loadAllDashboardData(guildId);

        // Connect to real-time updates
        connectGuildWebSocket(guildId);

    } catch (error) {
        // Bot not installed, redirect to invite
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${API_CONFIG.CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
        window.open(inviteUrl, '_blank');
        showToast('Please add the bot to your server first', 'info');
    }
}

/**
 * Load all dashboard data
 */
async function loadAllDashboardData(guildId) {
    showToast('Loading dashboard data...', 'info');

    try {
        // Fetch all data in parallel
        const [overview, staff, shifts, warnings, settings, promotions] = await Promise.allSettled([
            fetchAPI(`/api/dashboard/guild/${guildId}`),
            fetchAPI(`/api/dashboard/guild/${guildId}/staff`),
            fetchAPI(`/api/dashboard/guild/${guildId}/shifts`),
            fetchAPI(`/api/dashboard/guild/${guildId}/warnings`),
            fetchAPI(`/api/dashboard/guild/${guildId}/settings`),
            fetchAPI(`/api/dashboard/guild/${guildId}/promotion-requirements`)
        ]);

        // Render all panels
        if (overview.status === 'fulfilled') {
            renderOverview(overview.value);
        }
        if (staff.status === 'fulfilled') {
            renderStaffList(staff.value);
        }
        if (shifts.status === 'fulfilled') {
            renderShifts(shifts.value);
        }
        if (warnings.status === 'fulfilled') {
            renderWarnings(warnings.value);
        }
        if (settings.status === 'fulfilled') {
            renderSettings(settings.value);
        }
        if (promotions.status === 'fulfilled') {
            renderPromotions(promotions.value);
        }

        showToast('Dashboard loaded ✅', 'success');

    } catch (error) {
        console.error('[Dashboard] Load error:', error);
        showToast('Error loading some data', 'error');
    }
}

/**
 * Render overview panel
 */
function renderOverview(data) {
    const stats = data.stats || {};

    // Update stat cards
    updateElement('overview-staff-count', stats.staffCount || 0);
    updateElement('overview-shift-count', stats.shiftCount || 0);
    updateElement('overview-warning-count', stats.warnCount || 0);
    updateElement('overview-activity-count', stats.activityCount || 0);

    // Render activity chart if data available
    if (data.activity && data.activity.length > 0) {
        renderActivityChart(data.activity);
    }
}

/**
 * Render staff list
 */
function renderStaffList(staff) {
    const container = document.getElementById('staff-list');
    if (!container) return;

    if (staff.length === 0) {
        container.innerHTML = '<div class="empty">No staff members found</div>';
        return;
    }

    container.innerHTML = staff.map(member => `
        <div class="staff-item">
            <div class="staff-avatar">
                <img src="https://cdn.discordapp.com/avatars/${member.userId}/${member.avatar}.png" 
                     alt="" 
                     onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            </div>
            <div class="staff-info">
                <div class="staff-name">${escapeHtml(member.username || 'Unknown')}</div>
                <div class="staff-stats">
                    <span class="stat">${member.points || 0} pts</span>
                    <span class="stat">${member.shifts || 0} shifts</span>
                    <span class="stat ${(member.warnings || 0) > 0 ? 'warning' : ''}">${member.warnings || 0} warns</span>
                </div>
            </div>
            <div class="staff-rank">${member.rank || 'Member'}</div>
        </div>
    `).join('');
}

/**
 * Render shifts
 */
function renderShifts(shifts) {
    const container = document.getElementById('shifts-list');
    if (!container) return;

    if (shifts.length === 0) {
        container.innerHTML = '<div class="empty">No shifts recorded</div>';
        return;
    }

    container.innerHTML = shifts.map(shift => `
        <div class="shift-item">
            <div class="shift-user">${escapeHtml(shift.username || 'Unknown')}</div>
            <div class="shift-time">
                ${formatDate(shift.startTime)} - ${shift.endTime ? formatDate(shift.endTime) : 'Active'}
            </div>
            <div class="shift-duration">${shift.duration ? formatDuration(shift.duration) : 'In progress'}</div>
            <div class="shift-points">+${shift.points || 0} pts</div>
        </div>
    `).join('');
}

/**
 * Render warnings
 */
function renderWarnings(warnings) {
    const container = document.getElementById('warnings-list');
    if (!container) return;

    if (warnings.length === 0) {
        container.innerHTML = '<div class="empty">No warnings issued</div>';
        return;
    }

    container.innerHTML = warnings.map(warning => `
        <div class="warning-item severity-${warning.severity || 'medium'}">
            <div class="warning-user">${escapeHtml(warning.username || 'Unknown')}</div>
            <div class="warning-reason">${escapeHtml(warning.reason)}</div>
            <div class="warning-meta">
                <span class="severity">${warning.severity || 'medium'}</span>
                <span class="date">${formatDate(warning.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Render settings
 */
function renderSettings(settings) {
    // Update toggle switches
    const toggles = [
        { id: 'setting-auto-promotion', key: 'autoPromotion' },
        { id: 'setting-tickets', key: 'ticketEnabled' },
        { id: 'setting-alerts', key: 'alertsEnabled' },
        { id: 'setting-shift-tracking', key: 'shiftTrackingEnabled' }
    ];

    toggles.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = settings[key] || false;
        }
    });

    // Update channel inputs
    const channels = [
        { id: 'setting-mod-channel', key: 'modChannelId' },
        { id: 'setting-staff-channel', key: 'staffChannelId' },
        { id: 'setting-log-channel', key: 'logChannelId' }
    ];

    channels.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = settings[key] || '';
        }
    });
}

/**
 * Render promotions
 */
function renderPromotions(data) {
    const container = document.getElementById('promotion-requirements');
    if (!container) return;

    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    const requirements = data.requirements || {};

    ranks.forEach(rank => {
        const req = requirements[rank] || {};

        const pointsEl = document.getElementById(`req-${rank}-points`);
        const shiftsEl = document.getElementById(`req-${rank}-shifts`);
        const consistencyEl = document.getElementById(`req-${rank}-consistency`);
        const warningsEl = document.getElementById(`req-${rank}-warnings`);
        const roleEl = document.getElementById(`req-${rank}-role`);

        if (pointsEl) pointsEl.value = req.points || 0;
        if (shiftsEl) shiftsEl.value = req.shifts || 0;
        if (consistencyEl) consistencyEl.value = req.consistency || 0;
        if (warningsEl) warningsEl.value = req.maxWarnings || 0;
        if (roleEl) roleEl.value = data.rankRoles?.[rank] || '';
    });
}

/**
 * Save settings
 */
async function saveSettings() {
    if (!currentGuild) return;

    showToast('Saving settings...', 'info');

    const settings = {
        autoPromotion: document.getElementById('setting-auto-promotion')?.checked || false,
        ticketEnabled: document.getElementById('setting-tickets')?.checked || false,
        alertsEnabled: document.getElementById('setting-alerts')?.checked || false,
        shiftTrackingEnabled: document.getElementById('setting-shift-tracking')?.checked || false,
        modChannelId: document.getElementById('setting-mod-channel')?.value || null,
        staffChannelId: document.getElementById('setting-staff-channel')?.value || null,
        logChannelId: document.getElementById('setting-log-channel')?.value || null
    };

    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuild.id}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(settings)
        });
        showToast('Settings saved ✅', 'success');
    } catch (error) {
        console.error('[Dashboard] Save error:', error);
        showToast('Failed to save settings', 'error');
    }
}

/**
 * Save promotion requirements
 */
async function savePromotionRequirements() {
    if (!currentGuild) return;

    showToast('Saving promotion requirements...', 'info');

    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    const requirements = {};
    const rankRoles = {};

    ranks.forEach(rank => {
        requirements[rank] = {
            points: parseInt(document.getElementById(`req-${rank}-points`)?.value || 0),
            shifts: parseInt(document.getElementById(`req-${rank}-shifts`)?.value || 0),
            consistency: parseInt(document.getElementById(`req-${rank}-consistency`)?.value || 0),
            maxWarnings: parseInt(document.getElementById(`req-${rank}-warnings`)?.value || 0)
        };

        const roleId = document.getElementById(`req-${rank}-role`)?.value;
        if (roleId) {
            rankRoles[rank] = roleId;
        }
    });

    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuild.id}/promotion-requirements`, {
            method: 'PATCH',
            body: JSON.stringify({ requirements, rankRoles })
        });
        showToast('Promotion requirements saved ✅', 'success');
    } catch (error) {
        console.error('[Dashboard] Save error:', error);
        showToast('Failed to save requirements', 'error');
    }
}

/**
 * WebSocket connection for real-time updates
 */
function connectGuildWebSocket(guildId) {
    if (!realtimeUpdates || !currentToken) return;

    try {
        wsConnection = new WebSocket(`${API_CONFIG.WS_URL}?guild=${guildId}&token=${currentToken}`);

        wsConnection.onopen = () => {
            console.log('[Dashboard] WebSocket connected');
        };

        wsConnection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
        };

        wsConnection.onerror = (error) => {
            console.error('[Dashboard] WebSocket error:', error);
        };

        wsConnection.onclose = () => {
            console.log('[Dashboard] WebSocket disconnected');
            // Reconnect after 5 seconds
            setTimeout(() => connectGuildWebSocket(guildId), 5000);
        };

    } catch (error) {
        console.error('[Dashboard] WebSocket setup failed:', error);
    }
}

/**
 * Handle real-time update
 */
function handleRealtimeUpdate(data) {
    console.log('[Dashboard] Real-time update:', data);

    switch (data.type) {
        case 'shift_start':
        case 'shift_end':
            // Refresh shifts
            loadAllDashboardData(currentGuild.id);
            break;
        case 'warning_issued':
            // Refresh warnings
            loadAllDashboardData(currentGuild.id);
            showToast(`New warning issued to ${data.username}`, 'warning');
            break;
        case 'promotion':
            showToast(`${data.username} was promoted to ${data.rank}! 🎉`, 'success');
            loadAllDashboardData(currentGuild.id);
            break;
        case 'staff_update':
            loadAllDashboardData(currentGuild.id);
            break;
    }
}

/**
 * Utility: Update element text
 */
function updateElement(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/**
 * Utility: Update stat with animation
 */
function animateStat(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    let current = 0;
    const step = Math.max(1, Math.ceil(target / 50));

    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toLocaleString();
        if (current >= target) clearInterval(timer);
    }, 20);
}

/**
 * Utility: Format date
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Utility: Format duration (ms to readable)
 */
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility: Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Utility: Switch page
 */
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}Page`)?.classList.add('active');
}

/**
 * Utility: Switch dashboard panel
 */
function switchPanel(panel) {
    document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`panel-${panel}`).style.display = 'block';
}

/**
 * Utility: Update sidebar
 */
function updateSidebar(guildData) {
    const avatarEl = document.getElementById('sideAvatar');
    const nameEl = document.getElementById('sideUsername');

    if (avatarEl && guildData.guild) {
        if (guildData.guild.icon) {
            avatarEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${guildData.guild.id}/${guildData.guild.icon}.png" alt="">`;
        } else {
            avatarEl.textContent = guildData.guild.name[0];
        }
    }

    if (nameEl && guildData.guild) {
        nameEl.textContent = guildData.guild.name;
    }
}

/**
 * Setup real-time connection
 */
function setupRealtimeConnection() {
    console.log('[Dashboard] Real-time updates enabled');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);

// Expose functions globally
window.loginWithDiscord = loginWithDiscord;
window.selectGuild = selectGuild;
window.switchPanel = switchPanel;
window.saveSettings = saveSettings;
window.savePromotionRequirements = savePromotionRequirements;
