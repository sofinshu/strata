// ============================================================
// STRATA Website — Real Data Dashboard App
// ============================================================

const CONFIG = {
    CLIENT_ID: '1473264644910088213',
    API_BASE: 'https://your-bot-api.railway.app', // Update this to your real bot API URL
    get REDIRECT_URI() { return encodeURIComponent(window.location.origin + window.location.pathname); },
    get DISCORD_OAUTH_URL() { return `https://discord.com/api/oauth2/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=token&scope=identify%20guilds`; }
};

// ── STATE ──
let currentUser = null;
let accessToken = null;
let allCommands = [];
let managedGuilds = [];
let currentGuildId = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    createParticles();
    setupNavLinks();
    setupFilters();
    setupSearch();
    updateSlider(30);

    if (await checkOAuthCallback()) return;

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

// ── PUBLIC STATS ──
async function loadPublicStats() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/stats`);
        if (res.ok) {
            const data = await res.json();
            window._realStats = {
                servers: data.guildCount || 2400,
                staff: data.staffCount || 18000,
                tickets: data.totalShifts || 95000,
                commands: allCommands.length || 271
            };
        }
    } catch { /* defaults */ }
    animateStats();
}

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

function setupNavLinks() {
    document.querySelectorAll('[data-scroll]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const t = document.getElementById(el.dataset.scroll);
            if (t) { t.scrollIntoView({ behavior: 'smooth' }); closeMobileMenu(); }
        });
    });
}
function toggleMobileMenu() { document.getElementById('mobileMenu')?.classList.toggle('open'); }
function closeMobileMenu() { document.getElementById('mobileMenu')?.classList.remove('open'); }

// ── DISCORD OAUTH ──
function loginWithDiscord() { openModal('loginModal'); }
function doDiscordLogin() { window.location.href = CONFIG.DISCORD_OAUTH_URL; }

async function checkOAuthCallback() {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return false;
    const params = new URLSearchParams(hash.substring(1));
    accessToken = params.get('access_token');
    if (!accessToken) return false;

    window.history.replaceState({}, document.title, window.location.pathname);
    closeModal('loginModal');
    showToast('🔐 Verifying your Discord account...');

    try {
        const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Discord API error');
        const u = await res.json();
        currentUser = {
            id: u.id, username: u.username,
            avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=128` : `https://cdn.discordapp.com/embed/avatars/${parseInt(u.discriminator || 0) % 5}.png`
        };
        showToast(`✅ Welcome, ${currentUser.username}!`);

        // Switch to Guild Picker instead of direct dashboard
        showGuildPicker();
        return true;
    } catch (err) {
        showToast('❌ Login failed.');
        return false;
    }
}

function logout() {
    currentUser = null; accessToken = null; currentGuildId = null;
    document.getElementById('guildPicker').style.display = 'none';
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('landingPage').style.display = '';
    document.getElementById('navUser').style.display = 'none';
    document.getElementById('navLoginBtn').style.display = '';
    showToast('👋 Logged out');
}

// ── GUILD PICKER ──
async function showGuildPicker() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboard').classList.remove('active');
    const gp = document.getElementById('guildPicker');
    gp.style.display = 'flex';

    // Update nav
    document.getElementById('navUser').style.display = 'flex';
    document.getElementById('navLoginBtn').style.display = 'none';
    document.getElementById('navUserName').textContent = currentUser.username;

    document.getElementById('guildGrid').innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:40px">Loading servers...</div>`;

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/dashboard/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch guilds');
        managedGuilds = await res.json();
        renderGuildList();
    } catch (err) {
        document.getElementById('guildGrid').innerHTML = `<div style="grid-column:1/-1;color:var(--red);text-align:center;padding:40px">Error loading servers. Check bot API connection.</div>`;
    }
}

