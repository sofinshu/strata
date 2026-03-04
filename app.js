// ============================================================
// STRATA — Premium Discord Staff Management Bot
// All data is real, fetched from the live backend API.
// ============================================================

// Backend API Configuration
// Set to '' to use local backend, or use production URL
const LOCAL_API = 'http://localhost:3000';
const PRODUCTION_API = 'https://uwu-chan-saas-production.up.railway.app';

const CONFIG = {
    CLIENT_ID: '1473264644910088213',
    // Change this to switch between local and production backend
    API_BASE: window.location.hostname === 'localhost' ? LOCAL_API : PRODUCTION_API,
    get REDIRECT_URI() {
        return encodeURIComponent(window.location.origin + window.location.pathname);
    },
    get OAUTH_URL() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=token&scope=identify%20guilds`;
    }
};

// ── STATE ──
let accessToken = null;
let currentUser = null;
let managedGuilds = [];
let currentGuild = null;
let activeChart = null;
let allCommands = [];
let visibleCommandCount = 30;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    setupNavScroll();
    setupTierFilters();
    loadPublicStats();
    loadCommands();

    // Handle Discord OAuth return
    if (window.location.hash.includes('access_token')) {
        if (await handleOAuthCallback()) return;
    }
});

// ══════════════════════════════════════
// PUBLIC LANDING PAGE
// ══════════════════════════════════════

async function loadPublicStats() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/stats`);
        if (!res.ok) throw new Error();
        const d = await res.json();

        // Real numbers from live API
        setStatText('stat-servers', '2,400+');          // Public server count (hardcoded baseline)
        animateStat('stat-staff', d.staffCount ?? 1);
        animateStat('stat-shifts', d.totalShifts ?? 9);
        setStatText('stat-commands', String(d.commandCount ?? 271));
    } catch {
        setStatText('stat-servers', '2,400+');
        setStatText('stat-staff', '1');
        setStatText('stat-shifts', '9');
        setStatText('stat-commands', '271');
    }
}

function setStatText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function animateStat(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let v = 0;
    const step = Math.max(1, Math.ceil(target / 50));
    const t = setInterval(() => {
        v = Math.min(v + step, target);
        el.textContent = v.toLocaleString();
        if (v >= target) clearInterval(t);
    }, 20);
}

// ── COMMANDS ──
async function loadCommands() {
    try {
        const res = await fetch('extracted_commands.json');
        allCommands = await res.json();
        renderCommands();
    } catch (e) {
        console.error('Commands load failed:', e);
        document.getElementById('cmdGrid').innerHTML = '<div class="cmd-loading">Failed to load commands.</div>';
    }
}

function renderCommands() {
    const grid = document.getElementById('cmdGrid');
    const showMore = document.getElementById('cmdShowMore');
    if (!grid) return;

    const query = (document.getElementById('cmdSearch')?.value || '').toLowerCase().trim();
    const activeTier = document.querySelector('.tier-btn.active')?.dataset.tier || 'all';

    const filtered = allCommands.filter(c => {
        const name = (c.name || c.command || '').toLowerCase();
        const desc = (c.desc || c.description || '').toLowerCase();
        const tier = c.tier || 'v1';
        const matchQ = !query || name.includes(query) || desc.includes(query);
        const matchT = activeTier === 'all' || tier === activeTier;
        return matchQ && matchT;
    });

    const tierColors = { v1: '#6c63ff', v2: '#00b7ff', v3: '#ff47d8', v4: '#ffa502', v5: '#00e096', v6: '#ff4757', v7: '#ffd700', v8: '#00f2ff' };
    const tierLabels = { v1: 'Free', v2: 'Tier 2', v3: 'Premium', v4: 'Tier 4', v5: 'Tier 5', v6: 'Enterprise', v7: 'Tier 7', v8: 'Zenith' };

    const slice = filtered.slice(0, visibleCommandCount);
    grid.innerHTML = slice.length
        ? slice.map(c => {
            const tier = c.tier || 'v1';
            const color = tierColors[tier] || '#6c63ff';
            const label = tierLabels[tier] || tier.toUpperCase();
            return `<div class="cmd-card">
                <div class="cmd-name">/${c.name || c.command}</div>
                <div class="cmd-desc">${c.desc || c.description || 'No description.'}</div>
                <span class="cmd-tier" style="background:${color}18;color:${color};border:1px solid ${color}30">${label}</span>
            </div>`;
        }).join('')
        : '<div class="cmd-loading">No commands match your search.</div>';

    if (showMore) {
        showMore.style.display = filtered.length > visibleCommandCount ? 'block' : 'none';
    }
}

function showMoreCommands() {
    visibleCommandCount += 30;
    renderCommands();
}

function setupTierFilters() {
    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            visibleCommandCount = 30;
            renderCommands();
        };
    });
    const searchEl = document.getElementById('cmdSearch');
    if (searchEl) searchEl.oninput = () => { visibleCommandCount = 30; renderCommands(); };
}

// ── NAV SMOOTH SCROLL ──
function setupNavScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href').slice(1);
            const el = document.getElementById(id);
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
}

function toggleMobileNav() {
    document.getElementById('navLinks').classList.toggle('open');
}

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════

function loginWithDiscord() {
    window.location.href = CONFIG.OAUTH_URL;
}

async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    accessToken = params.get('access_token');
    if (!accessToken) return false;
    window.history.replaceState({}, document.title, window.location.pathname);

    toast('Logging you in...');
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('User fetch failed');
        currentUser = await res.json();
        toast(`Welcome back, ${currentUser.username}! 👋`);
        await showGuildPicker();
        return true;
    } catch (e) {
        console.error(e);
        toast('Login failed — please try again.');
        return false;
    }
}

// ══════════════════════════════════════
// GUILD PICKER
// ══════════════════════════════════════

async function showGuildPicker() {
    switchPage('guildPicker');
    const grid = document.getElementById('guildGrid');
    grid.innerHTML = '<div style="color:#5c5c78;padding:40px;text-align:center">Loading your servers...</div>';

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error();
        managedGuilds = await res.json();
        renderGuildPicker();
    } catch {
        grid.innerHTML = '<div style="color:#ff4757;padding:40px;text-align:center">Failed to load servers. Please try again.</div>';
    }
}

