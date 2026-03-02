// ============================================================
// STRATA Website — Real Data App
// Connects to: https://your-bot-api-domain.com/api/dashboard
// Discord OAuth: https://discord.com/developers/applications
// ============================================================

// ── CONFIG — Update these with real values ──
const CONFIG = {
    // Your Discord Application Client ID from discord.com/developers/applications
    CLIENT_ID: '1381869614685356053',

    // Your deployed bot API base URL (e.g. https://api.yourdomain.com)
    // Leave as '' to use relative paths (if website and API are same domain)
    API_BASE: 'https://your-bot-api.railway.app',

    // Discord OAuth redirect URI — must be added in Discord Developer Portal > OAuth2 > Redirects
    get REDIRECT_URI() {
        return encodeURIComponent(window.location.origin + window.location.pathname);
    },

    get DISCORD_OAUTH_URL() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=token&scope=identify%20guilds`;
    }
};

// ── STATE ──
let currentUser = null;
let accessToken = null;
let allCommands = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    setupNavLinks();
    setupFilters();
    setupSearch();
    updateSlider(30);

    // Check for OAuth callback token in URL hash
    if (await checkOAuthCallback()) return; // already logged in, dashboard shown

    // Load public data
    loadPublicStats();
    loadCommands();
    animateStats();
});

// ── PARTICLES ──
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${Math.random() * 100}%;animation-duration:${8 + Math.random() * 12}s;animation-delay:${Math.random() * 10}s;width:${1 + Math.random() * 2}px;height:${1 + Math.random() * 2}px;`;
        container.appendChild(p);
    }
}

// ── PUBLIC STATS (real from /api/dashboard/stats) ──
async function loadPublicStats() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/stats`);
        if (res.ok) {
            const data = await res.json();
            // Update animated targets with real data
            window._realStats = {
                servers: data.guildCount || 2400,
                staff: data.staffCount || 18000,
                tickets: data.totalShifts || 95000,
                commands: allCommands.length || 271
            };
        }
    } catch { /* use animated defaults */ }
    animateStats();
}

// ── STAT ANIMATION ──
function animateStats() {
    const targets = window._realStats || { servers: 2400, staff: 18000, tickets: 95000, commands: 271 };
    Object.entries(targets).forEach(([key, target]) => {
        const el = document.getElementById('stat-' + key);
        if (!el) return;
        let cur = 0;
        const step = target / 50;
        const iv = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = Math.floor(cur).toLocaleString() + (key === 'commands' ? '' : '+');
            if (cur >= target) clearInterval(iv);
        }, 25);
    });
}

// ── COMMANDS ──
async function loadCommands() {
    try {
        const res = await fetch('./extracted_commands.json');
        if (res.ok) {
            allCommands = await res.json();
            renderCommands(allCommands);
            // update stat
            const el = document.getElementById('stat-commands');
            if (el) el.textContent = allCommands.length;
        }
    } catch { renderCommands([]); }
}

function renderCommands(cmds, filter = 'all', query = '') {
    const grid = document.getElementById('cmdGrid');
    if (!grid) return;

    let filtered = filter === 'all' ? cmds : cmds.filter(c => c.tier === filter || String(c.tier).startsWith(filter));
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }

    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--text3);text-align:center;padding:48px 0;font-size:.9rem">No commands found for "<strong>${query || filter}</strong>"</div>`;
        return;
    }

    grid.innerHTML = filtered.slice(0, 80).map(cmd => {
        const tier = cmd.tier || 'v1';
        const isPremium = ['v3', 'v4', 'v5'].some(v => String(tier).startsWith(v));
        const isEnterprise = ['v6', 'v7', 'v8'].some(v => String(tier).startsWith(v));
        const tierLabel = isEnterprise ? 'ENTERPRISE' : isPremium ? 'PREMIUM' : 'FREE';
        const desc = (cmd.description || 'No description').replace(/'/g, "\\'");
        return `
      <div class="cmd-item" onclick="showCmdModal('${(cmd.name || '').replace(/'/g, "\\'")}','${desc}','${tier}')">
        <div class="cmd-name">/${cmd.name || '?'}</div>
        <div class="cmd-desc">${cmd.description || 'No description available'}</div>
        <div class="cmd-tier tier-${tier}">${String(tier).toUpperCase()} · ${tierLabel}</div>
      </div>`;
    }).join('');
}