function renderGuildList(query = '') {
    const grid = document.getElementById('guildGrid');
    let filtered = managedGuilds;
    if (query) filtered = filtered.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:40px">No managed servers found. Note: You need the "Manage Server" permission.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(g => `
    <div class="guild-card" onclick="${g.botInstalled ? `selectGuild('${g.id}')` : `window.open('https://discord.com/api/oauth2/authorize?client_id=1473264644910088213&permissions=8&scope=bot%20applications.commands&guild_id=${g.id}')`}">
      ${g.icon ? `<img src="${g.icon}" class="gc-icon">` : `<div class="gc-icon-fallback">${g.name[0]}</div>`}
      <div class="gc-info">
        <div class="gc-name">${g.name}</div>
        <div class="gc-status">
          ${g.botInstalled ? `<span style="color:var(--green)">● Connected</span> · ${g.tier.toUpperCase()}` : `<span style="color:var(--text3)">○ Not Installed</span>`}
        </div>
      </div>
      <div>
        ${g.botInstalled ? `<button class="btn btn-secondary" style="padding:6px 12px;font-size:.75rem">Manage</button>` : `<button class="btn btn-primary" style="padding:6px 12px;font-size:.75rem">Invite</button>`}
      </div>
    </div>
  `).join('');
}

// ── DASHBOARD INIT ──
async function selectGuild(guildId) {
    currentGuildId = guildId;
    document.getElementById('guildPicker').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');

    const g = managedGuilds.find(x => x.id === guildId);
    if (g.icon) {
        document.getElementById('sideAvatarImg').src = g.icon;
        document.getElementById('sideAvatarImg').style.display = '';
        document.getElementById('dashAvatarImg').src = g.icon;
        document.getElementById('dashAvatarImg').style.display = '';
        document.getElementById('sideAvatarFallback').style.display = 'none';
    } else {
        document.getElementById('sideAvatarImg').style.display = 'none';
        document.getElementById('dashAvatarImg').style.display = 'none';
        document.getElementById('sideAvatarFallback').textContent = g.name[0];
        document.getElementById('sideAvatarFallback').style.display = 'flex';
    }
    document.getElementById('sideUsername').textContent = g.name;
    document.getElementById('sideRank').textContent = `STRATA ${g.tier.toUpperCase()}`;
    document.getElementById('dashGreet').textContent = `Managing ${g.name}`;

    // Reset panels and switch to overview
    switchPanel('overview');
    await loadGuildData(guildId);
}

async function loadGuildData(guildId) {
    showToast('Loading server data...', 'loading');
    try {
        const [overview, settings, promo, staff, shifts, warnings] = await Promise.all([
            fetchAPI(`/api/dashboard/guild/${guildId}`),
            fetchAPI(`/api/dashboard/guild/${guildId}/settings`),
            fetchAPI(`/api/dashboard/guild/${guildId}/promotion-requirements`),
            fetchAPI(`/api/dashboard/guild/${guildId}/staff`),
            fetchAPI(`/api/dashboard/guild/${guildId}/shifts`),
            fetchAPI(`/api/dashboard/guild/${guildId}/warnings`)
        ]);

        renderOverview(overview);
        renderSettings(settings);
        renderPromoReqs(promo);
        renderStaffManager(staff);
        renderShiftLog(shifts);
        renderWarnings(warnings);
        showToast('Data loaded ✅');
    } catch (err) {
        showToast('❌ Error loading data');
        console.error(err);
    }
}

async function fetchAPI(path, options = {}) {
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const res = await fetch(`${CONFIG.API_BASE}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

// ── OVERVIEW PANEL ──
function renderOverview(data) {
    const s = data.stats;
    setText('ovStaff', s.staffCount || 0);
    setText('ovShifts', s.shiftCount || 0);
    setText('ovWarnings', s.warnCount || 0);
    setText('ovActivity', s.activityCount || 0);
}

// ── SETTINGS PANEL ──
function renderSettings(s) {
    document.getElementById('setModChannel').value = s.modChannelId || '';
    document.getElementById('setLogChannel').value = s.logChannelId || '';
    document.getElementById('setStaffChannel').value = s.staffChannelId || '';
    document.getElementById('chkTicket').checked = s.ticketEnabled !== false;
    document.getElementById('chkAlerts').checked = s.alertsEnabled !== false;
    document.getElementById('chkAutoPromo').checked = s.autoPromotion !== false;
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuildId}/settings`, {
            method: 'PATCH',
            body: JSON.stringify({
                modChannelId: document.getElementById('setModChannel').value,
                logChannelId: document.getElementById('setLogChannel').value,
                staffChannelId: document.getElementById('setStaffChannel').value,
                ticketEnabled: document.getElementById('chkTicket').checked,
                alertsEnabled: document.getElementById('chkAlerts').checked,
                autoPromotion: document.getElementById('chkAutoPromo').checked
            })
        });
        showToast('✅ Settings saved!');
    } catch (e) { showToast('❌ Failed to save settings'); }
    finally { btn.textContent = 'Save Changes'; btn.disabled = false; }
}

// ── PROMOTION REQS PANEL ──
function renderPromoReqs(reqs) {
    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    ranks.forEach(r => {
        if (document.getElementById(`promo_${r}_pts`)) {
            document.getElementById(`promo_${r}_pts`).value = reqs[r]?.points ?? 0;
            document.getElementById(`promo_${r}_shifts`).value = reqs[r]?.shifts ?? 0;
            document.getElementById(`promo_${r}_cons`).value = reqs[r]?.consistency ?? 0;
            document.getElementById(`promo_${r}_warn`).value = reqs[r]?.maxWarnings ?? 99;
        }
    });
}

async function savePromoReqs() {
    const btn = document.getElementById('savePromoBtn');
    btn.textContent = 'Saving...'; btn.disabled = true;
    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    const body = {};
    ranks.forEach(r => {
        body[r] = {
            points: Number(document.getElementById(`promo_${r}_pts`).value),
            shifts: Number(document.getElementById(`promo_${r}_shifts`).value),
            consistency: Number(document.getElementById(`promo_${r}_cons`).value),
            maxWarnings: Number(document.getElementById(`promo_${r}_warn`).value)
        };
    });
    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuildId}/promotion-requirements`, {
            method: 'PATCH', body: JSON.stringify(body)
        });
        showToast('✅ Promotion config saved!');
    } catch (e) { showToast('❌ Failed to save promo config'); }
    finally { btn.textContent = 'Save Configuration'; btn.disabled = false; }
}

