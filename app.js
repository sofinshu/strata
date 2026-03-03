// ============================================================
// STRATA Website — Premium Dashboard App
// ============================================================

const CONFIG = {
    CLIENT_ID: '1473264644910088213',
    API_BASE: 'https://uwu-chan-saas-production.up.railway.app',
    get REDIRECT_URI() { return encodeURIComponent(window.location.origin + window.location.pathname); },
    get DISCORD_OAUTH_URL() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=token&scope=identify%20guilds`;
    }
};

let currentUser = null;
let accessToken = null;
let allCommands = [];
let managedGuilds = [];
let currentGuildId = null;
let activeChart = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    setupNavLinks();
    if (await checkOAuthCallback()) return;
    loadPublicStats();
    loadCommands();
    setupCommandListeners();
});

// ── PUBLIC STATS ──
async function loadPublicStats() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/stats`);
        if (res.ok) {
            const data = await res.json();
            animateValue('stat-servers', data.guildCount || 2400, false);
            animateValue('stat-staff', data.staffCount || 1, false);
            animateValue('stat-tickets', data.totalShifts || 9, false);
            animateValue('stat-commands', 271, false);
        } else { throw new Error(); }
    } catch {
        animateValue('stat-servers', 2400, false);
        animateValue('stat-staff', 1, false);
        animateValue('stat-tickets', 9, false);
        animateValue('stat-commands', 271, false);
    }
}

function animateValue(id, target, addPlus = true) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toLocaleString() + (addPlus !== false ? '+' : '');
        if (current >= target) clearInterval(timer);
    }, 20);
}

// ── COMMAND BROWSER ──
async function loadCommands() {
    try {
        const res = await fetch('extracted_commands.json');
        allCommands = await res.json();
        renderCommands(allCommands);
    } catch (e) { console.error('Failed to load commands:', e); }
}

function renderCommands(cmds) {
    const grid = document.getElementById('cmdGrid');
    if (!grid) return;
    if (cmds.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: var(--text3); padding: 60px 0;">No commands found.</div>`;
        return;
    }
    grid.innerHTML = cmds.slice(0, 60).map(c => {
        const tierColor = { v1: '#6d5dfc', v2: '#00b7ff', v3: '#ff47d8', v4: '#ffb800', v5: '#00ff95', v6: '#ff3e3e', v7: '#ffcc00', v8: '#00f2ff' };
        const color = tierColor[c.tier] || '#606080';
        return `
        <div class="card" style="padding: 20px; cursor:default;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <code style="color: var(--accent); font-weight: 800; font-size: 0.95rem;">/${c.name || c.command}</code>
                <span style="font-size: 0.65rem; background: ${color}18; border: 1px solid ${color}40; color: ${color}; padding: 3px 8px; border-radius: 4px; font-weight: 700; white-space: nowrap;">${(c.tier || 'v1').toUpperCase()}</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text2); line-height: 1.5; margin-bottom: 14px;">${c.desc || c.description || 'No description.'}</p>
            ${c.options && c.options.length ? `<div style="display: flex; gap: 6px; flex-wrap: wrap;">${c.options.slice(0, 4).map(o => `<span style="font-size: 0.62rem; color: var(--text3); background: var(--bg2); padding: 2px 6px; border-radius: 3px;">${o.name}</span>`).join('')}${c.options.length > 4 ? `<span style="font-size: 0.62rem; color: var(--text3);">+${c.options.length - 4} more</span>` : ''}</div>` : ''}
        </div>`;
    }).join('');
}

function setupCommandListeners() {
    const search = document.getElementById('cmdSearch');
    const filter = document.getElementById('cmdTierFilter');
    if (!search || !filter) return;
    const update = () => {
        const query = search.value.toLowerCase().trim();
        const tier = filter.value;
        const filtered = allCommands.filter(c => {
            const name = (c.name || c.command || '').toLowerCase();
            const desc = (c.desc || c.description || '').toLowerCase();
            const matchesQuery = !query || name.includes(query) || desc.includes(query);
            const matchesTier = tier === 'all' || c.tier === tier;
            return matchesQuery && matchesTier;
        });
        renderCommands(filtered);
    };
    search.oninput = update;
    filter.onchange = update;
}

// ── AUTH ──
async function checkOAuthCallback() {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return false;
    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get('access_token');
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error();
        currentUser = await res.json();
        showToast(`Welcome back, ${currentUser.username}! 👋`);
        await showGuildPicker();
        return true;
    } catch {
        showToast('Login failed. Please try again.');
        return false;
    }
}

function loginWithDiscord() {
    window.location.href = CONFIG.DISCORD_OAUTH_URL;
}

// ── GUILD PICKER ──
async function showGuildPicker() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('guildPicker').style.display = 'flex';
    const grid = document.getElementById('guildGrid');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2);">Loading your servers...</div>`;

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error();
        managedGuilds = await res.json();
        renderGuilds();
    } catch {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--red);">Failed to load servers. Please log in again.</div>`;
    }
}