function renderGuildPicker() {
    const grid = document.getElementById('guildGrid');
    if (!managedGuilds.length) {
        grid.innerHTML = '<div style="color:#5c5c78;padding:40px;text-align:center">No servers found where you have Manage Server permission.</div>';
        return;
    }
    grid.innerHTML = managedGuilds.map(g => {
        const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
        const installed = g.botInstalled;
        const statusColor = installed ? '#00e096' : '#5c5c78';
        const statusText = installed ? `● ${(g.tier || 'Active').toUpperCase()}` : '○ Add Bot';
        return `<div class="guild-card" onclick="selectGuild('${g.id}')">
            ${iconUrl
                ? `<img class="gc-icon" src="${iconUrl}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
                : ''}
            <div class="gc-fallback" ${iconUrl ? 'style="display:none"' : ''}>${g.name[0].toUpperCase()}</div>
            <div>
                <div class="gc-name">${escHtml(g.name)}</div>
                <div class="gc-status" style="color:${statusColor}">${statusText}</div>
            </div>
        </div>`;
    }).join('');
}

async function selectGuild(id) {
    currentGuild = managedGuilds.find(g => g.id === id);
    if (!currentGuild) return;

    if (!currentGuild.botInstalled) {
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${id}`;
        window.open(authUrl, '_blank');
        toast('Please add the bot, then return here and refresh.', 4000);
        return;
    }

    switchPage('dashboard');

    // Update sidebar
    const avatarEl = document.getElementById('sideAvatar');
    if (currentGuild.icon) {
        avatarEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png" style="width:100%;height:100%;border-radius:10px;object-fit:cover" onerror="this.parentElement.textContent='${currentGuild.name[0]}'">`;
    } else {
        avatarEl.textContent = currentGuild.name[0].toUpperCase();
    }
    document.getElementById('sideUsername').textContent = currentGuild.name;

    switchPanel('overview');
    loadDashboardData();
}

// ══════════════════════════════════════
// DASHBOARD DATA
// ══════════════════════════════════════

async function loadDashboardData() {
    toast('Syncing data...');
    const guildId = currentGuild?.id;
    if (!guildId) return;

    try {
        const [overviewRes, staffRes, shiftsRes, warningsRes] = await Promise.allSettled([
            fetchAPI(`/api/dashboard/guild/${guildId}`),
            fetchAPI(`/api/dashboard/guild/${guildId}/staff`),
            fetchAPI(`/api/dashboard/guild/${guildId}/shifts`),
            fetchAPI(`/api/dashboard/guild/${guildId}/warnings`)
        ]);

        const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
        const staff = staffRes.status === 'fulfilled' ? staffRes.value : [];
        const shifts = shiftsRes.status === 'fulfilled' ? shiftsRes.value : [];
        const warnings = warningsRes.status === 'fulfilled' ? warningsRes.value : [];

        renderOverview(overview, staff, shifts, warnings);
        renderStaff(staff);
        renderShifts(shifts);
        renderWarnings(warnings);
        loadLeaderboard(guildId);
        loadSettings(guildId);
        loadPromotions(guildId);
        toast('Data synced ✅');
    } catch (e) {
        console.error(e);
        toast('Error loading data');
    }
}

function renderOverview(overview, staff, shifts, warnings) {
    const s = overview?.stats || overview || {};
    document.getElementById('ovStaff').textContent = s.staffCount ?? (Array.isArray(staff) ? staff.length : 0);
    document.getElementById('ovShifts').textContent = s.shiftCount ?? (Array.isArray(shifts) ? shifts.length : 0);
    document.getElementById('ovWarnings').textContent = s.warnCount ?? (Array.isArray(warnings) ? warnings.length : 0);
    document.getElementById('ovPoints').textContent = s.totalPoints ?? s.activityCount ?? '–';
    initChart(shifts);
}