// ── STAFF MANAGER ──
function renderStaffManager(staff) {
    const tbody = document.getElementById('staffMgrTbody');
    if (!staff.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3)">No staff members tracked yet.</td></tr>`; return; }

    tbody.innerHTML = staff.map(s => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <canvas class="av-fallback" data-name="${s.username[0]}" width="30" height="30"></canvas>
        <div style="font-weight:600">${s.username} <span style="font-weight:400;color:var(--text3);font-size:.75rem">(${s.userId})</span></div>
      </div></td>
      <td><select onchange="updateStaff('${s.userId}', 'rank', this.value)" style="background:var(--card2);color:var(--text);border:1px solid var(--border2);padding:4px 8px;border-radius:6px;font-size:.8rem">
        ${['member', 'trial', 'staff', 'senior', 'manager', 'admin'].map(r => `<option value="${r}" ${s.rank === r ? 'selected' : ''}>${r.toUpperCase()}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${s.points}" onchange="updateStaff('${s.userId}', 'points', this.value)" style="background:var(--card2);color:var(--text);border:1px solid var(--border2);padding:4px 8px;border-radius:6px;width:80px;font-size:.8rem"></td>
      <td>${s.shifts || 0}</td>
      <td>${s.consistency || 0}%</td>
      <td><span style="color:${s.warnings > 0 ? 'var(--red)' : 'var(--green)'}">${s.warnings || 0}</span></td>
    </tr>
  `).join('');

    drawAvatars();
}

async function updateStaff(userId, field, val) {
    if (field === 'points') val = Number(val);
    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuildId}/staff/${userId}`, {
            method: 'PATCH', body: JSON.stringify({ [field]: val })
        });
        showToast('✅ Set ' + field + ' successfully');
    } catch (e) { showToast('❌ Failed to update staff'); }
}

// ── SHIFT LOG ──
function renderShiftLog(shifts) {
    const tbody = document.getElementById('shiftTbody');
    if (!shifts.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">No completed shifts.</td></tr>`; return; }
    tbody.innerHTML = shifts.map(s => {
        const d = new Date(s.startTime);
        return `<tr>
      <td style="font-family:monospace;color:var(--text2)">${s.userId}</td>
      <td>${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${s.hoursFormatted}</td>
      <td style="color:var(--accent)">+${s.pointsEarned} pts</td>
      <td style="color:var(--green)">${s.status.toUpperCase()}</td>
    </tr>`;
    }).join('');
}