function showCmdModal(name, desc, tier) {
    const isPremium = ['v3', 'v4', 'v5'].some(v => tier.startsWith(v));
    const isEnterprise = ['v6', 'v7', 'v8'].some(v => tier.startsWith(v));
    const tierLabel = isEnterprise ? '🌟 Enterprise' : isPremium ? '💎 Premium' : '🆓 Free';
    document.getElementById('modalTitle').textContent = `/${name}`;
    document.getElementById('modalBody').innerHTML = `
    <p>${desc}</p>
    <p style="margin-top:14px"><strong>Tier:</strong> <span style="color:var(--accent)">${tier.toUpperCase()} — ${tierLabel}</span></p>
    ${(isPremium || isEnterprise) ? `<p style="margin-top:8px;color:var(--text3);font-size:.82rem">Requires a ${tierLabel} license. Use <code>/buy</code> in Discord to upgrade.</p>` : ''}
  `;
    openModal('cmdModal');
}

// ── FILTERS & SEARCH ──
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCommands(allCommands, btn.dataset.filter, document.getElementById('cmdSearch')?.value || '');
        });
    });
}
function setupSearch() {
    const input = document.getElementById('cmdSearch');
    if (!input) return;
    input.addEventListener('input', () => {
        const f = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        renderCommands(allCommands, f, input.value);
    });
}

// ── NAV ──
function setupNavLinks() {
    document.querySelectorAll('[data-scroll]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const t = document.getElementById(el.dataset.scroll);
            if (t) { t.scrollIntoView({ behavior: 'smooth' }); closeMobileMenu(); }
        });
    });
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu')?.classList.toggle('open');
}
function closeMobileMenu() {
    document.getElementById('mobileMenu')?.classList.remove('open');
}

// ── DISCORD OAUTH ──
function loginWithDiscord() {
    openModal('loginModal');
}

function doDiscordLogin() {
    // Redirect to real Discord OAuth
    window.location.href = CONFIG.DISCORD_OAUTH_URL;
}