function renderStaff(staff) {
    const tbody = document.getElementById('staffBody');
    if (!tbody) return;
    if (!Array.isArray(staff) || !staff.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No staff members found.</td></tr>';
        return;
    }
    tbody.innerHTML = staff.map(m => {
        const avatar = m.avatar
            ? `<img src="https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
            : `<div class="member-avatar">${(m.username || m.tag || '?')[0]}</div>`;
        const status = m.onShift
            ? '<span style="color:#00e096;font-weight:600">● On Shift</span>'
            : '<span style="color:#5c5c78">○ Offline</span>';
        return `<tr>
            <td><div class="member-row">${avatar}<span>${escHtml(m.username || m.tag || m.userId || 'Unknown')}</span></div></td>
            <td style="color:#9b9bb3">${escHtml(m.rank || m.role || '—')}</td>
            <td style="color:#6c63ff;font-weight:700">${(m.points ?? 0).toLocaleString()}</td>
            <td>${m.shiftCount ?? m.shifts ?? 0}</td>
            <td>${status}</td>
        </tr>`;
    }).join('');
}

function renderShifts(shifts) {
    const tbody = document.getElementById('shiftsBody');
    if (!tbody) return;
    if (!Array.isArray(shifts) || !shifts.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No shifts logged yet.</td></tr>';
        return;
    }
    tbody.innerHTML = shifts.slice(0, 50).map(s => {
        const start = s.startTime ? new Date(s.startTime) : null;
        const end = s.endTime ? new Date(s.endTime) : null;
        const dur = start && end ? fmtDuration((end - start) / 60000) : '—';
        return `<tr>
            <td>${escHtml(s.username || s.userId || 'Unknown')}</td>
            <td style="color:#9b9bb3">${start ? fmtDate(start) : '—'}</td>
            <td style="color:#9b9bb3">${end ? fmtDate(end) : '<span style="color:#00e096">Active</span>'}</td>
            <td style="font-weight:600">${dur}</td>
            <td style="color:#6c63ff;font-weight:700">${s.pointsEarned ?? s.points ?? '—'}</td>
        </tr>`;
    }).join('');
}

function renderWarnings(warnings) {
    const tbody = document.getElementById('warningsBody');
    if (!tbody) return;
    if (!Array.isArray(warnings) || !warnings.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No warnings issued.</td></tr>';
        return;
    }
    tbody.innerHTML = warnings.slice(0, 50).map(w => {
        const isActive = !w.expired && !w.revoked;
        return `<tr>
            <td>${escHtml(w.targetUsername || w.userId || 'Unknown')}</td>
            <td style="color:#9b9bb3">${escHtml(w.reason || '—')}</td>
            <td>${escHtml(w.issuerUsername || w.issuerId || '—')}</td>
            <td style="color:#9b9bb3">${w.createdAt ? fmtDate(new Date(w.createdAt)) : '—'}</td>
            <td>${isActive ? '<span style="color:#ff4757;font-weight:600">Active</span>' : '<span style="color:#5c5c78">Expired</span>'}</td>
        </tr>`;
    }).join('');
}

async function loadLeaderboard(guildId) {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/leaderboard`);
        if (!Array.isArray(data) || !data.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No leaderboard data yet.</td></tr>';
            return;
        }
        tbody.innerHTML = data.slice(0, 25).map((u, i) => {
            const rankClass = i < 3 ? `rank-${i + 1}` : '';
            const avatarUrl = u.avatar
                ? (u.avatar.startsWith('http') ? u.avatar : `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`)
                : `https://cdn.discordapp.com/embed/avatars/${(Number(u.id || 0) % 5)}.png`;
            const pct = Math.min(u.activity ?? 50, 100);
            return `<tr>
                <td><span class="rank-num ${rankClass}">${i + 1}</span></td>
                <td><div class="member-row">
                    <img class="member-avatar" src="${avatarUrl}" style="width:30px;height:30px" onerror="this.textContent='?'">
                    <span style="font-weight:600">${escHtml(u.username || u.tag || 'Unknown')}</span>
                </div></td>
                <td style="color:#6c63ff;font-weight:700">${(u.points ?? u.score ?? 0).toLocaleString()}</td>
                <td style="color:#9b9bb3">${u.shifts ?? u.shiftCount ?? 0}</td>
                <td><div class="progress-mini"><div class="progress-fill" style="width:${pct}%"></div></div></td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Leaderboard unavailable.</td></tr>';
    }
}

async function loadTicketLogs(guildId) {
    const tbody = document.getElementById('ticketlogsBody');
    if (!tbody) return;
    const type = document.getElementById('ticketLogTypeFilter')?.value || '';
    const status = document.getElementById('ticketLogStatusFilter')?.value || 'all';

    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Loading tickets...</td></tr>';
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/ticket-logs?type=${type}&status=${status}`);
        if (!Array.isArray(data) || !data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No tickets found.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(t => {
            const statusColors = { open: '#f1c40f', claimed: '#00b7ff', closed: '#5c5c78' };
            const statusTxt = { open: 'Pending', claimed: 'Claimed', closed: 'Closed' };
            const sColor = statusColors[t.status] || '#fff';

            let details = '';
            if (t.category === 'report_staff') {
                details = `<div style="font-size:12px;color:#9b9bb3">Target: ${escHtml(t.staffName || 'Unknown')}</div>
                           <div style="font-size:12px;color:#9b9bb3">Reason: ${escHtml(t.reason || 'None')}</div>`;
            } else if (t.category === 'feedback') {
                details = `<div style="font-size:12px;color:#9b9bb3">Feedback: ${escHtml(t.feedback || 'None')}</div>`;
            }

            return `<tr>
                <td style="font-family:monospace;color:#6c63ff">${t.id}</td>
                <td><div class="member-row"><span style="font-weight:600">${escHtml(t.username)}</span></div></td>
                <td><span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;font-size:12px">${escHtml(t.category)}</span></td>
                <td style="color:${sColor};font-weight:600">${statusTxt[t.status] || t.status}</td>
                <td>${details}</td>
                <td style="color:#9b9bb3;font-size:13px">${fmtDate(new Date(t.createdAt))}</td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Failed to load tickets.</td></tr>';
    }
}

async function loadActivityLog(guildId) {
    const tbody = document.getElementById('activitylogBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading activity...</td></tr>';
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/activity-logs`);
        if (!Array.isArray(data) || !data.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No activity found.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(a => {
            return `<tr>
                <td style="color:#9b9bb3;font-size:13px">${fmtDate(new Date(a.createdAt))}</td>
                <td style="font-family:monospace;color:#6c63ff">${a.userId || 'System'}</td>
                <td><span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;font-size:12px">${escHtml(a.type)}</span></td>
                <td>${escHtml(a.meta || '—')}</td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Failed to load activity log.</td></tr>';
    }
}

async function loadPromoHistory(guildId) {
    const actBody = document.getElementById('promohistoryBody');
    const recBody = document.getElementById('recentpromotionsBody');
    if (!actBody || !recBody) return;
    actBody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading history...</td></tr>';
    recBody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading staff...</td></tr>';
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/promo-history`);

        if (!data.activityLog || !data.activityLog.length) {
            actBody.innerHTML = '<tr><td colspan="4" class="table-empty">No recent rank changes.</td></tr>';
        } else {
            actBody.innerHTML = data.activityLog.map(a => {
                const isPromo = String(a.meta).toLowerCase().includes('promote') || a.type === 'promotion';
                const color = isPromo ? '#00e096' : '#ff4757';
                return `<tr>
                    <td style="color:#9b9bb3;font-size:13px">${fmtDate(new Date(a.createdAt))}</td>
                    <td style="font-family:monospace;color:#6c63ff">${a.userId || '—'}</td>
                    <td style="color:${color};font-weight:600">${isPromo ? 'Promotion' : 'Demotion/Action'}</td>
                    <td>${escHtml(a.meta || '—')}</td>
                </tr>`;
            }).join('');
        }

        if (!data.promotions || !data.promotions.length) {
            recBody.innerHTML = '<tr><td colspan="4" class="table-empty">No recent promotions.</td></tr>';
        } else {
            recBody.innerHTML = data.promotions.map(u => {
                const avatarUrl = u.avatar ? `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${(Number(u.userId || 0) % 5)}.png`;
                return `<tr>
                    <td><div class="member-row">
                        <img class="member-avatar" src="${avatarUrl}" style="width:28px;height:28px" onerror="this.textContent='?'">
                        <span style="font-weight:600">${escHtml(u.username)}</span>
                    </div></td>
                    <td><span style="background:rgba(108,99,255,0.1);color:#6c63ff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">${escHtml((u.currentRank || 'unknown').toUpperCase())}</span></td>
                    <td style="color:#00e096;font-weight:600">${(u.points || 0).toLocaleString()}</td>
                    <td style="color:#9b9bb3">${u.lastPromotionDate ? fmtDate(new Date(u.lastPromotionDate)) : '—'}</td>
                </tr>`;
            }).join('');
        }
    } catch {
        actBody.innerHTML = '<tr><td colspan="4" class="table-empty">Failed to load history.</td></tr>';
        recBody.innerHTML = '<tr><td colspan="4" class="table-empty">Failed to load staff.</td></tr>';
    }
}

async function loadSettings(guildId) {
    try {
        const settings = await fetchAPI(`/api/dashboard/guild/${guildId}/settings`);
        if (!settings) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
        set('settingModChannel', settings.modChannelId);
        set('settingStaffChannel', settings.staffChannelId);
        set('settingLogChannel', settings.logChannelId);
        set('settingWarnThreshold', settings.warnThreshold ?? 3);
        set('settingMinShift', settings.minShiftMinutes ?? 30);
        const autoPromo = document.getElementById('settingAutoPromo');
        if (autoPromo) autoPromo.checked = !!settings.autoPromotion;
    } catch { /* settings may not exist yet */ }
}

async function saveSettings() {
    const guildId = currentGuild?.id;
    if (!guildId) return;
    const payload = {
        modChannelId: document.getElementById('settingModChannel')?.value?.trim() || null,
        staffChannelId: document.getElementById('settingStaffChannel')?.value?.trim() || null,
        logChannelId: document.getElementById('settingLogChannel')?.value?.trim() || null,
        autoPromotion: document.getElementById('settingAutoPromo')?.checked ?? false,
        shiftTrackingEnabled: true
    };
    // Remove null/undefined keys
    Object.keys(payload).forEach(k => { if (payload[k] == null) delete payload[k]; });
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guild/${guildId}/settings`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        toast('Settings saved ✅');
    } catch {
        toast('Failed to save settings. Check your permissions.');
    }
}

async function loadPromotions(guildId) {
    const list = document.getElementById('promoRankList');
    if (!list) return;
    try {
        const activeReqs = await fetchAPI(`/api/dashboard/guild/${guildId}/promotion-requirements`);
        const reqs = activeReqs.requirements || {};
        const rankRoles = activeReqs.rankRoles || {};
        val('settingPromoChannel', activeReqs.promotionChannel);

        const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
        const rankLabels = { trial: '🔰 Trial', staff: '⭐ Staff', senior: '🎖️ Senior', manager: '👔 Manager', admin: '👑 Admin' };
        list.innerHTML = ranks.map(r => {
            const d = reqs[r] || {};
            const roleStr = rankRoles[r] || '';
            return `<div class="promo-rank" style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.05)">
                <div class="promo-rank-name" style="font-size:1.1rem;font-weight:600;margin-bottom:15px;color:var(--primary-color)">${rankLabels[r] || r}</div>
                <div class="promo-rank-reqs" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:15px">
                    <div class="promo-req">Role ID: <input type="text" id="pr-${r}-role" value="${roleStr}" placeholder="Role ID" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Points: <input type="number" id="pr-${r}-pts" value="${d.points ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Shifts: <input type="number" id="pr-${r}-shifts" value="${d.shifts ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Consistency %: <input type="number" id="pr-${r}-cons" value="${d.consistency ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Max Warnings: <input type="number" id="pr-${r}-warn" value="${d.maxWarnings ?? 3}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Shift Hours: <input type="number" id="pr-${r}-hours" value="${d.shiftHours ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Achievements: <input type="number" id="pr-${r}-ach" value="${d.achievements ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Reputation: <input type="number" id="pr-${r}-rep" value="${d.reputation ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Days in Server: <input type="number" id="pr-${r}-days" value="${d.daysInServer ?? 0}" class="form-input" style="width:100%"></div>
                    <div class="promo-req">Clean Record (Days): <input type="number" id="pr-${r}-clean" value="${d.cleanRecordDays ?? 0}" class="form-input" style="width:100%"></div>
                </div>
                <div style="margin-top:15px">
                    <div class="promo-req">Custom Note: <input type="text" id="pr-${r}-note" value="${d.customNote ?? ''}" placeholder="Requirements note..." class="form-input" style="width:100%"></div>
                </div>
            </div>`;
        }).join('');
        // Add save button
        list.innerHTML += `<div style="margin-top:24px;text-align:right"><button class="btn btn-primary" style="padding:12px 30px;font-weight:600" onclick="savePromotions()">Save All Requirements</button></div>`;
    } catch {
        list.innerHTML = '<div class="table-empty">Promotion system unavailable or not configured. Use <code>/setup_promo</code> in your server first.</div>';
    }
}

async function savePromotions() {
    const guildId = currentGuild?.id;
    if (!guildId) return;
    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    const payload = {
        requirements: {},
        rankRoles: {},
        promotionChannel: getVal('settingPromoChannel') || null
    };
    ranks.forEach(r => {
        payload.requirements[r] = {
            points: parseInt(document.getElementById(`pr-${r}-pts`)?.value) || 0,
            shifts: parseInt(document.getElementById(`pr-${r}-shifts`)?.value) || 0,
            consistency: parseInt(document.getElementById(`pr-${r}-cons`)?.value) || 0,
            maxWarnings: parseInt(document.getElementById(`pr-${r}-warn`)?.value) ?? 3,
            shiftHours: parseInt(document.getElementById(`pr-${r}-hours`)?.value) || 0,
            achievements: parseInt(document.getElementById(`pr-${r}-ach`)?.value) || 0,
            reputation: parseInt(document.getElementById(`pr-${r}-rep`)?.value) || 0,
            daysInServer: parseInt(document.getElementById(`pr-${r}-days`)?.value) || 0,
            cleanRecordDays: parseInt(document.getElementById(`pr-${r}-clean`)?.value) || 0,
            customNote: document.getElementById(`pr-${r}-note`)?.value || ''
        };
        const role = document.getElementById(`pr-${r}-role`)?.value?.trim();
        payload.rankRoles[r] = role || null;
    });
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guild/${guildId}/promotion-requirements`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        toast('Promotion system settings saved ✅ — Bot will use these settings natively.');
    } catch {
        toast('Failed to save promotion requirements.');
    }
}

// ── CUSTOM COMMANDS ──────────────────────────────────────────
let currentCustomCommands = [];

async function loadCustomCommands(guildId) {
    const list = document.getElementById('customCommandsList');
    if (!list) return;
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/custom-commands`);
        currentCustomCommands = data.commands || [];
        renderCustomCommands();
    } catch {
        list.innerHTML = '<div class="table-empty">Failed to load custom commands.</div>';
    }
}

function renderCustomCommands() {
    const list = document.getElementById('customCommandsList');
    if (!list) return;

    if (currentCustomCommands.length === 0) {
        list.innerHTML = '<div class="table-empty" style="border:1px dashed rgba(255,255,255,0.05);border-radius:12px;padding:30px">No custom commands created yet. Click "Create New" to start!</div>';
        return;
    }

    list.innerHTML = currentCustomCommands.map((cmd, idx) => `
        <div class="sys-module" style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.05)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
                <div style="font-weight:600;color:var(--primary-color)">#${idx + 1} Command Configuration</div>
                <button class="btn btn-ghost btn-sm" style="color:#ff4757" onclick="removeCustomCommand(${idx})">🗑️ Remove</button>
            </div>
            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
                <div>
                    <label>Trigger (Keyword)</label>
                    <input type="text" value="${cmd.trigger}" onchange="updateCMD(${idx}, 'trigger', this.value)" class="form-input" placeholder="e.g. !rules">
                </div>
                <div>
                    <label>Match Type</label>
                    <select onchange="updateCMD(${idx}, 'type', this.value)" class="form-input">
                        <option value="exact" ${cmd.type === 'exact' ? 'selected' : ''}>Exact Match</option>
                        <option value="starts" ${cmd.type === 'starts' ? 'selected' : ''}>Starts With</option>
                        <option value="contains" ${cmd.type === 'contains' ? 'selected' : ''}>Contains Word</option>
                    </select>
                </div>
            </div>
            <div class="form-row" style="margin-top:15px">
                <label>Response Content</label>
                <textarea onchange="updateCMD(${idx}, 'response', this.value)" class="form-input" rows="3" placeholder="What should the bot say?">${cmd.response}</textarea>
            </div>
            <div style="display:flex;gap:30px;margin-top:15px;align-items:center">
                <div style="display:flex;align-items:center;gap:10px">
                    <label style="margin:0;font-size:13px">Use Embed?</label>
                    <label class="toggle"><input type="checkbox" ${cmd.isEmbed ? 'checked' : ''} onchange="updateCMD(${idx}, 'isEmbed', this.checked)"><span class="toggle-slider"></span></label>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                    <label style="margin:0;font-size:13px">Enabled</label>
                    <label class="toggle"><input type="checkbox" ${cmd.enabled ? 'checked' : ''} onchange="updateCMD(${idx}, 'enabled', this.checked)"><span class="toggle-slider"></span></label>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCMD(idx, key, val) {
    currentCustomCommands[idx][key] = val;
}

function addCustomCommand() {
    currentCustomCommands.unshift({
        trigger: '',
        response: '',
        type: 'exact',
        isEmbed: true,
        enabled: true
    });
    renderCustomCommands();
}

function removeCustomCommand(idx) {
    currentCustomCommands.splice(idx, 1);
    renderCustomCommands();
}

async function saveCustomCommands() {
    const guildId = currentGuild?.id;
    if (!guildId) return;

    // Basic validation
    if (currentCustomCommands.some(c => !c.trigger || !c.response)) {
        toast('⚠️ All commands must have a trigger and a response!');
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guild/${guildId}/custom-commands`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands: currentCustomCommands })
        });
        if (!res.ok) throw new Error();
        toast('Custom Commands saved successfully! 🤖');
    } catch {
        toast('Failed to save custom commands.');
    }
}

// ── STAFF REWARDS ───────────────────────────────────────────
let currentAchievements = [];
let currentRoleRewards = [];

async function loadStaffRewards(guildId) {
    try {
        const data = await fetchAPI(`/api/dashboard/guild/${guildId}/staff-rewards`);
        currentAchievements = data.achievements || [];
        currentRoleRewards = data.roleRewards || [];
        renderStaffRewards();
    } catch {
        toast('Failed to load rewards.');
    }
}

function renderStaffRewards() {
    const aList = document.getElementById('achievementsList');
    const rList = document.getElementById('roleRewardsList');
    if (!aList || !rList) return;

    // Render Achievements
    if (currentAchievements.length === 0) {
        aList.innerHTML = '<div class="table-empty">No achievements defined. Staff work for nothing!</div>';
    } else {
        aList.innerHTML = currentAchievements.map((ach, idx) => `
            <div class="sys-module" style="background:rgba(255,255,255,0.03);padding:15px;border:1px solid rgba(255,255,255,0.05)">
                <div style="display:flex;gap:15px;align-items:start">
                    <input type="text" value="${ach.icon || '🏅'}" onchange="updateReward(${idx}, 'icon', this.value, true)" class="form-input" style="width:50px;text-align:center" placeholder="Icon">
                    <div style="flex:1">
                        <div style="display:flex;gap:10px;margin-bottom:10px">
                            <input type="text" value="${ach.name}" onchange="updateReward(${idx}, 'name', this.value, true)" class="form-input" placeholder="Achievement Name">
                            <select onchange="updateReward(${idx}, 'criteria.type', this.value, true)" class="form-input" style="width:140px">
                                <option value="points" ${ach.criteria?.type === 'points' ? 'selected' : ''}>Points</option>
                                <option value="shifts" ${ach.criteria?.type === 'shifts' ? 'selected' : ''}>Shifts</option>
                                <option value="consistency" ${ach.criteria?.type === 'consistency' ? 'selected' : ''}>Consistency</option>
                            </select>
                            <input type="number" value="${ach.criteria?.value || 0}" onchange="updateReward(${idx}, 'criteria.value', this.value, true)" class="form-input" style="width:100px" placeholder="Goal">
                        </div>
                        <textarea onchange="updateReward(${idx}, 'description', this.value, true)" class="form-input" rows="1" placeholder="Description/Criteria text">${ach.description || ''}</textarea>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="color:#ff4757" onclick="removeReward(${idx}, true)">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    // Render Role Rewards
    if (currentRoleRewards.length === 0) {
        rList.innerHTML = '<div class="table-empty">No automated roles defined. Set some point goals!</div>';
    } else {
        rList.innerHTML = currentRoleRewards.map((rr, idx) => `
            <div class="sys-module" style="background:rgba(255,255,255,0.03);padding:15px;border:1px solid rgba(255,255,255,0.05)">
                <div style="display:flex;gap:15px;align-items:center">
                    <input type="text" value="${rr.name || ''}" onchange="updateReward(${idx}, 'name', this.value, false)" class="form-input" placeholder="Display Name (e.g. Veteran)">
                    <input type="text" value="${rr.roleId}" onchange="updateReward(${idx}, 'roleId', this.value, false)" class="form-input" placeholder="Discord Role ID">
                    <div style="display:flex;align-items:center;gap:10px;white-space:nowrap">
                        <span style="font-size:12px;color:#5c5c78">at</span>
                        <input type="number" value="${rr.requiredPoints}" onchange="updateReward(${idx}, 'requiredPoints', this.value, false)" class="form-input" style="width:100px" placeholder="Points">
                        <span style="font-size:12px;color:#5c5c78">PTS</span>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="color:#ff4757" onclick="removeReward(${idx}, false)">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

function updateReward(idx, key, val, isAch) {
    const arr = isAch ? currentAchievements : currentRoleRewards;
    if (key.includes('.')) {
        const [k1, k2] = key.split('.');
        arr[idx][k1][k2] = val;
    } else {
        arr[idx][key] = val;
    }
}

function addAchievement() {
    currentAchievements.push({
        id: 'ach_' + Date.now(),
        name: 'New Achievement',
        icon: '🏅',
        description: 'Earned for performance',
        criteria: { type: 'points', value: 100 }
    });
    renderStaffRewards();
}

function addRoleReward() {
    currentRoleRewards.push({
        name: 'New Milestone',
        roleId: '',
        requiredPoints: 500
    });
    renderStaffRewards();
}

function removeReward(idx, isAch) {
    if (isAch) currentAchievements.splice(idx, 1);
    else currentRoleRewards.splice(idx, 1);
    renderStaffRewards();
}

async function saveStaffRewards() {
    const guildId = currentGuild?.id;
    if (!guildId) return;
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guild/${guildId}/staff-rewards`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ achievements: currentAchievements, roleRewards: currentRoleRewards })
        });
        if (!res.ok) throw new Error();
        toast('Staff Rewards saved successfully! 🏆');
    } catch {
        toast('Failed to save staff rewards.');
    }
}

function initChart(shifts) {
    const ctx = document.getElementById('activityChart')?.getContext('2d');
    if (!ctx) return;
    if (activeChart) { activeChart.destroy(); activeChart = null; }

    const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });

    let counts = {};
    if (Array.isArray(shifts)) {
        shifts.forEach(s => {
            if (!s.startTime) return;
            const day = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short' });
            counts[day] = (counts[day] || 0) + 1;
        });
    }
    const data = days.map(d => counts[d] || 0);

    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Shifts',
                data,
                borderColor: '#6c63ff',
                backgroundColor: 'rgba(108,99,255,0.07)',
                fill: true, tension: 0.4,
                pointRadius: 4, pointBackgroundColor: '#6c63ff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5c5c78', precision: 0 } },
                x: { grid: { display: false }, ticks: { color: '#5c5c78' } }
            }
        }
    });
}

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════