// ── WARNINGS LOG ──
function renderWarnings(warns) {
    const tbody = document.getElementById('warnTbody');
    if (!warns.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">No warnings recorded.</td></tr>`; return; }
    tbody.innerHTML = warns.map(w => {
        const d = new Date(w.createdAt);
        const badgeColor = w.severity === 'high' ? 'var(--red)' : w.severity === 'medium' ? 'var(--yellow)' : 'var(--accent)';
        return `<tr id="warn-${w._id}">
      <td>${d.toLocaleDateString()}</td>
      <td style="font-family:monospace;color:var(--text2)">${w.userId}</td>
      <td>${w.reason}</td>
      <td><span style="background:rgba(255,255,255,.05);color:${badgeColor};padding:3px 8px;border-radius:4px;font-size:.7rem;font-weight:700;text-transform:uppercase">${w.severity}</span></td>
      <td><button class="btn btn-outline" style="padding:4px 8px;font-size:.7rem;border-color:var(--red);color:var(--red)" onclick="deleteWarning('${w._id}')">Remove</button></td>
    </tr>`;
    }).join('');
}

async function deleteWarning(id) {
    if (!confirm('Remove this warning? This cannot be undone.')) return;
    try {
        await fetchAPI(`/api/dashboard/guild/${currentGuildId}/warnings/${id}`, { method: 'DELETE' });
        document.getElementById(`warn-${id}`).remove();
        showToast('✅ Warning removed');
    } catch (e) { showToast('❌ Failed to remove'); }
}

// ── UTILS ──
function switchPanel(panel) {
    document.querySelectorAll('[data-panel]').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-panel="${panel}"]`)?.classList.add('active');
    document.querySelectorAll('.dash-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + panel);
    if (target) target.style.display = '';
    document.getElementById('sidebar')?.classList.remove('mobile-open');
}

function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('mobile-open'); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setBar(id, pct) { const el = document.getElementById(id); if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%'; }
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.className = 'toast show ' + type;
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}
function updateSlider(val) {
    const rec = document.getElementById('sliderRec');
    if (!rec) return;
    const v = parseInt(val);
    const tier = v < 30 ? 'Free' : v < 80 ? 'Premium ($9.99/mo)' : 'Enterprise ($24.99/mo)';
    const color = v < 30 ? 'var(--accent)' : v < 80 ? 'var(--premium)' : 'var(--enterprise)';
    rec.textContent = `Recommendation: ${tier}`; rec.style.color = color;
}
function drawAvatars() {
    document.querySelectorAll('.av-fallback').forEach(c => {
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'var(--accent)'; ctx.fillRect(0, 0, 30, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(c.dataset.name, 15, 16);
        c.style.borderRadius = '50%';
    });
}