async function checkOAuthCallback() {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return false;

    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get('access_token');
    if (!accessToken) return false;

    // Clear the hash from the URL
    window.history.replaceState({}, document.title, window.location.pathname);
    closeModal('loginModal');

    showToast('🔐 Verifying your Discord account...');

    // Fetch real Discord user
    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Discord API error');
        const discordUser = await res.json();

        // Fetch real staff data from bot API
        const staffRes = await fetch(`${CONFIG.API_BASE}/api/dashboard/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (staffRes.ok) {
            const staffData = await staffRes.json();
            currentUser = {
                id: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || 0) % 5}.png`,
                rank: staffData.staff?.rank || 'member',
                points: staffData.staff?.points || 0,
                consistency: staffData.staff?.consistency || 0,
                streak: staffData.staff?.streak || 0,
                achievements: staffData.staff?.achievements || [],
                warnings: staffData.staff?.warnings || 0
            };
        } else {
            // Just Discord data (user not in staff system yet)
            currentUser = {
                id: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=128`
                    : null,
                rank: 'member', points: 0, consistency: 0, streak: 0, achievements: [], warnings: 0
            };
        }

        showToast(`✅ Welcome, ${currentUser.username}!`);
        showDashboard();
        return true;
    } catch (err) {
        showToast('❌ Login failed. Please try again.');
        console.error('OAuth error:', err);
        return false;
    }
}

function logout() {
    currentUser = null;
    accessToken = null;
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('landingPage').style.display = '';
    document.getElementById('navUser').style.display = 'none';
    document.getElementById('navLoginBtn').style.display = '';
    showToast('👋 Logged out successfully');
}

// ── DASHBOARD ──
function showDashboard() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');

    // Update nav
    document.getElementById('navUser').style.display = 'flex';
    document.getElementById('navLoginBtn').style.display = 'none';
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = currentUser.username;

    renderDashboardHome();
    loadDashboardData();
}

function renderDashboardHome() {
    const u = currentUser;
    if (!u) return;

    setText('dashGreet', `Welcome back, ${u.username}! 👋`);
    setText('dashPts', u.points.toLocaleString());
    setText('dashRank', u.rank.toUpperCase());
    setText('dashConsistency', u.consistency + '%');
    setText('dashStreak', u.streak + ' days');
    setText('dashWarns', u.warnings);

    setBar('barPts', (u.points / 1000) * 100);
    setBar('barConsist', u.consistency);
    setBar('barShifts', 0); // updated when shifts load

    // Avatar
    if (u.avatar) {
        const av = document.getElementById('dashAvatarImg');
        if (av) { av.src = u.avatar; av.style.display = ''; }
        const av2 = document.getElementById('sideAvatarImg');
        if (av2) { av2.src = u.avatar; av2.style.display = ''; }
    }
    document.getElementById('sideUsername').textContent = u.username;
    document.getElementById('sideRank').textContent = u.rank.toUpperCase() + ' · STRATA';
}

async function loadDashboardData() {
    // Load staff list, shifts, promo, analytics in parallel
    const [staffData, shiftData, promoData, analyticsData] = await Promise.allSettled([
        fetchAPI('/api/dashboard/staff'),
        fetchAPI('/api/dashboard/shifts'),
        fetchAPI('/api/dashboard/promotion'),
        fetchAPI('/api/dashboard/analytics')
    ]);

    if (staffData.status === 'fulfilled') renderStaffTable(staffData.value);
    if (shiftData.status === 'fulfilled') renderShifts(shiftData.value);
    if (promoData.status === 'fulfilled') renderPromoTrack(promoData.value);
    if (analyticsData.status === 'fulfilled') renderAnalytics(analyticsData.value);

    renderAchievements();
}

async function fetchAPI(path) {
    const res = await fetch(`${CONFIG.API_BASE}${path}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    });
    if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
    return res.json();
}