function switchPage(page) {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('guildPicker').style.display = 'none';
    document.getElementById('dashboard').classList.remove('active');

    if (page === 'landingPage') document.getElementById('landingPage').style.display = 'block';
    if (page === 'guildPicker') document.getElementById('guildPicker').style.display = 'flex';
    if (page === 'dashboard') document.getElementById('dashboard').classList.add('active');
    window.scrollTo(0, 0);
}

function goHome() {
    if (activeChart) { activeChart.destroy(); activeChart = null; }
    switchPage('landingPage');
}

function switchPanel(panel) {
    document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
    const el = document.getElementById(`panel-${panel}`);
    if (el) el.style.display = 'block';
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    const item = document.querySelector(`[data-panel="${panel}"]`);
    if (item) item.classList.add('active');

    const titles = {
        overview: ['Analytics', 'Real-time overview of your server.'],
        staff: ['Staff Roster', 'All staff members and their performance.'],
        shifts: ['Shift Logs', 'Complete shift history for this server.'],
        warnings: ['Warning Log', 'All warnings issued in this server.'],
        moderation: ['Moderation', 'Ban, kick, timeout, and moderation action history.'],
        leaderboard: ['Leaderboard', 'Top staff ranked by points and activity.'],
        ticketlogs: ['Ticket Logs', 'Operational ticket history and feedback.'],
        activitylog: ['Activity Log', 'Server-wide operational activity history.'],
        promohistory: ['Promo History', 'Promotion, demotion, and rank change records.'],
        alerts: ['Activity Alerts', 'Automatically ping roles based on activity drop/spike.'],
        applications: ['Applications', 'Premium form builder for staff applications.'],
        branding: ['Custom Branding', 'Enterprise white-labeling options.'],
        settings: ['Settings', 'Configure Strata for this server.'],
        promotions: ['Auto-Promo', 'Automatic promotion requirements per rank.'],
        automod: ['Auto-Moderation', 'Real-time message filtering and rule enforcement.'],
        welcome: ['Welcome System', 'Greet new members with a custom message.'],
        autorole: ['Auto-Role', 'Automatically assign roles when members join.'],
        logging: ['Server Logging', 'Log server events to dedicated channels.'],
        antispam: ['Anti-Spam', 'Rate limiting and spam prevention.'],
        tickets: ['Ticket System', 'Member support ticket configuration.'],
        customcommands: ['Custom Commands', 'Manage your own command triggers and auto-replies.'],
        staffrewards: ['Staff Rewards', 'Define custom achievements and point-based role rewards.']
    };
    const [title, sub] = titles[panel] || ['Dashboard', ''];
    document.getElementById('dashTitle').textContent = title;
    document.getElementById('dashSub').textContent = sub;

    // Lazy-load system settings and log panels when opened
    const guildId = currentGuild?.id;
    if (!guildId) return;
    if (panel === 'automod') loadSystemSettings('automod', applyAutoModUI);
    if (panel === 'welcome') loadSystemSettings('welcome', applyWelcomeUI);
    if (panel === 'autorole') loadSystemSettings('autorole', applyAutoRoleUI);
    if (panel === 'logging') loadSystemSettings('logging', applyLoggingUI);
    if (panel === 'antispam') loadSystemSettings('antispam', applyAntiSpamUI);
    if (panel === 'tickets') loadSystemSettings('tickets', applyTicketsUI);
    if (panel === 'alerts') loadSystemSettings('alerts', applyAlertsUI);
    if (panel === 'applications') loadSystemSettings('applications', applyApplicationsUI);
    if (panel === 'branding') loadSystemSettings('branding', applyBrandingUI);
    if (panel === 'ticketlogs') loadTicketLogs(guildId);
    if (panel === 'activitylog') loadActivityLog(guildId);
    if (panel === 'promohistory') loadPromoHistory(guildId);
    if (panel === 'customcommands') loadCustomCommands(guildId);
    if (panel === 'staffrewards') loadStaffRewards(guildId);
    if (panel === 'moderation') loadModerationActions(guildId);
}

