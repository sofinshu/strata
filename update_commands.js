const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Administrator\\Desktop\\bot\\backend\\data\\extracted_commands.json';
let commands = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const v4SlashSpecs = [
    { name: 'help', desc: 'Display interactive command browser organized by categories', tier: 'Free' },
    { name: 'ping', desc: 'Check bot latency and system health with live metrics', tier: 'Free' },
    { name: 'invite_link', desc: 'Get bot invite link and support server resources', tier: 'Free' },
    { name: 'report_issue', desc: 'Submit bug reports or feature requests through modal form', tier: 'Free' },
    { name: 'dashboard', desc: 'Quick server overview with key metrics and quick actions', tier: 'Free' },
    { name: 'shift_start', desc: 'Clock into shift with role tagging and progress tracking', tier: 'Free', options: [
        { name: 'role', description: 'Shift position/role', type: 3, required: false, autocomplete: true },
        { name: 'notes', description: 'Optional shift goals or notes', type: 3, required: false }
    ]},
    { name: 'shift_end', desc: 'Clock out with detailed summary and awards', tier: 'Free', options: [
        { name: 'summary', description: 'What you accomplished during this shift', type: 3, required: false }
    ]},
    { name: 'shift_stats', desc: 'View personal or staff shift statistics with period filters', tier: 'Free', options: [
        { name: 'user', description: 'Target staff member', type: 6, required: false },
        { name: 'period', description: 'Time period for stats', type: 3, required: false, choices: [
            { name: 'Today', value: 'today' },
            { name: 'This Week', value: 'week' },
            { name: 'This Month', value: 'month' },
            { name: 'All Time', value: 'all' }
        ]}
    ]},
    { name: 'promote', desc: 'Promote staff member with confirmation flow and auto role update', tier: 'Free', options: [
        { name: 'user', description: 'Staff member to promote', type: 6, required: true },
        { name: 'rank', description: 'Target rank', type: 3, required: true, autocomplete: true },
        { name: 'reason', description: 'Reason for promotion', type: 3, required: false }
    ]},
    { name: 'demote', desc: 'Demote staff member with required reason and double confirmation', tier: 'Free', options: [
        { name: 'user', description: 'Staff member to demote', type: 6, required: true },
        { name: 'rank', description: 'Target rank', type: 3, required: true, autocomplete: true },
        { name: 'reason', description: 'Reason for demotion', type: 3, required: true }
    ]},
    { name: 'staff_list', desc: 'View paginated staff directory with filters and search', tier: 'Free', options: [
        { name: 'rank', description: 'Filter by specific rank', type: 3, required: false, autocomplete: true },
        { name: 'status', description: 'Filter by status', type: 3, required: false, choices: [
            { name: 'Online', value: 'online' },
            { name: 'Offline', value: 'offline' },
            { name: 'On Shift', value: 'on_shift' },
            { name: 'All', value: 'all' }
        ]}
    ]},
    { name: 'staff_profile', desc: 'View comprehensive staff member profile with all stats', tier: 'Free', options: [
        { name: 'user', description: 'Target staff member', type: 6, required: true }
    ]},
    { name: 'staff_rank', desc: 'View rank hierarchy with member counts and requirements', tier: 'Free', options: [
        { name: 'rank', description: 'Specific rank to view members for', type: 3, required: false, autocomplete: true }
    ]},
    { name: 'staff_stats', desc: 'View aggregated server-wide staff performance statistics', tier: 'Free', options: [
        { name: 'period', description: 'Time period for stats', type: 3, required: false, choices: [
            { name: 'Today', value: 'today' },
            { name: 'This Week', value: 'week' },
            { name: 'This Month', value: 'month' },
            { name: 'All Time', value: 'all' }
        ]}
    ]},
    { name: 'points', desc: 'View own point balance, history, and earning sources', tier: 'Free', options: [
        { name: 'user', description: 'Check another user\'s points', type: 6, required: false }
    ]},
    { name: 'check_points', desc: 'Quick point balance check with add/remove functionality', tier: 'Free', options: [
        { name: 'user', description: 'Target staff member', type: 6, required: true }
    ]},
    { name: 'warn', desc: 'Issue warning with severity and auto-threshold detection', tier: 'Free', options: [
        { name: 'user', description: 'Staff member to warn', type: 6, required: true },
        { name: 'reason', description: 'Warning reason', type: 3, required: true },
        { name: 'severity', description: 'Warning severity', type: 3, required: false, choices: [
            { name: 'Minor', value: 'minor' },
            { name: 'Moderate', value: 'moderate' },
            { name: 'Major', value: 'major' },
            { name: 'Critical', value: 'critical' }
        ]}
    ]},
    { name: 'warnings', desc: 'View warning history with filtering and management options', tier: 'Free', options: [
        { name: 'user', description: 'Target staff member', type: 6, required: true },
        { name: 'status', description: 'Filter by status', type: 3, required: false, choices: [
            { name: 'Active', value: 'active' },
            { name: 'Expired', value: 'expired' },
            { name: 'All', value: 'all' }
        ]}
    ]},
    { name: 'clear_warnings', desc: 'Clear all or specific warnings with confirmation', tier: 'Free', options: [
        { name: 'user', description: 'Target staff member', type: 6, required: true },
        { name: 'warning_id', description: 'Specific warning ID to clear', type: 3, required: false }
    ]},
    { name: 'premium', desc: 'Display tier comparison, manage subscription, upsell', tier: 'Free', options: [
        { name: 'action', description: 'Manage premium features', type: 3, required: false, choices: [
            { name: 'View', value: 'view' },
            { name: 'Manage', value: 'manage' },
            { name: 'Compare', value: 'compare' }
        ]}
    ]}
];

// Update or add the 20 Slash Commands
v4SlashSpecs.forEach(spec => {
    const idx = commands.findIndex(c => c.name === spec.name);
    if (idx !== -1) {
        commands[idx] = { ...commands[idx], ...spec };
    } else {
        commands.push(spec);
    }
});

fs.writeFileSync(filePath, JSON.stringify(commands, null, 2), 'utf8');
console.log('Successfully updated extracted_commands.json with v4.0 slash specs');
