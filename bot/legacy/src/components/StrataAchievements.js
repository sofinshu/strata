// ═════════════════════════════════════════════════════════════════
// STRATA Achievements & Rewards Module
// Achievement system and rewards management
// ═════════════════════════════════════════════════════════════════

const StrataAchievements = {
  // ─────────────────────────────────────────────────────────────────
  // ACHIEVEMENT GRID
  // ─────────────────────────────────────────────────────────────────
  createAchievementGrid(achievements, options = {}) {
    const { onEdit, onViewStats } = options;
    
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);
    
    return `
      <div class="achievements-section">
        <div class="achievement-stats">
          <div class="ach-stat">
            <span class="ach-value">${achievements.length}</span>
            <span class="ach-label">Total</span>
          </div>
          <div class="ach-stat">
            <span class="ach-value">${unlocked.length}</span>
            <span class="ach-label">Unlocked</span>
          </div>
          <div class="ach-stat">
            <span class="ach-value">${Math.round((unlocked.length / achievements.length) * 100)}%</span>
            <span class="ach-label">Complete</span>
          </div>
        </div>

        ${unlocked.length > 0 ? `
          <h3 class="ach-section-title">✅ Unlocked Achievements (${unlocked.length})</h3>
          <div class="achievement-grid">
            ${unlocked.map(a => this.createAchievementCard(a, 'unlocked')).join('')}
          </div>
        ` : ''}

        ${locked.length > 0 ? `
          <h3 class="ach-section-title">🔒 Locked Achievements (${locked.length})</h3>
          <div class="achievement-grid">
            ${locked.map(a => this.createAchievementCard(a, 'locked')).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  createAchievementCard(achievement, status) {
    const { id, name, icon, description, unlockedAt, progress, requirement, tier, reward } = achievement;
    
    const tierColors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      diamond: '#B9F2FF'
    };

    if (status === 'unlocked') {
      return `
        <div class="achievement-card unlocked" data-id="${id}" onclick="viewAchievement('${id}')">
          <div class="achievement-icon" style="border-color: ${tierColors[tier] || tierColors.gold}">
            ${icon}
          </div>
          <div class="achievement-name">${name}</div>
          <div class="achievement-desc">${description}</div>
          <div class="achievement-unlocked">Unlocked ${this.formatDate(unlockedAt)}</div>
          <div class="achievement-reward">+${reward} pts</div>
        </div>
      `;
    }

    return `
      <div class="achievement-card locked" data-id="${id}">
        <div class="achievement-icon locked">${icon}</div>
        <div class="achievement-name">${name}</div>
        <div class="achievement-desc">${description}</div>
        <div class="achievement-progress">
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="ach-progress-text">${progress}% — ${requirement}</span>
        </div>
        <div class="achievement-tier" style="color: ${tierColors[tier]}">${tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // ACHIEVEMENT CREATOR
  // ─────────────────────────────────────────────────────────────────
  createAchievementCreator() {
    const requirementTypes = [
      { value: 'shift_count', label: 'Shift Count' },
      { value: 'shift_hours', label: 'Shift Hours' },
      { value: 'point_balance', label: 'Point Balance' },
      { value: 'streak_days', label: 'Streak Days' },
      { value: 'ticket_count', label: 'Ticket Count' },
      { value: 'rank_reached', label: 'Rank Reached' },
      { value: 'warning_free', label: 'Warning-Free Days' },
      { value: 'achievement_count', label: 'Achievement Count' }
    ].map(t => `<option value="${t.value}">${t.label}</option>`).join('');

    const tiers = ['Bronze', 'Silver', 'Gold', 'Diamond'].map(t => 
      `<option value="${t.toLowerCase()}">${t}</option>`
    ).join('');

    return `
      <form id="achievement-form" class="achievement-form">
        <div class="form-row">
          <div class="form-group">
            <label>Achievement Name *</label>
            <input type="text" name="name" required placeholder="e.g., Shift Champion">
          </div>
          <div class="form-group">
            <label>Icon / Badge *</label>
            <div class="icon-picker">
              <input type="text" name="icon" required placeholder="🏆" maxlength="2">
              <span class="icon-preview">🏆</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Description *</label>
          <textarea name="description" required placeholder="What players need to do to unlock this achievement"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Requirement Type *</label>
            <select name="requirementType" required>
              ${requirementTypes}
            </select>
          </div>
          <div class="form-group">
            <label>Requirement Value *</label>
            <input type="number" name="requirementValue" required min="1" placeholder="e.g., 500">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Points Reward *</label>
            <input type="number" name="rewardPoints" required min="0" placeholder="e.g., 100">
          </div>
          <div class="form-group">
            <label>Tier *</label>
            <select name="tier" required>
              ${tiers}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Role Reward (optional)</label>
          <select name="roleReward">
            <option value="">None</option>
          </select>
        </div>

        <div class="form-group">
          <label>Availability</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="availability" value="permanent" checked>
              Permanent — always available
            </label>
            <label class="radio-label">
              <input type="radio" name="availability" value="seasonal">
              Seasonal — available until a date
            </label>
          </div>
          <input type="date" name="seasonalEndDate" class="seasonal-date" style="display:none">
        </div>
      </form>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // STREAK TRACKING
  // ─────────────────────────────────────────────────────────────────
  createStreakTracker(staff) {
    const currentStreak = staff.streak || 0;
    const longestStreak = staff.longestStreak || 0;
    const streakTier = this.getStreakTier(currentStreak);

    return `
      <div class="streak-tracker">
        <div class="streak-current">
          <div class="streak-flames">${'🔥'.repeat(Math.min(4, Math.ceil(currentStreak / 7)))}</div>
          <div class="streak-count">${currentStreak}</div>
          <div class="streak-label">Day Streak</div>
        </div>
        
        <div class="streak-progress">
          <div class="streak-milestones">
            ${[7, 14, 30, 60, 100].map(days => `
              <div class="milestone ${currentStreak >= days ? 'reached' : ''}" style="left: ${Math.min(100, (days / 100) * 100)}%">
                <span class="milestone-days">${days}d</span>
                <span class="milestone-icon">${currentStreak >= days ? '⭐' : ''}</span>
              </div>
            `).join('')}
          </div>
          <div class="streak-bar">
            <div class="streak-fill" style="width: ${Math.min(100, (currentStreak / 100) * 100)}%"></div>
          </div>
          <div class="streak-next">Next: ${7 - (currentStreak % 7)} days to ⭐</div>
        </div>

        <div class="streak-stats">
          <div class="streak-stat">
            <span class="ss-value">${longestStreak}</span>
            <span class="ss-label">Longest</span>
          </div>
          <div class="streak-stat">
            <span class="ss-value">${streakTier}</span>
            <span class="ss-label">Tier</span>
          </div>
        </div>
      </div>
    `;
  },

  getStreakTier(days) {
    if (days >= 100) return 'Legendary 🔥';
    if (days >= 30) return 'Diamond 💎';
    if (days >= 14) return 'Gold 🏆';
    if (days >= 7) return 'Silver 🥈';
    return 'Bronze 🥉';
  },

  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  init() {
    this.addStyles();
  },

  addStyles() {
    const styles = `
      /* Achievements Section */
      .achievements-section { padding: 16px; }
      .achievement-stats {
        display: flex;
        gap: 32px;
        justify-content: center;
        margin-bottom: 32px;
        padding: 20px;
        background: var(--bg-secondary);
        border-radius: 12px;
      }
      .ach-stat { text-align: center; }
      .ach-value { display: block; font-size: 32px; font-weight: 700; color: var(--text-primary); }
      .ach-label { font-size: 12px; color: var(--text-secondary); }
      
      .ach-section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }

      .achievement-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .achievement-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .achievement-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .achievement-card.unlocked { border-color: var(--success); }
      .achievement-card.locked { opacity: 0.7; }
      .achievement-card.locked:hover { opacity: 1; }

      .achievement-icon {
        font-size: 40px;
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 50%;
        background: var(--bg-tertiary);
        border: 3px solid;
      }
      .achievement-icon.locked { filter: grayscale(1); }
      .achievement-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
      .achievement-desc { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; min-height: 32px; }
      .achievement-unlocked { font-size: 10px; color: var(--success); }
      .achievement-reward { font-size: 12px; color: #FFD700; font-weight: 600; margin-top: 8px; }
      
      .achievement-progress { margin: 12px 0; }
      .ach-progress-bar { height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
      .ach-progress-fill { height: 100%; background: var(--accent); transition: width 300ms ease; }
      .ach-progress-text { font-size: 10px; color: var(--text-tertiary); display: block; margin-top: 4px; }
      .achievement-tier { font-size: 11px; font-weight: 600; }

      /* Streak Tracker */
      .streak-tracker { padding: 20px; background: var(--bg-secondary); border-radius: 12px; }
      .streak-current { text-align: center; margin-bottom: 20px; }
      .streak-flames { font-size: 32px; margin-bottom: 8px; }
      .streak-count { font-size: 48px; font-weight: 700; color: var(--text-primary); }
      .streak-label { font-size: 14px; color: var(--text-secondary); }

      .streak-progress { margin-bottom: 20px; }
      .streak-milestones { position: relative; height: 24px; margin-bottom: 8px; }
      .milestone {
        position: absolute;
        transform: translateX(-50%);
        text-align: center;
      }
      .milestone-days { font-size: 10px; color: var(--text-tertiary); }
      .milestone-icon { display: block; font-size: 14px; }
      .milestone.reached .milestone-days { color: var(--text-primary); }
      
      .streak-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
      .streak-fill { height: 100%; background: linear-gradient(90deg, var(--warning), var(--error)); border-radius: 4px; transition: width 300ms ease; }
      .streak-next { text-align: center; font-size: 12px; color: var(--text-secondary); margin-top: 8px; }

      .streak-stats { display: flex; justify-content: center; gap: 32px; }
      .streak-stat { text-align: center; }
      .ss-value { display: block; font-size: 18px; font-weight: 600; }
      .ss-label { font-size: 11px; color: var(--text-tertiary); }

      /* Achievement Form */
      .achievement-form { padding: 16px; }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .icon-picker { display: flex; gap: 8px; align-items: center; }
      .icon-picker input { flex: 1; }
      .icon-preview { font-size: 24px; }
      .radio-group { display: flex; flex-direction: column; gap: 8px; }
      .radio-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
      .seasonal-date { margin-top: 8px; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
};

// Global functions
function viewAchievement(id) { console.log('View achievement:', id); }

// Initialize
document.addEventListener('DOMContentLoaded', () => StrataAchievements.init());

window.StrataAchievements = StrataAchievements;