function renderStaffTable(staff) {
    const tbody = document.getElementById('staffTbody');
    if (!tbody || !Array.isArray(staff)) return;
    tbody.innerHTML = staff.map(s => {
        const rankClass = ['admin', 'manager', 'senior'].includes(s.rank) ? s.rank : '';
        return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        ${s.avatar ? `<img src="https://cdn.discordapp.com/avatars/${s.userId}/${s.avatar}.webp?size=32" style="width:28px;height:28px;border-radius:50%">` : `<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700">${(s.username || '?')[0].toUpperCase()}</div>`}
        <span>${s.username || 'Unknown'}</span>
      </div></td>
      <td><span class="staff-rank ${rankClass}">${(s.rank || 'member').toUpperCase()}</span></td>
      <td>${(s.points || 0).toLocaleString()}</td>
      <td>${s.shiftCount || 0}</td>
      <td>${s.consistency || 0}%</td>
      <td><div class="prog-bar-wrap" style="width:80px"><div class="prog-bar-fill" style="width:${s.consistency || 0}%"></div></div></td>
    </tr>`;
    }).join('');
}

function renderShifts(shifts) {
    const tbody = document.getElementById('shiftTbody');
    if (!tbody || !Array.isArray(shifts)) return;
    if (!shifts.length) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--text3);text-align:center;padding:20px">No shifts recorded yet</td></tr>`; return; }

    shifts.forEach((s, i) => {
        if (i === 0 && currentUser) setBar('barShifts', Math.min(100, (shifts.length / 30) * 100));
    });

    tbody.innerHTML = shifts.map(s => {
        const d = new Date(s.startTime);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const statusColor = s.status === 'completed' ? 'var(--green)' : s.status === 'paused' ? 'var(--yellow)' : 'var(--text3)';
        const statusIcon = s.status === 'completed' ? '✅' : s.status === 'paused' ? '⏸️' : '🔵';
        return `<tr>
      <td>${dateStr}</td>
      <td>${s.hoursFormatted || 'N/A'}</td>
      <td>+${s.pointsEarned || 0} pts</td>
      <td style="color:${statusColor}">${statusIcon} ${(s.status || 'completed').charAt(0).toUpperCase() + (s.status || 'completed').slice(1)}</td>
    </tr>`;
    }).join('');
}

function renderPromoTrack(data) {
    const container = document.getElementById('promoTrack');
    if (!container || !data?.rankData) return;
    container.innerHTML = data.rankData.map(r => {
        const statusClass = r.isPast ? 'ps-done' : r.isCurrentRank ? 'ps-current' : 'ps-locked';
        const statusText = r.isPast ? '✅ Achieved' : r.isCurrentRank ? '▶ Current Rank' : r.eligible ? '🟢 ELIGIBLE NOW!' : `${r.progress}% there`;
        const EMOJIS = { member: '👤', trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };
        return `<div class="promo-step">
      <div class="ps-rank">${EMOJIS[r.rank] || '•'}</div>
      <div class="ps-info">
        <div class="ps-name">${r.rank.toUpperCase()}</div>
        <div class="ps-req">${r.required.points || 0} pts · ${r.required.shifts || 0} shifts · ${r.required.consistency || 0}% consistency · max ${r.required.maxWarnings ?? '∞'} warns</div>
        ${(!r.isPast && !r.isCurrentRank) ? `<div class="prog-bar-wrap" style="margin-top:6px"><div class="prog-bar-fill" style="width:${r.progress || 0}%"></div></div>` : ''}
      </div>
      <div class="ps-status ${statusClass}">${statusText}</div>
    </div>`;
    }).join('');
}

function renderAnalytics(data) {
    if (!data) return;
    setText('anlActiveUsers', data.activeUsers || 0);
    setText('anlCommands', (data.commandCount || 0).toLocaleString());
    setText('anlShifts', data.shifts || 0);
    setText('anlWarnings', data.warnings || 0);
    setText('anlEngagement', (data.engagePct || 0) + '%');
    setBar('anlEngageBar', data.engagePct || 0);
    if (data.cmdGrowth !== null && data.cmdGrowth !== undefined) {
        const el = document.getElementById('anlCmdGrowth');
        if (el) {
            el.textContent = (data.cmdGrowth > 0 ? '↑' : '↓') + ' ' + Math.abs(data.cmdGrowth) + '% vs last week';
            el.className = data.cmdGrowth >= 0 ? 'ds-change ds-up' : 'ds-change ds-down';
        }
    }
}

function renderAchievements() {
    const container = document.getElementById('achieveList');
    if (!container || !currentUser) return;
    const items = currentUser.achievements || [];
    if (!items.length) {
        container.innerHTML = `<div style="color:var(--text3);font-size:.87rem;padding:20px 0">🏅 No achievements yet — start your first shift!</div>`;
        return;
    }
    container.innerHTML = items.map(a =>
        `<div class="card" style="padding:14px 16px;display:flex;gap:10px;align-items:center"><span style="font-size:1.3rem">🏅</span><span style="font-weight:600;font-size:.87rem">${a}</span></div>`
    ).join('');
}

// ── SIDEBAR ──
function switchPanel(panel) {
    document.querySelectorAll('[data-panel]').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-panel="${panel}"]`)?.classList.add('active');
    document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + panel);
    if (target) target.style.display = '';
    // Close mobile sidebar if open
    document.getElementById('sidebar')?.classList.remove('mobile-open');
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
}

// ── HELPERS ──
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setBar(id, pct) { const el = document.getElementById(id); if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%'; }

// ── MODAL ──
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ── TOAST ──
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── SLIDER ──
function updateSlider(val) {
    const rec = document.getElementById('sliderRec');
    if (!rec) return;
    const v = parseInt(val);
    const tier = v < 30 ? 'Free' : v < 80 ? 'Premium ($9.99/mo)' : 'Enterprise ($24.99/mo)';
    const color = v < 30 ? 'var(--accent)' : v < 80 ? 'var(--premium)' : 'var(--enterprise)';
    rec.textContent = `Recommendation: ${tier}`;
    rec.style.color = color;
}
