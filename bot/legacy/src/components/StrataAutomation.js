// ═════════════════════════════════════════════════════════════════
// STRATA Automation & Alerts Module
// Enhanced automation workflow builder
// ═════════════════════════════════════════════════════════════════

const StrataAutomation = {
  // ─────────────────────────────────────────────────────────────────
  // AUTOMATION LIST COMPONENT
  // ─────────────────────────────────────────────────────────────────
  createAutomationList(automations) {
    const cards = automations.map(a => this.createAutomationCard(a)).join('');
    
    return `
      <div class="automation-list">
        <div class="automation-stats">
          <div class="automation-stat">
            <span class="as-value">${automations.length}</span>
            <span class="as-label">Active</span>
          </div>
          <div class="automation-stat">
            <span class="as-value">${automations.reduce((sum, a) => sum + a.executionsThisWeek, 0)}</span>
            <span class="as-label">Executions</span>
          </div>
          <div class="automation-stat">
            <span class="as-value">${Math.round(automations.reduce((sum, a) => sum + a.successRate, 0) / automations.length)}%</span>
            <span class="as-label">Success</span>
          </div>
        </div>
        <div class="automation-cards">${cards}</div>
      </div>
    `;
  },

  createAutomationCard(automation) {
    const statusClass = automation.enabled ? 'enabled' : 'disabled';
    const statusColor = automation.enabled ? 'var(--success)' : 'var(--text-tertiary)';
    
    const triggerIcon = {
      schedule: '📅',
      event: '⚡',
      condition: '🔍'
    }[automation.triggerType] || '⚡';

    return `
      <div class="automation-card">
        <div class="automation-header">
          <div class="automation-info">
            <span class="automation-icon">${automation.icon || '⚡'}</span>
            <div>
              <h3 class="automation-name">${automation.name}</h3>
              <span class="automation-type">${automation.description}</span>
            </div>
          </div>
          <label class="automation-toggle">
            <input type="checkbox" ${automation.enabled ? 'checked' : ''} onchange="toggleAutomation('${automation.id}')">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="automation-details">
          <div class="automation-trigger">
            <span class="ad-label">Trigger:</span>
            <span class="ad-value">${triggerIcon} ${automation.trigger}</span>
          </div>
          <div class="automation-actions-count">
            <span class="ad-label">Actions:</span>
            <span class="ad-value">${automation.actions.length} action${automation.actions.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div class="automation-meta">
          <span class="am-last-run">Last run: ${this.formatRelativeTime(automation.lastRun)}</span>
          <span class="am-next-run">Next: ${automation.nextRun || '—'}</span>
        </div>

        <div class="automation-stats-mini">
          <span>${automation.executionsThisWeek} runs</span>
          <span>${automation.successRate}% success</span>
        </div>

        <div class="automation-actions">
          <button class="auto-btn" onclick="runAutomation('${automation.id}')">▶ Run Now</button>
          <button class="auto-btn secondary" onclick="editAutomation('${automation.id}')">✏️ Edit</button>
          <button class="auto-btn secondary" onclick="viewAutomationLog('${automation.id}')">📊 Log</button>
          <button class="auto-btn danger" onclick="deleteAutomation('${automation.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // WORKFLOW BUILDER MODAL
  // ─────────────────────────────────────────────────────────────────
  createWorkflowBuilder() {
    const triggerTypes = [
      { value: 'schedule', label: '📅 Schedule', desc: 'Run at specific times' },
      { value: 'event', label: '⚡ Event', desc: 'When something happens' },
      { value: 'condition', label: '🔍 Condition', desc: 'When metrics cross thresholds' }
    ].map(t => `<option value="${t.value}">${t.label}</option>`).join('');

    const actionTypes = [
      { value: 'notify', label: '📢 Send Notification' },
      { value: 'warn', label: '⚠️ Issue Warning' },
      { value: 'role', label: '🎭 Manage Roles' },
      { value: 'points', label: '⭐ Award/Deduct Points' },
      { value: 'kick', label: '👢 Kick User' },
      { value: 'ban', label: '🔨 Ban User' },
      { value: 'mute', label: '🔇 Mute User' },
      { value: 'dm', label: '💬 Send DM' },
      { value: 'webhook', label: '🔗 Send Webhook' }
    ].map(t => `<option value="${t.value}">${t.label}</option>`).join('');

    return `
      <div class="workflow-builder">
        <div class="wb-section">
          <h4>Automation Name</h4>
          <input type="text" id="automation-name" placeholder="e.g., Auto Warn on Missed Shift">
        </div>

        <div class="wb-section">
          <h4>Trigger</h4>
          <select id="trigger-type" onchange="updateTriggerOptions()">
            ${triggerTypes}
          </select>
          <div id="trigger-options"></div>
        </div>

        <div class="wb-section">
          <h4>Conditions (optional)</h4>
          <div id="conditions-list"></div>
          <button class="wb-add-btn" onclick="addCondition()">+ Add Condition</button>
        </div>

        <div class="wb-section">
          <h4>Actions</h4>
          <div id="actions-list">
            <div class="action-item" data-index="0">
              <select class="action-type">
                ${actionTypes}
              </select>
              <div class="action-config"></div>
              <button class="wb-remove-btn" onclick="this.parentElement.remove()">×</button>
            </div>
          </div>
          <button class="wb-add-btn" onclick="addAction()">+ Add Action</button>
        </div>

        <div class="wb-section">
          <h4>Settings</h4>
          <label class="wb-checkbox">
            <input type="checkbox" id="enabled" checked>
            Enable on creation
          </label>
          <label class="wb-checkbox">
            <input type="checkbox" id="log-executions" checked>
            Log all executions
          </label>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // ALERT CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  createAlertConfig(alerts) {
    const rows = alerts.map(alert => `
      <tr class="alert-row">
        <td>
          <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
          ${alert.name}
        </td>
        <td>${alert.condition}</td>
        <td>
          <span class="alert-channel">#${alert.channel}</span>
        </td>
        <td>
          <label class="alert-toggle">
            <input type="checkbox" ${alert.enabled ? 'checked' : ''} onchange="toggleAlert('${alert.id}')">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <button class="alert-edit-btn" onclick="editAlert('${alert.id}')">✏️</button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="alert-config">
        <table class="alert-table">
          <thead>
            <tr>
              <th>Alert Name</th>
              <th>Condition</th>
              <th>Notify Channel</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  getAlertIcon(type) {
    const icons = {
      inactivity: '💤',
      warning_threshold: '⚠️',
      promotion_ready: '⬆️',
      shift_missed: '⏱️',
      points_milestone: '⭐',
      streak_broken: '🔥',
      birthday: '🎂'
    };
    return icons[type] || '🔔';
  },

  // ─────────────────────────────────────────────────────────────────
  // UTILITY
  // ─────────────────────────────────────────────────────────────────
  formatRelativeTime(date) {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  init() {
    this.addStyles();
  },

  addStyles() {
    const styles = `
      /* Automation List */
      .automation-list { padding: 16px; }
      .automation-stats {
        display: flex;
        gap: 24px;
        margin-bottom: 24px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: 12px;
      }
      .automation-stat { text-align: center; }
      .as-value { display: block; font-size: 24px; font-weight: 700; color: var(--text-primary); }
      .as-label { font-size: 12px; color: var(--text-secondary); }
      .automation-cards { display: flex; flex-direction: column; gap: 12px; }

      .automation-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
      }
      .automation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .automation-info { display: flex; gap: 12px; align-items: center; }
      .automation-icon { font-size: 24px; }
      .automation-name { font-weight: 600; font-size: 15px; }
      .automation-type { font-size: 12px; color: var(--text-secondary); }
      
      .automation-toggle input { display: none; }
      .toggle-slider {
        width: 44px;
        height: 24px;
        background: var(--bg-tertiary);
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: background 150ms ease;
      }
      .toggle-slider::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        top: 3px;
        left: 3px;
        transition: transform 150ms ease;
      }
      .automation-toggle input:checked + .toggle-slider { background: var(--success); }
      .automation-toggle input:checked + .toggle-slider::after { transform: translateX(20px); }

      .automation-details {
        display: flex;
        gap: 24px;
        padding: 12px 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
      }
      .ad-label { font-size: 11px; color: var(--text-tertiary); display: block; }
      .ad-value { font-size: 13px; }

      .automation-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--text-tertiary);
        margin: 12px 0;
      }

      .automation-stats-mini {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: var(--text-secondary);
        margin-bottom: 12px;
      }

      .automation-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .auto-btn {
        background: var(--bg-tertiary);
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .auto-btn:hover { background: var(--accent); color: white; }
      .auto-btn.secondary { background: transparent; border: 1px solid var(--border); }
      .auto-btn.danger:hover { background: var(--error); }

      /* Alert Config */
      .alert-table { width: 100%; border-collapse: collapse; }
      .alert-table th { text-align: left; padding: 12px; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
      .alert-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid var(--border); }
      .alert-row:hover { background: var(--bg-tertiary); }
      .alert-icon { margin-right: 8px; }
      .alert-channel { background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-size: 12px; }
      .alert-edit-btn { background: none; border: none; cursor: pointer; font-size: 14px; }
      .alert-toggle .toggle-slider { width: 36px; height: 20px; }
      .alert-toggle .toggle-slider::after { width: 14px; height: 14px; }
      .alert-toggle input:checked + .toggle-slider::after { transform: translateX(16px); }

      /* Workflow Builder */
      .workflow-builder { padding: 16px; }
      .wb-section { margin-bottom: 24px; }
      .wb-section h4 { font-size: 13px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
      .wb-section select, .wb-section input { width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); margin-bottom: 8px; }
      .wb-add-btn {
        background: transparent;
        border: 1px dashed var(--border);
        color: var(--text-secondary);
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
      }
      .wb-add-btn:hover { border-color: var(--accent); color: var(--accent); }
      .wb-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; cursor: pointer; }
      .wb-remove-btn { background: none; border: none; color: var(--error); cursor: pointer; font-size: 18px; }
      .action-item { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
      .action-type { flex: 1; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => StrataAutomation.init());

// Global functions
function toggleAutomation(id) { console.log('Toggle:', id); }
function runAutomation(id) { console.log('Run:', id); }
function editAutomation(id) { console.log('Edit:', id); }
function viewAutomationLog(id) { console.log('Log:', id); }
function deleteAutomation(id) { console.log('Delete:', id); }
function toggleAlert(id) { console.log('Toggle alert:', id); }
function editAlert(id) { console.log('Edit alert:', id); }
function updateTriggerOptions() { console.log('Update triggers'); }
function addCondition() { console.log('Add condition'); }
function addAction() { console.log('Add action'); }

window.StrataAutomation = StrataAutomation;
