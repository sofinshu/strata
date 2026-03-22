// ═════════════════════════════════════════════════════════════════
// STRATA Dashboard Enhancement Module
// Based on v4.0 Full Specification
// ═════════════════════════════════════════════════════════════════

const StrataDashboard = {
  // ─────────────────────────────────────────────────────────────────
  // STAT CARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createStatCard(config) {
    const { icon, title, value, subtitle, trend, sparklineData, onClick } = config;
    
    const trendColor = trend.direction === 'up' ? 'var(--success)' : 
                       trend.direction === 'down' ? 'var(--error)' : 'var(--text-secondary)';
    const trendIcon = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
    
    const sparkline = sparklineData ? this.createSparkline(sparklineData) : '';
    
    return `
      <div class="stat-card" onclick="${onClick || ''}" style="cursor: ${onClick ? 'pointer' : 'default'}">
        <div class="stat-card-header">
          <span class="stat-icon">${icon}</span>
          <span class="stat-title">${title}</span>
        </div>
        <div class="stat-value">${value}</div>
        <div class="stat-subtitle">${subtitle}</div>
        <div class="stat-trend" style="color: ${trendColor}">
          ${trendIcon} ${trend.value}% ${trend.period}
        </div>
        ${sparkline}
      </div>
    `;
  },

  createSparkline(data) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return `
      <svg class="stat-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none">
        <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${points}" />
      </svg>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // ACTIVITY CHART COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createActivityChart(data, period = 'week') {
    const labels = period === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                   period === 'month' ? Array.from({length: 30}, (_, i) => i + 1) :
                   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const bars = data.map((d, i) => {
      const height = (d.hours / Math.max(...data.map(x => x.hours))) * 100;
      return `
        <div class="activity-bar-wrapper">
          <div class="activity-bar" style="height: ${height}%" data-hours="${d.hours}" data-shifts="${d.shifts}">
            <div class="activity-tooltip">
              <strong>${labels[i] || i+1}</strong><br>
              ${d.hours} hours<br>
              ${d.shifts} shifts
            </div>
          </div>
          <span class="activity-label">${labels[i] || ''}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="activity-chart">
        <div class="activity-bars">${bars}</div>
        <div class="activity-period-toggle">
          <button class="period-btn ${period === 'week' ? 'active' : ''}" data-period="week">Week</button>
          <button class="period-btn ${period === 'month' ? 'active' : ''}" data-period="month">Month</button>
          <button class="period-btn ${period === 'year' ? 'active' : ''}" data-period="year">Year</button>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // QUICK ACTIONS PANEL
  // ─────────────────────────────────────────────────────────────────
  createQuickActions(actions) {
    const buttons = actions.map(a => `
      <button class="quick-action-btn" onclick="${a.onClick}">
        <span class="qa-icon">${a.icon}</span>
        <span class="qa-label">${a.label}</span>
      </button>
    `).join('');

    return `
      <div class="quick-actions-panel">
        <h3 class="qa-title">Quick Actions</h3>
        <div class="qa-buttons">${buttons}</div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // ACTIVITY FEED COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createActivityFeed(items, maxItems = 10) {
    const icons = {
      promotion: '⬆️',
      demotion: '⬇️',
      shift_start: '⏱️',
      shift_end: '⏹️',
      warning: '⚠️',
      points: '⭐',
      ticket: '🎫',
      achievement: '🏅',
      moderation: '🔨'
    };

    const borderColors = {
      promotion: 'var(--success)',
      demotion: 'var(--error)',
      shift_start: 'var(--accent)',
      shift_end: 'var(--text-secondary)',
      warning: 'var(--warning)',
      points: '#FFD700',
      ticket: '#9B59B6',
      achievement: 'var(--success)',
      moderation: 'var(--error)'
    };

    const feedItems = items.slice(0, maxItems).map(item => `
      <div class="activity-item" style="border-left-color: ${borderColors[item.type] || 'var(--border)'}">
        <span class="activity-feed-icon">${icons[item.type] || '•'}</span>
        <div class="activity-feed-content">
          <span class="activity-feed-text">${item.description}</span>
          <span class="activity-feed-time">${this.formatRelativeTime(item.timestamp)}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="activity-feed">
        <h3 class="af-title">Recent Activity</h3>
        <div class="af-items">${feedItems}</div>
        <button class="af-view-all">View All Activity →</button>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // LIVE SHIFT CARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createLiveShiftCard(shift) {
    const { user, role, startTime, goalHours, isOnBreak, breaks } = shift;
    const duration = this.calculateDuration(startTime);
    const progress = (duration.hours / goalHours) * 100;
    
    const progressColor = progress < 50 ? 'var(--accent)' : 
                         progress < 80 ? 'var(--success)' : 
                         progress < 100 ? 'var(--warning)' : 'var(--error)';

    return `
      <div class="live-shift-card ${isOnBreak ? 'on-break' : ''}">
        <div class="ls-user">
          <img src="${user.avatar}" alt="${user.username}" class="ls-avatar">
          <div class="ls-info">
            <span class="ls-username">${user.username}</span>
            <span class="ls-role">${role}</span>
          </div>
        </div>
        <div class="ls-timer">
          <span class="ls-duration">${duration.formatted}</span>
          <span class="ls-label">${isOnBreak ? 'ON BREAK' : 'Duration'}</span>
        </div>
        <div class="ls-progress">
          <div class="ls-progress-bar">
            <div class="ls-progress-fill" style="width: ${Math.min(progress, 100)}%; background: ${progressColor}"></div>
          </div>
          <span class="ls-goal">${duration.hours}h / ${goalHours}h goal</span>
        </div>
        <div class="ls-actions">
          ${isOnBreak ? 
            `<button class="ls-btn" onclick="resumeShift('${shift.id}')">▶ Resume</button>` :
            `<button class="ls-btn" onclick="endShift('${shift.id}')">🛑 End</button>
             <button class="ls-btn secondary" onclick="startBreak('${shift.id}')">☕ Break</button>`
          }
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // STAFF TABLE COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createStaffTable(staff, options = {}) {
    const { onSort, onFilter, onRowClick } = options;
    
    const rows = staff.map((s, i) => {
      const statusIcon = s.status === 'online' ? '🟢' : 
                        s.status === 'on_shift' ? '⏱️' : 
                        s.status === 'on_break' ? '☕' : '🔴';
      const statusText = s.status === 'online' ? 'Online' :
                         s.status === 'on_shift' ? `On Shift (${s.shiftDuration})` :
                         s.status === 'on_break' ? 'On Break' : 
                         `Offline (${s.lastActive})`;

      return `
        <tr class="staff-row" data-user-id="${s.id}" onclick="${onRowClick ? `onRowClick('${s.id}')` : ''}">
          <td class="staff-index">${i + 1}</td>
          <td class="staff-member">
            <img src="${s.avatar}" alt="${s.username}" class="staff-avatar">
            <div class="staff-info">
              <span class="staff-name">${s.username}</span>
              <span class="staff-joined">Joined ${s.joinedAt}</span>
            </div>
          </td>
          <td class="staff-rank">
            <span class="rank-badge">${s.rankEmoji}</span>
            ${s.rankName}
          </td>
          <td class="staff-status">
            <span class="status-indicator">${statusIcon}</span>
            ${statusText}
          </td>
          <td class="staff-points">
            <span class="points-value">${s.points.toLocaleString()}</span>
            <span class="points-change ${s.pointsChange >= 0 ? 'positive' : 'negative'}">
              ${s.pointsChange >= 0 ? '+' : ''}${s.pointsChange}
            </span>
          </td>
          <td class="staff-shifts">
            <span class="shifts-count">${s.shiftsThisWeek}</span>
            <span class="shifts-hours">${s.hoursThisWeek}h</span>
          </td>
          <td class="staff-actions">
            <button class="action-menu-btn" onclick="toggleActionMenu(event, '${s.id}')">⋯</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="staff-table-wrapper">
        <table class="staff-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Member</th>
              <th>Rank</th>
              <th>Status</th>
              <th>Points</th>
              <th>Shifts This Week</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // LEADERBOARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createLeaderboard(leaders, options = {}) {
    const { period = 'week', onPeriodChange } = options;
    
    const top3 = leaders.slice(0, 3);
    const podium = `
      <div class="leaderboard-podium">
        <div class="podium-place second">
          <img src="${top3[1]?.avatar || ''}" class="podium-avatar">
          <span class="podium-name">${top3[1]?.username || '—'}</span>
          <span class="podium-points">${top3[1]?.points?.toLocaleString() || 0}</span>
          <span class="podium-badge">🥈</span>
        </div>
        <div class="podium-place first">
          <img src="${top3[0]?.avatar || ''}" class="podium-avatar">
          <span class="podium-name">${top3[0]?.username || '—'}</span>
          <span class="podium-points">${top3[0]?.points?.toLocaleString() || 0}</span>
          <span class="podium-badge">🥇</span>
        </div>
        <div class="podium-place third">
          <img src="${top3[2]?.avatar || ''}" class="podium-avatar">
          <span class="podium-name">${top3[2]?.username || '—'}</span>
          <span class="podium-points">${top3[2]?.points?.toLocaleString() || 0}</span>
          <span class="podium-badge">🥉</span>
        </div>
      </div>
    `;

    const rest = leaders.slice(3).map((l, i) => `
      <tr class="leaderboard-row">
        <td class="lb-rank">${i + 4}</td>
        <td class="lb-member">
          <img src="${l.avatar}" class="lb-avatar">
          <span class="lb-name">${l.username}</span>
        </td>
        <td class="lb-points">${l.points.toLocaleString()}</td>
        <td class="lb-change ${l.trend > 0 ? 'up' : l.trend < 0 ? 'down' : ''}">
          ${l.trend > 0 ? '↑' : l.trend < 0 ? '↓' : '→'} ${Math.abs(l.trend)}%
        </td>
      </tr>
    `).join('');

    return `
      <div class="leaderboard">
        <div class="lb-period-toggle">
          <button class="period-btn ${period === 'week' ? 'active' : ''}" data-period="week">This Week</button>
          <button class="period-btn ${period === 'month' ? 'active' : ''}" data-period="month">This Month</button>
          <button class="period-btn ${period === 'all' ? 'active' : ''}" data-period="all">All Time</button>
        </div>
        ${podium}
        <table class="leaderboard-table">
          <tbody>${rest}</tbody>
        </table>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // TICKET CARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createTicketCard(ticket) {
    const priorityColors = {
      low: 'var(--success)',
      medium: 'var(--warning)',
      high: 'var(--error)',
      critical: '#992D22'
    };

    const statusBadges = {
      open: '🟢 Open',
      in_progress: '🟡 In Progress',
      pending: '🟠 Pending',
      resolved: '✅ Resolved',
      closed: '⚫ Closed'
    };

    return `
      <div class="ticket-card" onclick="openTicket('${ticket.id}')">
        <div class="ticket-header">
          <span class="ticket-id">#${ticket.id}</span>
          <span class="ticket-priority" style="background: ${priorityColors[ticket.priority]}">${ticket.priority}</span>
        </div>
        <div class="ticket-subject">${ticket.subject}</div>
        <div class="ticket-meta">
          <span class="ticket-opener">
            <img src="${ticket.opener.avatar}" class="tiny-avatar">
            ${ticket.opener.username}
          </span>
          <span class="ticket-time">${this.formatRelativeTime(ticket.createdAt)}</span>
        </div>
        <div class="ticket-footer">
          <span class="ticket-category">${ticket.category}</span>
          <span class="ticket-status">${statusBadges[ticket.status]}</span>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // WARNING CARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createWarningCard(warning) {
    const severityColors = {
      minor: 'var(--success)',
      moderate: 'var(--warning)',
      major: 'var(--error)',
      critical: '#992D22'
    };

    const statusBadge = warning.active ? 
      `<span class="warning-status active">Active (${warning.daysRemaining}d left)</span>` :
      `<span class="warning-status expired">Expired</span>`;

    return `
      <div class="warning-card">
        <div class="warning-header">
          <span class="warning-id">#${warning.id}</span>
          <span class="warning-severity" style="background: ${severityColors[warning.severity]}">${warning.severity}</span>
        </div>
        <div class="warning-reason">${warning.reason}</div>
        <div class="warning-meta">
          <span class="warning-issuer">Issued by ${warning.issuedBy}</span>
          <span class="warning-date">${warning.createdAt}</span>
        </div>
        ${statusBadge}
        <div class="warning-points">${warning.pointsDeducted} points deducted</div>
        <div class="warning-actions">
          <button class="warning-btn" onclick="viewWarning('${warning.id}')">View</button>
          ${warning.active ? `<button class="warning-btn" onclick="clearWarning('${warning.id}')">Clear</button>` : ''}
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // ACHIEVEMENT CARD COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createAchievementCard(achievement) {
    const { name, icon, description, unlocked, unlockedAt, progress, requirement } = achievement;
    
    if (unlocked) {
      return `
        <div class="achievement-card unlocked">
          <div class="achievement-icon">${icon}</div>
          <div class="achievement-name">${name}</div>
          <div class="achievement-unlocked">Unlocked ${unlockedAt}</div>
        </div>
      `;
    }
    
    return `
      <div class="achievement-card locked">
        <div class="achievement-icon locked">🔒</div>
        <div class="achievement-name">${name}</div>
        <div class="achievement-progress">
          <div class="achievement-progress-bar">
            <div class="achievement-progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="achievement-progress-text">${progress}% — ${requirement}</span>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // MODAL COMPONENTS
  // ─────────────────────────────────────────────────────────────────
  createModal(config) {
    const { id, title, size = 'medium', content, buttons, onClose } = config;
    
    return `
      <div class="modal-overlay" id="${id}-modal" onclick="if(event.target === this) ${onClose || `closeModal('${id}')`}">
        <div class="modal-content modal-${size}">
          <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
            <button class="modal-close" onclick="closeModal('${id}')">×</button>
          </div>
          <div class="modal-body">${content}</div>
          ${buttons ? `<div class="modal-footer">${buttons}</div>` : ''}
        </div>
      </div>
    `;
  },

  createPromotionModal(staff) {
    const content = `
      <form id="promote-form">
        <div class="form-group">
          <label>Staff Member</label>
          <input type="text" value="${staff.username}" disabled>
        </div>
        <div class="form-group">
          <label>Current Rank</label>
          <input type="text" value="${staff.rankName}" disabled>
        </div>
        <div class="form-group">
          <label>New Rank *</label>
          <select name="newRank" required>
            <option value="">Select new rank...</option>
            ${staff.availableRanks.map(r => `<option value="${r.id}">${r.emoji} ${r.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Reason</label>
          <textarea name="reason" placeholder="Reason for promotion..."></textarea>
        </div>
        <div class="form-preview">
          <p><strong>+100</strong> bonus points will be awarded</p>
        </div>
      </form>
    `;

    const buttons = `
      <button class="btn btn-ghost" onclick="closeModal('promote')">Cancel</button>
      <button class="btn btn-primary" onclick="submitPromotion()">Confirm Promotion</button>
    `;

    return this.createModal({
      id: 'promote',
      title: '⬆️ Promote Staff Member',
      content,
      buttons,
      size: 'medium'
    });
  },

  createWarningModal(staff) {
    const severityOptions = ['minor', 'moderate', 'major', 'critical'].map(s => 
      `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('');

    const quickReasons = [
      'Missed shift without notice',
      'Late arrival',
      'Policy violation',
      'Inappropriate conduct',
      'Insubordination'
    ].map(r => `<button type="button" class="quick-reason-btn" onclick="document.querySelector('[name=reason]').value='${r}'">${r}</button>`).join('');

    const content = `
      <form id="warn-form">
        <div class="form-group">
          <label>Staff Member *</label>
          <select name="userId" required>
            <option value="">Select staff...</option>
            ${staff.map(s => `<option value="${s.id}">${s.username}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Severity *</label>
          <select name="severity" required>
            ${severityOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Reason *</label>
          <textarea name="reason" required placeholder="Reason for warning..."></textarea>
          <div class="quick-reasons">${quickReasons}</div>
        </div>
        <div class="form-group">
          <label>Expiration</label>
          <select name="expiration">
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </div>
        <div class="threshold-check" id="threshold-warning" style="display: none;">
          <p>⚠️ <strong>Warning:</strong> This will bring the staff member to their warning threshold!</p>
        </div>
      </form>
    `;

    const buttons = `
      <button class="btn btn-ghost" onclick="closeModal('warn')">Cancel</button>
      <button class="btn btn-danger" onclick="submitWarning()">Issue Warning</button>
    `;

    return this.createModal({
      id: 'warn',
      title: '⚠️ Issue Warning',
      content,
      buttons,
      size: 'medium'
    });
  },

  createPointsModal(staff, type = 'award') {
    const action = type === 'award';
    const quickAmounts = [10, 25, 50, 100, 250, 500].map(a => 
      `<button type="button" class="quick-amount-btn" onclick="document.querySelector('[name=amount]').value=${a}">${a}</button>`
    ).join('');

    const content = `
      <form id="points-form">
        <div class="form-group">
          <label>Staff Member *</label>
          <select name="userId" required>
            <option value="">Select staff...</option>
            ${staff.map(s => `<option value="${s.id}">${s.username} (${s.points} pts)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Amount *</label>
          <input type="number" name="amount" min="1" max="10000" required placeholder="Enter amount...">
          <div class="quick-amounts">${quickAmounts}</div>
        </div>
        <div class="form-group">
          <label>Reason *</label>
          <textarea name="reason" required placeholder="Reason for ${action ? 'awarding' : 'deducting'} points..."></textarea>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="notify" checked>
            Notify staff member via DM
          </label>
        </div>
      </form>
    `;

    const buttons = `
      <button class="btn btn-ghost" onclick="closeModal('points')">Cancel</button>
      <button class="btn btn-${action ? 'primary' : 'danger'}" onclick="submitPoints()">
        ${action ? '⭐' : '➖'} ${action ? 'Award' : 'Deduct'} Points
      </button>
    `;

    return this.createModal({
      id: 'points',
      title: `${action ? '⭐ Award Points' : '➖ Deduct Points'}`,
      content,
      buttons,
      size: 'small'
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────
  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return {
      hours,
      minutes,
      seconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`
    };
  },

  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString();
  },

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZE DASHBOARD
  // ─────────────────────────────────────────────────────────────────
  init() {
    this.addStyles();
    this.bindEvents();
  },

  addStyles() {
    const styles = `
      /* Stat Cards */
      .stat-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
        transition: all 150ms ease;
      }
      .stat-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
      }
      .stat-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .stat-icon { font-size: 18px; }
      .stat-title { color: var(--text-secondary); font-size: 13px; }
      .stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
      .stat-subtitle { color: var(--text-tertiary); font-size: 12px; margin-top: 4px; }
      .stat-trend { font-size: 12px; font-weight: 600; margin-top: 8px; }
      .stat-sparkline { width: 100%; height: 32px; margin-top: 8px; }

      /* Activity Chart */
      .activity-chart { padding: 16px; }
      .activity-bars {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 120px;
        gap: 4px;
        margin-bottom: 12px;
      }
      .activity-bar-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
      }
      .activity-bar {
        width: 100%;
        background: var(--accent);
        border-radius: 4px 4px 0 0;
        position: relative;
        min-height: 4px;
        transition: all 150ms ease;
        cursor: pointer;
      }
      .activity-bar:hover { background: var(--accent-hover); }
      .activity-bar:hover .activity-tooltip { opacity: 1; visibility: visible; }
      .activity-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 150ms ease;
        z-index: 10;
      }
      .activity-label { font-size: 10px; color: var(--text-tertiary); margin-top: 4px; }
      .activity-period-toggle { display: flex; gap: 8px; justify-content: center; }
      .period-btn {
        background: var(--bg-tertiary);
        border: none;
        color: var(--text-secondary);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .period-btn.active { background: var(--accent); color: white; }

      /* Quick Actions */
      .quick-actions-panel { padding: 16px; }
      .qa-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
      .qa-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .quick-action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--bg-tertiary);
        border: none;
        border-radius: 8px;
        padding: 10px 12px;
        color: var(--text-primary);
        font-size: 13px;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .quick-action-btn:hover { background: var(--accent); color: white; }

      /* Activity Feed */
      .activity-feed { padding: 16px; }
      .af-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
      .af-items { max-height: 300px; overflow-y: auto; }
      .activity-item {
        display: flex;
        gap: 12px;
        padding: 10px 0;
        border-left: 3px solid var(--border);
        border-bottom: 1px solid var(--border);
      }
      .activity-feed-icon { font-size: 16px; }
      .activity-feed-content { flex: 1; }
      .activity-feed-text { font-size: 13px; color: var(--text-primary); }
      .activity-feed-time { font-size: 11px; color: var(--text-tertiary); }
      .af-view-all {
        background: none;
        border: none;
        color: var(--accent);
        font-size: 12px;
        cursor: pointer;
        margin-top: 12px;
        width: 100%;
        text-align: center;
      }

      /* Live Shift Card */
      .live-shift-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-left: 3px solid var(--success);
        border-radius: 8px;
        padding: 16px;
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 16px;
        align-items: center;
      }
      .live-shift-card.on-break { border-left-color: var(--warning); }
      .ls-user { display: flex; gap: 12px; align-items: center; }
      .ls-avatar { width: 40px; height: 40px; border-radius: 50%; }
      .ls-info { display: flex; flex-direction: column; }
      .ls-username { font-weight: 600; font-size: 14px; }
      .ls-role { font-size: 12px; color: var(--text-secondary); }
      .ls-timer { text-align: center; }
      .ls-duration { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
      .ls-label { font-size: 10px; color: var(--text-tertiary); }
      .ls-progress { min-width: 120px; }
      .ls-progress-bar { height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
      .ls-progress-fill { height: 100%; transition: width 1s linear; }
      .ls-goal { font-size: 11px; color: var(--text-tertiary); }
      .ls-actions { display: flex; gap: 8px; }
      .ls-btn {
        background: var(--accent);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      .ls-btn.secondary { background: var(--bg-tertiary); }

      /* Staff Table */
      .staff-table-wrapper { overflow-x: auto; }
      .staff-table { width: 100%; border-collapse: collapse; }
      .staff-table th, .staff-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
      .staff-table th { color: var(--text-secondary); font-size: 12px; font-weight: 600; }
      .staff-row { transition: background 150ms ease; }
      .staff-row:hover { background: var(--bg-tertiary); cursor: pointer; }
      .staff-member { display: flex; gap: 12px; align-items: center; }
      .staff-avatar { width: 32px; height: 32px; border-radius: 50%; }
      .staff-info { display: flex; flex-direction: column; }
      .staff-name { font-weight: 600; font-size: 14px; }
      .staff-joined { font-size: 11px; color: var(--text-tertiary); }
      .rank-badge { margin-right: 6px; }
      .status-indicator { margin-right: 4px; }
      .points-value { font-weight: 600; }
      .points-change { font-size: 11px; margin-left: 6px; }
      .points-change.positive { color: var(--success); }
      .points-change.negative { color: var(--error); }
      .shifts-count { font-weight: 600; display: block; }
      .shifts-hours { font-size: 11px; color: var(--text-tertiary); }
      .action-menu-btn { background: none; border: none; cursor: pointer; font-size: 16px; }

      /* Leaderboard */
      .leaderboard-podium {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: 16px;
        padding: 24px;
        margin-bottom: 24px;
      }
      .podium-place { text-align: center; }
      .podium-place.first { order: 2; }
      .podium-place.second { order: 1; }
      .podium-place.third { order: 3; }
      .podium-avatar { width: 64px; height: 64px; border-radius: 50%; border: 3px solid; }
      .podium-place.first .podium-avatar { width: 80px; height: 80px; border-color: #FFD700; }
      .podium-place.second .podium-avatar { border-color: #C0C0C0; }
      .podium-place.third .podium-avatar { border-color: #CD7F32; }
      .podium-name { display: block; font-weight: 600; margin-top: 8px; }
      .podium-points { font-size: 12px; color: var(--text-secondary); }
      .podium-badge { display: block; font-size: 24px; margin-top: 4px; }

      /* Ticket Card */
      .ticket-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .ticket-card:hover { border-color: var(--accent); }
      .ticket-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
      .ticket-id { color: var(--text-tertiary); font-size: 12px; }
      .ticket-priority {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 4px;
        color: white;
        text-transform: uppercase;
      }
      .ticket-subject { font-weight: 600; margin-bottom: 8px; }
      .ticket-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
      .ticket-footer { display: flex; justify-content: space-between; font-size: 11px; }
      .tiny-avatar { width: 16px; height: 16px; border-radius: 50%; vertical-align: middle; margin-right: 4px; }

      /* Warning Card */
      .warning-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
      }
      .warning-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
      .warning-id { color: var(--text-tertiary); }
      .warning-severity {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 4px;
        color: white;
        text-transform: uppercase;
      }
      .warning-reason { margin-bottom: 8px; }
      .warning-meta { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
      .warning-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
      .warning-status.active { background: var(--error); color: white; }
      .warning-status.expired { background: var(--bg-tertiary); color: var(--text-tertiary); }
      .warning-points { font-size: 11px; color: var(--text-tertiary); margin: 8px 0; }
      .warning-actions { display: flex; gap: 8px; }
      .warning-btn {
        background: var(--bg-tertiary);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
      }

      /* Achievement Card */
      .achievement-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }
      .achievement-card.unlocked { border-color: var(--success); }
      .achievement-icon { font-size: 32px; }
      .achievement-icon.locked { filter: grayscale(1); opacity: 0.5; }
      .achievement-name { font-weight: 600; margin: 8px 0; }
      .achievement-unlocked { font-size: 11px; color: var(--text-tertiary); }
      .achievement-progress { margin-top: 8px; }
      .achievement-progress-bar { height: 4px; background: var(--bg-tertiary); border-radius: 2px; }
      .achievement-progress-fill { height: 100%; background: var(--accent); }
      .achievement-progress-text { font-size: 10px; color: var(--text-tertiary); }

      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .modal-content {
        background: var(--bg-secondary);
        border-radius: 16px;
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-small { width: 400px; }
      .modal-medium { width: 500px; }
      .modal-large { width: 700px; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border); }
      .modal-title { font-size: 18px; font-weight: 600; }
      .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); }
      .modal-body { padding: 20px; }
      .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

      /* Form */
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary); }
      .form-group input, .form-group select, .form-group textarea {
        width: 100%;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px 12px;
        color: var(--text-primary);
        font-size: 14px;
      }
      .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
      }
      .form-group textarea { min-height: 80px; resize: vertical; }
      .quick-reasons, .quick-amounts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .quick-reason-btn, .quick-amount-btn {
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
      }
      .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
      .threshold-check {
        background: rgba(237, 66, 69, 0.1);
        border: 1px solid var(--error);
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        color: var(--error);
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  bindEvents() {
    // Period button toggles
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('period-btn')) {
        const parent = e.target.closest('.activity-chart, .leaderboard');
        if (parent) {
          parent.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        }
      }
    });
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => StrataDashboard.init());

// Global functions for modals
function closeModal(id) {
  const modal = document.getElementById(`${id}-modal`);
  if (modal) modal.remove();
}

function openTicket(id) {
  console.log('Opening ticket:', id);
}

function viewWarning(id) {
  console.log('Viewing warning:', id);
}

function clearWarning(id) {
  console.log('Clearing warning:', id);
}

function toggleActionMenu(event, userId) {
  event.stopPropagation();
  console.log('Toggle action menu for:', userId);
}

// Export for use
window.StrataDashboard = StrataDashboard;