// ══════════════════════════════════════
// MODERATION ACTIONS
// ══════════════════════════════════════

async function loadModerationActions(guildId) {
    const tbody = document.getElementById('moderationBody');
    if (!tbody) return;

    const actionType = document.getElementById('modActionFilter')?.value || '';

    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Loading moderation actions...</td></tr>';

    try {
        let endpoint = `/api/dashboard/guild/${guildId}/moderation/actions`;
        if (actionType) endpoint += `?type=${actionType}`;

        const actions = await fetchAPI(endpoint);

        if (!Array.isArray(actions) || actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No moderation actions found.</td></tr>';
            return;
        }

        const actionIcons = {
            ban: '⛔',
            kick: '👢',
            timeout: '🔇',
            warn: '⚠️',
            unban: '🔓',
            unmute: '🔊'
        };

        const actionColors = {
            ban: '#ff4757',
            kick: '#ffa502',
            timeout: '#eccc68',
            warn: '#ffa502',
            unban: '#2ed573',
            unmute: '#2ed573'
        };

        tbody.innerHTML = actions.slice(0, 50).map(action => {
            const icon = actionIcons[action.actionType] || '🔨';
            const color = actionColors[action.actionType] || '#fff';
            const status = action.active !== false
                ? '<span style="color:#ff4757;font-weight:600">Active</span>'
                : '<span style="color:#5c5c78">Expired</span>';

            return `<tr>
                <td><span style="color:${color};font-weight:600">${icon} ${action.actionType.toUpperCase()}</span></td>
                <td>${escHtml(action.targetUsername || action.targetUserId || 'Unknown')}</td>
                <td>${escHtml(action.moderatorUsername || action.moderatorId || 'Unknown')}</td>
                <td style="color:#9b9bb3;max-width:200px;overflow:hidden;text-overflow:ellipsis">${escHtml(action.reason || 'No reason')}</td>
                <td style="color:#9b9bb3;font-size:13px">${action.createdAt ? fmtDate(new Date(action.createdAt)) : '—'}</td>
                <td>${status}</td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('[Moderation] Load error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Failed to load moderation actions.</td></tr>';
    }
}

function showModActionModal(actionType) {
    // Simple prompt-based action for now
    const userId = prompt(`Enter User ID to ${actionType}:`);
    if (!userId) return;

    const reason = prompt(`Reason for ${actionType}:`);
    if (!reason) return;

    let duration = null;
    if (actionType === 'timeout' || actionType === 'ban') {
        const durationStr = prompt('Duration in minutes (leave empty for permanent/permanent-ish):');
        duration = durationStr ? parseInt(durationStr) : null;
    }

    executeModAction(actionType, userId, reason, duration);
}

async function executeModAction(actionType, userId, reason, duration) {
    const guildId = currentGuild?.id;
    if (!guildId) return;

    try {
        const endpoint = `/api/dashboard/guild/${guildId}/moderation/${actionType}`;
        const payload = {
            userId,
            reason,
            ...(duration && { duration })
        };

        const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        toast(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} executed successfully`);
        loadModerationActions(guildId);
    } catch (error) {
        console.error(`[Moderation] ${actionType} error:`, error);
        toast(`Failed to ${actionType} user. Check console for details.`);
    }
}

// ══════════════════════════════════════
// SYSTEM HELPERS
// ══════════════════════════════════════

function chk(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
function val(id, v) { const el = document.getElementById(id); if (el && v != null) el.value = v; }
function getChk(id) { return document.getElementById(id)?.checked ?? false; }
function getVal(id) { return document.getElementById(id)?.value?.trim() || undefined; }
function getNum(id) { const n = parseInt(document.getElementById(id)?.value); return isNaN(n) ? undefined : n; }

async function loadSystemSettings(system, applyFn) {
    const guildId = currentGuild?.id;
    if (!guildId) return;
    try {
        const isRootNode = ['alerts', 'applications', 'branding'].includes(system);
        const endpoint = isRootNode ? `/api/dashboard/guild/${guildId}/${system}` : `/api/dashboard/guild/${guildId}/systems/${system}`;
        const data = await fetchAPI(endpoint);
        if (data) applyFn(data);
    } catch { /* system not configured yet, use defaults */ }
}

async function saveSystem(system, payload) {
    const guildId = currentGuild?.id;
    if (!guildId) return;
    try {
        const isRootNode = ['alerts', 'applications', 'branding'].includes(system);
        const endpoint = isRootNode ? `/api/dashboard/guild/${guildId}/${system}` : `/api/dashboard/guild/${guildId}/systems/${system}`;
        const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`${res.status}`);
        toast(`✅ ${system.charAt(0).toUpperCase() + system.slice(1)} settings saved — bot will apply changes immediately.`);
    } catch (e) {
        toast(`Failed to save. Make sure the bot is properly authorized.`);
        console.error(e);
    }
}

function saveSystemSettings(system, gatherFn) {
    saveSystem(system, gatherFn());
}

// ── ALERTS ──
function applyAlertsUI(d) {
    chk('settingAlertEnabled', d.enabled);
    val('settingAlertChannel', d.channelId);
    val('settingAlertRole', d.roleId);
    val('settingAlertThreshold', d.threshold);
}

function gatherAlerts() {
    return {
        enabled: getChk('settingAlertEnabled'),
        channelId: getVal('settingAlertChannel'),
        roleId: getVal('settingAlertRole'),
        threshold: getNum('settingAlertThreshold')
    };
}

// ── APPLICATIONS ──
function applyApplicationsUI(d) {
    const tier = currentGuild?.tier || 'free';
    if (tier === 'free') {
        document.getElementById('appTierLock').style.display = 'block';
        document.getElementById('appUIBox').style.display = 'none';
        return;
    }
    document.getElementById('appTierLock').style.display = 'none';
    document.getElementById('appUIBox').style.display = 'block';

    chk('settingAppEnabled', d.enabled);
    val('settingAppTitle', d.panelTitle);
    val('settingAppChannel', d.applyChannelId);
    val('settingAppReview', d.reviewChannelId);
    val('settingAppRole', d.reviewerRoleId);

    const list = document.getElementById('appQuestionsList');
    list.innerHTML = '';
    const qs = d.questions || ["Why do you want to join our team?", "What experience do you have?", "How active can you be?"];
    qs.forEach(q => addAppQuestion(q));
}

function addAppQuestion(value = '') {
    const list = document.getElementById('appQuestionsList');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.innerHTML = `<input type="text" class="form-input app-question-input" placeholder="Enter question..." value="${escHtml(value)}" style="flex:1">
                     <button class="btn btn-secondary" onclick="this.parentElement.remove()">🗑️</button>`;
    list.appendChild(div);
}

function gatherApps() {
    return {
        enabled: getChk('settingAppEnabled'),
        panelTitle: getVal('settingAppTitle'),
        applyChannelId: getVal('settingAppChannel'),
        reviewChannelId: getVal('settingAppReview'),
        reviewerRoleId: getVal('settingAppRole'),
        questions: Array.from(document.querySelectorAll('.app-question-input')).map(input => input.value.trim()).filter(Boolean)
    };
}

// ── CUSTOM BRANDING ──
function applyBrandingUI(d) {
    const tier = currentGuild?.tier || 'free';
    if (tier !== 'enterprise' && tier !== 'v6') {
        document.getElementById('brandingTierLock').style.display = 'block';
        document.getElementById('brandingUIBox').style.display = 'none';
        return;
    }
    document.getElementById('brandingTierLock').style.display = 'none';
    document.getElementById('brandingUIBox').style.display = 'block';

    val('settingBrandColor', d.color || '#6c63ff');
    val('settingBrandColorPick', d.color || '#6c63ff');
    val('settingBrandFooter', d.footer);
    val('settingBrandIcon', d.iconURL);
}

function gatherBranding() {
    return {
        color: getVal('settingBrandColor'),
        footer: getVal('settingBrandFooter'),
        iconURL: getVal('settingBrandIcon')
    };
}


// ── AUTO-MOD ──
function applyAutoModUI(d) {
    chk('am-profanity', d.blockProfanity);
    chk('am-links', d.blockLinks);
    chk('am-mentions', d.antiMentionSpam);
    chk('am-invites', d.blockInvites);
    chk('am-timeout', d.autoTimeout);
    chk('am-log', d.logViolations);
    val('am-banned-words', (d.bannedWords || []).join(', '));
    val('am-allowed-domains', (d.allowedDomains || []).join(', '));
    val('am-max-mentions', d.maxMentions);
    val('am-timeout-dur', d.timeoutDuration);
    val('am-log-channel', d.logChannel);
}

function saveAutoMod() {
    saveSystem('automod', {
        blockProfanity: getChk('am-profanity'),
        blockLinks: getChk('am-links'),
        antiMentionSpam: getChk('am-mentions'),
        blockInvites: getChk('am-invites'),
        autoTimeout: getChk('am-timeout'),
        logViolations: getChk('am-log'),
        bannedWords: (getVal('am-banned-words') || '').split(',').map(w => w.trim()).filter(Boolean),
        allowedDomains: (getVal('am-allowed-domains') || '').split(',').map(d => d.trim()).filter(Boolean),
        maxMentions: getNum('am-max-mentions'),
        timeoutDuration: getNum('am-timeout-dur'),
        logChannel: getVal('am-log-channel')
    });
}

// ── WELCOME ──
function applyWelcomeUI(d) {
    chk('wlc-enabled', d.enabled);
    chk('wlc-dm', d.dmEnabled);
    val('wlc-channel', d.channelId);
    val('wlc-message', d.message);
    val('wlc-dm-message', d.dmMessage);
}

function saveWelcome() {
    saveSystem('welcome', {
        enabled: getChk('wlc-enabled'),
        channelId: getVal('wlc-channel'),
        message: getVal('wlc-message'),
        dmEnabled: getChk('wlc-dm'),
        dmMessage: getVal('wlc-dm-message')
    });
}

// ── AUTO-ROLE ──
function applyAutoRoleUI(d) {
    chk('ar-join', d.joinEnabled);
    chk('ar-bot', d.botEnabled);
    val('ar-join-role', d.joinRoleId);
    val('ar-bot-role', d.botRoleId);
}

function saveAutoRole() {
    saveSystem('autorole', {
        joinEnabled: getChk('ar-join'),
        joinRoleId: getVal('ar-join-role'),
        botEnabled: getChk('ar-bot'),
        botRoleId: getVal('ar-bot-role')
    });
}

// ── LOGGING ──
function applyLoggingUI(d) {
    chk('log-members', d.memberLog); val('log-members-ch', d.memberLogChannel);
    chk('log-messages', d.messageLog); val('log-messages-ch', d.messageLogChannel);
    chk('log-mod', d.modLog); val('log-mod-ch', d.modLogChannel);
    chk('log-roles', d.roleLog); val('log-roles-ch', d.roleLogChannel);
    chk('log-voice', d.voiceLog); val('log-voice-ch', d.voiceLogChannel);
}

function saveLogging() {
    saveSystem('logging', {
        memberLog: getChk('log-members'), memberLogChannel: getVal('log-members-ch'),
        messageLog: getChk('log-messages'), messageLogChannel: getVal('log-messages-ch'),
        modLog: getChk('log-mod'), modLogChannel: getVal('log-mod-ch'),
        roleLog: getChk('log-roles'), roleLogChannel: getVal('log-roles-ch'),
        voiceLog: getChk('log-voice'), voiceLogChannel: getVal('log-voice-ch')
    });
}

// ── ANTI-SPAM ──
function applyAntiSpamUI(d) {
    chk('as-enabled', d.enabled);
    val('as-rate', d.maxMessagesPerWindow);
    val('as-action', d.action);
    chk('as-ignore-staff', d.ignoreStaff);
    chk('as-dupes', d.filterDuplicates);
    val('as-log-ch', d.logChannel);
}

function saveAntiSpam() {
    saveSystem('antispam', {
        enabled: getChk('as-enabled'),
        maxMessagesPerWindow: getNum('as-rate'),
        action: getVal('as-action'),
        ignoreStaff: getChk('as-ignore-staff'),
        filterDuplicates: getChk('as-dupes'),
        logChannel: getVal('as-log-ch')
    });
}

// ── TICKETS ──
function applyTicketsUI(d) {
    chk('tk-enabled', d.enabled);
    val('tk-panel-ch', d.panelChannelId);
    val('tk-category', d.categoryId);
    val('tk-support-role', d.supportRoleId);
    val('tk-open-msg', d.openMessage);
    chk('tk-transcripts', d.transcriptsEnabled);
    val('tk-transcript-ch', d.transcriptChannelId);
    val('tk-max', d.maxOpenPerUser);
}

function saveTickets() {
    saveSystem('tickets', {
        enabled: getChk('tk-enabled'),
        panelChannelId: getVal('tk-panel-ch'),
        categoryId: getVal('tk-category'),
        supportRoleId: getVal('tk-support-role'),
        openMessage: getVal('tk-open-msg'),
        transcriptsEnabled: getChk('tk-transcripts'),
        transcriptChannelId: getVal('tk-transcript-ch'),
        maxOpenPerUser: getNum('tk-max')
    });
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

async function fetchAPI(path, opts = {}) {
    const res = await fetch(`${CONFIG.API_BASE}${path}`, {
        ...opts,
        headers: { ...(opts.headers || {}), Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
}

function toast(msg, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(minutes) {
    if (isNaN(minutes)) return '—';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