function renderGuilds() {
    const grid = document.getElementById('guildGrid');
    if (!managedGuilds.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2);">No servers found where you have Manage Server permission.</div>`;
        return;
    }
    grid.innerHTML = managedGuilds.map(g => {
        const iconUrl = g.icon
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
            : null;
        const installed = g.botInstalled;
        return `
        <div class="guild-card" onclick="selectGuild('${g.id}')">
            ${iconUrl
                ? `<img src="${iconUrl}" class="gc-icon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="gc-icon-fallback" style="display:none">${g.name[0]}</div>`
                : `<div class="gc-icon-fallback">${g.name[0]}</div>`}
            <div class="gc-info">
                <div class="gc-name">${g.name}</div>
                <div class="gc-status" style="color:${installed ? 'var(--green)' : 'var(--text3)'}">
                    ${installed ? '● ' + (g.tier || 'Active').toUpperCase() : '○ Add Bot'}
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── DASHBOARD ──
async function selectGuild(id) {
    currentGuildId = id;
    const guild = managedGuilds.find(g => g.id === id);
    if (!guild) return;

    if (!guild.botInstalled) {
        window.open(`https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${id}`, '_blank');
        return;
    }

    document.getElementById('guildPicker').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');

    const iconUrl = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;
    if (iconUrl) {
        const img = document.getElementById('sideAvatarImg');
        const fallback = document.getElementById('sideAvatarFallback');
        img.src = iconUrl;
        img.style.display = 'block';
        fallback.style.display = 'none';
    }
    document.getElementById('sideUsername').textContent = guild.name;
    document.getElementById('dashGreet').textContent = `Managing ${guild.name}`;

    switchPanel('overview');
    loadDashboardData();
}

async function loadDashboardData() {
    showToast('Syncing real-time data...');
    try {
        const [overview, staff, shifts] = await Promise.all([
            fetchAPI(`/api/dashboard/guild/${currentGuildId}`),
            fetchAPI(`/api/dashboard/guild/${currentGuildId}/staff`),
            fetchAPI(`/api/dashboard/guild/${currentGuildId}/shifts`)
        ]);
        updateStats(overview?.stats || overview || {});
        renderStaff(staff);
        renderShifts(shifts);
        initChart(shifts);
        loadLeaderboard();
        showToast('Data synced ✅');
    } catch (e) {
        console.error(e);
        showToast('Error syncing data');
    }
}

function updateStats(s) {
    if (!s) return;
    document.getElementById('ovStaff').textContent = s.staffCount ?? s.staff ?? 0;
    document.getElementById('ovShifts').textContent = s.shiftCount ?? s.shifts ?? 0;
    document.getElementById('ovWarnings').textContent = s.warnCount ?? s.warnings ?? 0;
    document.getElementById('ovActivity').textContent = s.activityCount ?? s.activity ?? 0;
}

function renderStaff(staff) {
    // Staff panel will be populated when implemented
}

function renderShifts(shifts) {
    // Shifts panel will be populated when implemented
}

function initChart(shifts) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return;
    if (activeChart) { activeChart.destroy(); activeChart = null; }

    const labels = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Build data from real shifts if available, otherwise random
    let data;
    if (Array.isArray(shifts) && shifts.length) {
        const counts = {};
        shifts.forEach(s => {
            const day = new Date(s.startTime || s.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
            counts[day] = (counts[day] || 0) + 1;
        });
        data = labels.map(l => counts[l] || 0);
    } else {
        data = labels.map(() => Math.floor(Math.random() * 15) + 2);
    }

    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Shifts',
                data,
                borderColor: '#6d5dfc',
                backgroundColor: 'rgba(109,93,252,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6d5dfc'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#606080' }, beginAtZero: true },
                x: { grid: { display: false }, ticks: { color: '#606080' } }
            }
        }
    });
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboardTbody');
    if (!tbody) return;
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${currentGuildId}/leaderboard`);
        if (!Array.isArray(data) || !data.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">No leaderboard data yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.slice(0, 20).map((u, i) => {
            const rankClass = i < 3 ? `rank-${i + 1}` : '';
            const avatarUrl = u.avatar
                ? (u.avatar.startsWith('http') ? u.avatar : `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`)
                : `https://cdn.discordapp.com/embed/avatars/${(parseInt(u.id || 0) % 5)}.png`;
            return `
            <tr>
                <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${avatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                        <span style="font-weight:600;">${u.username || u.tag || 'Unknown'}</span>
                    </div>
                </td>
                <td style="color:var(--accent);font-weight:700;">${(u.points ?? u.score ?? 0).toLocaleString()}</td>
                <td style="color:var(--text2);">${u.shifts ?? u.shiftCount ?? 0}</td>
                <td>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width:${Math.min(u.activity ?? 50, 100)}%"></div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">Leaderboard unavailable.</td></tr>`;
    }
}

// ── HELPERS ──
async function fetchAPI(path, opts = {}) {
    const res = await fetch(`${CONFIG.API_BASE}${path}`, {
        ...opts,
        headers: { ...(opts.headers || {}), Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function switchPanel(panel) {
    document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`panel-${panel}`);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    const item = document.querySelector(`[data-panel="${panel}"]`);
    if (item) item.classList.add('active');
}

function setupNavLinks() {
    document.querySelectorAll('[data-scroll]').forEach(a => {
        a.addEventListener('click', e => {
            const el = document.getElementById(a.dataset.scroll);
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
}

function showGuildPickerFromDash() {
    document.getElementById('dashboard').classList.remove('active');
    if (activeChart) { activeChart.destroy(); activeChart = null; }
    showGuildPicker();
}
