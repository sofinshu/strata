// ═════════════════════════════════════════════════════════════════
// STRATA Configuration Settings Module
// Server and bot configuration panels
// ═════════════════════════════════════════════════════════════════

const StrataConfig = {
  // ─────────────────────────────────────────────────────────────────
  // GENERAL SETTINGS PANEL
  // ─────────────────────────────────────────────────────────────────
  createGeneralSettings(settings) {
    const { prefix, language, timezone, staffRole, channels } = settings;
    
    const languages = [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-UK', name: 'English (UK)' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ja', name: 'Japanese' }
    ].map(l => `<option value="${l.code}" ${language === l.code ? 'selected' : ''}>${l.name}</option>`).join('');

    return `
      <div class="config-panel">
        <form id="general-settings-form">
          <div class="config-section">
            <h3>Server Configuration</h3>
            
            <div class="form-group">
              <label>Bot Prefix *</label>
              <input type="text" name="prefix" value="${prefix || '!'}" maxlength="5" required>
              <span class="form-hint">Single character or word (no spaces)</span>
            </div>

            <div class="form-group">
              <label>Default Language</label>
              <select name="language">${languages}</select>
            </div>

            <div class="form-group">
              <label>Timezone</label>
              <select name="timezone">
                <option value="UTC-12" ${timezone === 'UTC-12' ? 'selected' : ''}>UTC-12:00</option>
                <option value="UTC-8" ${timezone === 'UTC-8' ? 'selected' : ''}>UTC-08:00 Pacific</option>
                <option value="UTC-5" ${(timezone === 'UTC-5' || !timezone) ? 'selected' : ''}>UTC-05:00 Eastern</option>
                <option value="UTC+0" ${timezone === 'UTC+0' ? 'selected' : ''}>UTC+00:00 London</option>
                <option value="UTC+1" ${timezone === 'UTC+1' ? 'selected' : ''}>UTC+01:00 Paris</option>
                <option value="UTC+8" ${timezone === 'UTC+8' ? 'selected' : ''}>UTC+08:00 Tokyo</option>
              </select>
              <span class="form-hint">Used for schedules, shift timers, and reports</span>
            </div>

            <div class="form-group">
              <label>Staff Role</label>
              <select name="staffRoleId">
                <option value="">Select a role...</option>
                ${(staffRole?.roles || []).map(r => 
                  `<option value="${r.id}" ${r.id === staffRole?.selected ? 'selected' : ''}>@${r.name}</option>`
                ).join('')}
              </select>
              <span class="form-hint">Members with this role are considered staff</span>
            </div>
          </div>

          <div class="config-section">
            <h3>Channel Configuration</h3>

            <div class="form-group">
              <label>Log Channel</label>
              <select name="logChannelId">
                <option value="">Select a channel...</option>
                ${(channels?.text || []).map(c => 
                  `<option value="${c.id}" ${c.id === channels?.log ? 'selected' : ''}>#${c.name}</option>`
                ).join('')}
              </select>
              <span class="form-hint">All bot actions will be logged here</span>
            </div>

            <div class="form-group">
              <label>Staff Notifications</label>
              <select name="staffChannelId">
                <option value="">Select a channel...</option>
                ${(channels?.text || []).map(c => 
                  `<option value="${c.id}" ${c.id === channels?.staff ? 'selected' : ''}>#${c.name}</option>`
                ).join('')}
              </select>
              <span class="form-hint">Promotions, warnings, shift reminders</span>
            </div>

            <div class="form-group">
              <label>Public Announcements</label>
              <select name="publicChannelId">
                <option value="">Select a channel...</option>
                ${(channels?.text || []).map(c => 
                  `<option value="${c.id}" ${c.id === channels?.public ? 'selected' : ''}>#${c.name}</option>`
                ).join('')}
              </select>
              <span class="form-hint">Public bot announcements</span>
            </div>
          </div>

          <div class="config-actions">
            <button type="button" class="btn btn-ghost" onclick="resetGeneralSettings()">Reset to Default</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // RANK CONFIGURATION PANEL
  // ─────────────────────────────────────────────────────────────────
  createRankConfig(ranks) {
    const rankItems = ranks.map((rank, index) => `
      <div class="rank-item" data-rank-id="${rank.id}" draggable="true">
        <span class="rank-drag">≡</span>
        <span class="rank-emoji">${rank.emoji}</span>
        <div class="rank-info">
          <span class="rank-name">${rank.name}</span>
          <span class="rank-level">Level ${rank.level}</span>
        </div>
        <div class="rank-stats">
          <span class="rank-members">${rank.memberCount} members</span>
        </div>
        <div class="rank-actions">
          <button class="rank-btn" onclick="editRank('${rank.id}')">✏️</button>
          <button class="rank-btn danger" onclick="deleteRank('${rank.id}')">🗑️</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="config-panel">
        <div class="rank-list-header">
          <h3>Rank Hierarchy</h3>
          <button class="btn btn-primary" onclick="createRank()">➕ Add Rank</button>
        </div>
        
        <div class="rank-list" id="rank-list">
          ${rankItems}
        </div>

        <div class="rank-requirements-section">
          <h3>Promotion Requirements (Premium)</h3>
          <p class="config-hint">Define what staff need to achieve to be promoted</p>
          
          <div class="requirements-grid">
            ${ranks.slice(0, -1).map((rank, i) => `
              <div class="requirement-card">
                <div class="req-header">
                  <span class="req-emoji">${rank.emoji}</span>
                  <span class="req-name">${rank.name}</span>
                  <span class="req-arrow">→</span>
                  <span class="req-next-emoji">${ranks[i+1]?.emoji || ''}</span>
                  <span class="req-next-name">${ranks[i+1]?.name || ''}</span>
                </div>
                <div class="req-fields">
                  <div class="req-field">
                    <label>Min Points</label>
                    <input type="number" value="${rank.requirements?.points || 0}" min="0">
                  </div>
                  <div class="req-field">
                    <label>Min Shifts</label>
                    <input type="number" value="${rank.requirements?.shifts || 0}" min="0">
                  </div>
                  <div class="req-field">
                    <label>Min Time</label>
                    <select>
                      <option ${rank.requirements?.time === 30 ? 'selected' : ''}>30 days</option>
                      <option ${rank.requirements?.time === 60 ? 'selected' : ''}>60 days</option>
                      <option ${(rank.requirements?.time === 90 || !rank.requirements?.time) ? 'selected' : ''}>90 days</option>
                      <option ${rank.requirements?.time === 180 ? 'selected' : ''}>180 days</option>
                      <option ${rank.requirements?.time === 365 ? 'selected' : ''}>1 year</option>
                    </select>
                  </div>
                  <div class="req-field">
                    <label>Max Warnings</label>
                    <input type="number" value="${rank.requirements?.warnings || 3}" min="1" max="10">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // PERMISSION MATRIX PANEL
  // ─────────────────────────────────────────────────────────────────
  createPermissionMatrix(commands, roles) {
    const roleHeaders = roles.map(r => 
      `<th class="role-header"><span class="role-emoji">${r.emoji}</span>${r.name}</th>`
    ).join('');

    const commandRows = commands.map(cmd => `
      <tr class="permission-row">
        <td class="command-cell">
          <span class="command-name">/${cmd.name}</span>
          <span class="command-desc">${cmd.description}</span>
        </td>
        ${roles.map(role => {
          const hasPermission = cmd.defaultPermissions?.[role.id] ?? role.default;
          return `
            <td class="permission-cell">
              <label class="permission-checkbox">
                <input type="checkbox" ${hasPermission ? 'checked' : ''} 
                       data-command="${cmd.name}" data-role="${role.id}">
                <span class="checkbox-mark"></span>
              </label>
            </td>
          `;
        }).join('')}
      </tr>
    `).join('');

    return `
      <div class="config-panel">
        <div class="permission-header">
          <h3>Command Permissions</h3>
          <p class="config-hint">Configure which roles can run which commands</p>
        </div>

        <div class="permission-table-wrapper">
          <table class="permission-table">
            <thead>
              <tr>
                <th class="command-header">Command</th>
                ${roleHeaders}
              </tr>
            </thead>
            <tbody>
              ${commandRows}
            </tbody>
          </table>
        </div>

        <div class="config-actions">
          <button type="button" class="btn btn-ghost" onclick="resetPermissions()">Reset to Default</button>
          <button type="button" class="btn btn-primary" onclick="savePermissions()">Save Permissions</button>
        </div>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────────────────────
  // THEME SETTINGS (Premium)
  // ─────────────────────────────────────────────────────────────────
  createThemeSettings(theme) {
    const { colors, background, radius } = theme || {};

    return `
      <div class="config-panel">
        <form id="theme-settings-form">
          <div class="config-section">
            <h3>Dashboard Appearance</h3>

            <div class="form-group">
              <label>Theme Mode</label>
              <div class="theme-mode-buttons">
                <label class="theme-mode-btn ${(theme?.mode === 'dark' || !theme?.mode) ? 'active' : ''}">
                  <input type="radio" name="mode" value="dark" ${(theme?.mode === 'dark' || !theme?.mode) ? 'checked' : ''}>
                  🟢 Dark
                </label>
                <label class="theme-mode-btn ${theme?.mode === 'light' ? 'active' : ''}">
                  <input type="radio" name="mode" value="light" ${theme?.mode === 'light' ? 'checked' : ''}>
                  ☀️ Light
                </label>
                <label class="theme-mode-btn ${theme?.mode === 'system' ? 'active' : ''}">
                  💻 System
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Primary Color</label>
              <div class="color-picker">
                <input type="color" name="primaryColor" value="${colors?.primary || '#5865F2'}">
                <input type="text" value="${colors?.primary || '#5865F2'}" 
                       onchange="document.querySelector('[name=primaryColor]').value = this.value">
              </div>
            </div>

            <div class="form-group">
              <label>Accent Color</label>
              <div class="color-picker">
                <input type="color" name="accentColor" value="${colors?.accent || '#57F287'}">
                <input type="text" value="${colors?.accent || '#57F287'}"
                       onchange="document.querySelector('[name=accentColor]').value = this.value">
              </div>
            </div>

            <div class="form-group">
              <label>Card Corner Radius</label>
              <input type="range" name="radius" min="0" max="24" value="${radius || 12}"
                     oninput="this.nextElementSibling.textContent = this.value + 'px'">
              <span class="range-value">${radius || 12}px</span>
            </div>
          </div>

          <div class="config-section">
            <h3>Discord Embed Styles</h3>

            <div class="form-group">
              <label>Default Embed Color</label>
              <div class="color-picker">
                <input type="color" name="embedColor" value="${colors?.embed || '#5865F2'}">
                <input type="text" value="${colors?.embed || '#5865F2'}">
              </div>
            </div>

            <div class="form-group">
              <label>Embed Footer</label>
              <input type="text" name="embedFooter" value="${theme?.embedFooter || 'Strata Staff Management'}"
                     placeholder="Footer text for bot embeds">
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" name="showTimestamp" ${theme?.showTimestamp !== false ? 'checked' : ''}>
                Show timestamp on embeds
              </label>
            </div>
          </div>

          <div class="config-actions">
            <button type="button" class="btn btn-ghost" onclick="resetTheme()">Reset to Default</button>
            <button type="submit" class="btn btn-primary">Save Theme</button>
          </div>
        </form>

        <div class="theme-preview">
          <h4>Preview</h4>
          <div class="preview-embed">
            <div class="preview-header">📊 Dashboard Title</div>
            <div class="preview-content">
              <p>This is how your bot embeds will look with current settings.</p>
            </div>
            <div class="preview-footer">Strata Staff Management • <t></div>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    this.addStyles();
  },

  addStyles() {
    const styles = `
      /* Config Panel */
      .config-panel { padding: 20px; }
      .config-section { margin-bottom: 32px; }
      .config-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
      .config-hint { font-size: 12px; color: var(--text-tertiary); margin-top: -8px; margin-bottom: 16px; }
      
      .form-group { margin-bottom: 20px; }
      .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); }
      .form-group input, .form-group select, .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;
      }
      .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
      .form-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; display: block; }
      
      .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }

      .config-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border); }

      /* Rank List */
      .rank-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
      .rank-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px; }
      .rank-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: grab;
        transition: all 150ms ease;
      }
      .rank-item:hover { border-color: var(--accent); }
      .rank-drag { cursor: grab; color: var(--text-tertiary); font-size: 18px; }
      .rank-emoji { font-size: 24px; }
      .rank-info { flex: 1; }
      .rank-name { display: block; font-weight: 600; font-size: 14px; }
      .rank-level { font-size: 11px; color: var(--text-tertiary); }
      .rank-stats { color: var(--text-secondary); font-size: 12px; }
      .rank-actions { display: flex; gap: 4px; }
      .rank-btn { background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px; }
      .rank-btn.danger:hover { color: var(--error); }

      /* Requirements Grid */
      .requirements-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
      .requirement-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
      }
      .req-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; }
      .req-arrow { color: var(--text-tertiary); }
      .req-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .req-field label { font-size: 11px; color: var(--text-tertiary); display: block; margin-bottom: 4px; }
      .req-field input, .req-field select { width: 100%; padding: 6px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 4px; font-size: 12px; }

      /* Permission Matrix */
      .permission-table-wrapper { overflow-x: auto; margin-bottom: 20px; }
      .permission-table { width: 100%; border-collapse: collapse; }
      .permission-table th, .permission-table td { padding: 10px 12px; text-align: center; border-bottom: 1px solid var(--border); }
      .permission-table th { background: var(--bg-tertiary); font-size: 12px; color: var(--text-secondary); }
      .role-emoji { display: block; font-size: 18px; margin-bottom: 4px; }
      .command-cell { text-align: left !important; min-width: 200px; }
      .command-name { display: block; font-weight: 600; font-size: 13px; }
      .command-desc { font-size: 11px; color: var(--text-tertiary); }
      
      .permission-checkbox input { display: none; }
      .checkbox-mark {
        width: 18px;
        height: 18px;
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 4px;
        display: inline-block;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .permission-checkbox input:checked + .checkbox-mark {
        background: var(--accent);
        border-color: var(--accent);
      }
      .permission-checkbox input:checked + .checkbox-mark::after {
        content: '✓';
        display: block;
        text-align: center;
        color: white;
        font-size: 12px;
        line-height: 14px;
      }

      /* Theme Settings */
      .theme-mode-buttons { display: flex; gap: 8px; }
      .theme-mode-btn {
        flex: 1;
        padding: 12px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .theme-mode-btn input { display: none; }
      .theme-mode-btn.active { border-color: var(--accent); background: var(--accent); color: white; }
      
      .color-picker { display: flex; gap: 8px; align-items: center; }
      .color-picker input[type="color"] { width: 40px; height: 40px; padding: 0; border: none; border-radius: 8px; cursor: pointer; }
      .color-picker input[type="text"] { width: 100px; font-family: monospace; }

      .range-value { margin-left: 12px; font-size: 12px; color: var(--text-secondary); }

      .theme-preview { margin-top: 32px; padding: 20px; background: var(--bg-tertiary); border-radius: 12px; }
      .theme-preview h4 { margin-bottom: 16px; font-size: 14px; }
      .preview-embed { background: #36393f; border-radius: 8px; overflow: hidden; }
      .preview-header { padding: 12px 16px; background: #2f3136; font-weight: 600; }
      .preview-content { padding: 16px; font-size: 14px; }
      .preview-footer { padding: 8px 16px; font-size: 11px; color: #72767d; border-top: 1px solid #202225; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
};

// Global functions
function editRank(id) { console.log('Edit rank:', id); }
function deleteRank(id) { console.log('Delete rank:', id); }
function createRank() { console.log('Create rank'); }
function resetGeneralSettings() { console.log('Reset settings'); }
function resetPermissions() { console.log('Reset permissions'); }
function savePermissions() { console.log('Save permissions'); }
function resetTheme() { console.log('Reset theme'); }

// Initialize
document.addEventListener('DOMContentLoaded', () => StrataConfig.init());

window.StrataConfig = StrataConfig;
