const db = require('./database/connection');

// Seed data for development/testing
function seedDatabase() {
    console.log('[Seed] Starting database seeding...');

    // Sample guild
    const guildId = '123456789012345678';
    
    db.prepare(`
        INSERT OR IGNORE INTO guilds (id, name, icon, owner_id, tier, mod_channel_id, staff_channel_id, warn_threshold, min_shift_minutes, auto_promotion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, 'Test Server', null, '987654321098765432', 'premium', '111111111111111111', '222222222222222222', 3, 30, 1);

    // Sample staff members
    const staffMembers = [
        { id: '100000000000000001', username: 'AdminUser', rank: 'admin', points: 5000, shifts: 150, isStaff: 1, isAdmin: 1 },
        { id: '100000000000000002', username: 'ManagerPro', rank: 'manager', points: 3500, shifts: 100, isStaff: 1, isAdmin: 0 },
        { id: '100000000000000003', username: 'SeniorMod', rank: 'senior', points: 2000, shifts: 75, isStaff: 1, isAdmin: 0 },
        { id: '100000000000000004', username: 'RegularStaff', rank: 'staff', points: 1200, shifts: 50, isStaff: 1, isAdmin: 0 },
        { id: '100000000000000005', username: 'TrialMember', rank: 'trial', points: 300, shifts: 10, isStaff: 1, isAdmin: 0 }
    ];

    const memberStmt = db.prepare(`
        INSERT OR IGNORE INTO guild_members (guild_id, user_id, username, rank, points, is_staff, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    staffMembers.forEach(m => {
        memberStmt.run(guildId, m.id, m.username, m.rank, m.points, m.isStaff, m.isAdmin);
    });

    // Sample staff profiles
    const profileStmt = db.prepare(`
        INSERT OR IGNORE INTO staff_profiles (guild_id, user_id, current_rank, shifts_completed, warnings_count, total_shift_minutes)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    staffMembers.forEach(m => {
        profileStmt.run(guildId, m.id, m.rank, m.shifts, 0, m.shifts * 60);
    });

    // Sample shifts
    const shiftStmt = db.prepare(`
        INSERT INTO shifts (guild_id, user_id, username, started_at, ended_at, duration_minutes, points_earned, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Create some completed shifts
    for (let i = 0; i < 30; i++) {
        const member = staffMembers[Math.floor(Math.random() * staffMembers.length)];
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 12);
        const startedAt = new Date();
        startedAt.setDate(startedAt.getDate() - daysAgo);
        startedAt.setHours(startedAt.getHours() - hoursAgo);
        
        const duration = 30 + Math.floor(Math.random() * 180); // 30-210 minutes
        const endedAt = new Date(startedAt.getTime() + duration * 60000);
        const points = Math.floor(duration / 10);

        shiftStmt.run(guildId, member.id, member.username, startedAt.toISOString(), endedAt.toISOString(), duration, points, 'completed');
    }

    // Sample warnings
    const warnStmt = db.prepare(`
        INSERT INTO warnings (guild_id, target_user_id, target_username, issuer_user_id, issuer_username, reason, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    warnStmt.run(guildId, '100000000000000005', 'TrialMember', '100000000000000001', 'AdminUser', 'Inappropriate behavior in chat', 'medium', 'active');
    warnStmt.run(guildId, '100000000000000004', 'RegularStaff', '100000000000000002', 'ManagerPro', 'Missed shift without notice', 'low', 'active');

    // Sample promotion requirements
    const promoStmt = db.prepare(`
        INSERT OR IGNORE INTO promotion_requirements 
        (guild_id, rank_name, rank_role_id, points_required, shifts_required, consistency_required, max_warnings, shift_hours_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    promoStmt.run(guildId, 'trial', '333333333333333333', 0, 0, 0, 3, 0);
    promoStmt.run(guildId, 'staff', '444444444444444444', 500, 10, 50, 2, 5);
    promoStmt.run(guildId, 'senior', '555555555555555555', 1500, 30, 70, 1, 20);
    promoStmt.run(guildId, 'manager', '666666666666666666', 3000, 60, 80, 0, 50);
    promoStmt.run(guildId, 'admin', '777777777777777777', 5000, 100, 90, 0, 100);

    // Sample system configs
    const systemStmt = db.prepare(`
        INSERT OR IGNORE INTO system_configs (guild_id, system_type, config_json, enabled)
        VALUES (?, ?, ?, ?)
    `);

    systemStmt.run(guildId, 'welcome', JSON.stringify({
        channelId: '888888888888888888',
        message: 'Welcome {user} to {server}! You are member #{count}.',
        dmEnabled: false,
        dmMessage: ''
    }), 1);

    systemStmt.run(guildId, 'automod', JSON.stringify({
        blockProfanity: true,
        blockLinks: false,
        antiMentionSpam: true,
        blockInvites: true,
        autoTimeout: true,
        logViolations: true,
        bannedWords: ['badword1', 'badword2'],
        allowedDomains: ['discord.com', 'youtube.com'],
        maxMentions: 5,
        timeoutDuration: 10,
        logChannel: '999999999999999999'
    }), 1);

    systemStmt.run(guildId, 'logging', JSON.stringify({
        memberLog: true,
        memberLogChannel: '111111111111111111',
        messageLog: true,
        messageLogChannel: '222222222222222222',
        modLog: true,
        modLogChannel: '333333333333333333'
    }), 1);

    // Sample custom commands
    const cmdStmt = db.prepare(`
        INSERT OR IGNORE INTO custom_commands (guild_id, trigger, response, match_type, is_embed, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    cmdStmt.run(guildId, '!rules', 'Please follow the server rules:\n1. Be respectful\n2. No spam\n3. Have fun!', 'starts', 1, 1);
    cmdStmt.run(guildId, '!help', 'Need help? Contact a staff member or open a ticket!', 'exact', 1, 1);

    // Sample achievements
    const achStmt = db.prepare(`
        INSERT OR IGNORE INTO achievements (guild_id, achievement_id, name, description, icon, criteria_type, criteria_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    achStmt.run(guildId, 'ach_first_shift', 'First Shift', 'Complete your first work shift', '🎯', 'shifts', 1);
    achStmt.run(guildId, 'ach_dedicated', 'Dedicated Staff', 'Complete 50 shifts', '💪', 'shifts', 50);
    achStmt.run(guildId, 'ach_point_master', 'Point Master', 'Earn 1000 points', '💎', 'points', 1000);

    // Sample role rewards
    const rewardStmt = db.prepare(`
        INSERT OR IGNORE INTO role_rewards (guild_id, name, role_id, required_points)
        VALUES (?, ?, ?, ?)
    `);

    rewardStmt.run(guildId, 'Bronze Staff', '101010101010101010', 500);
    rewardStmt.run(guildId, 'Silver Staff', '202020202020202020', 1500);
    rewardStmt.run(guildId, 'Gold Staff', '303030303030303030', 3000);

    console.log('[Seed] Database seeding completed!');
    console.log(`[Seed] Guild ID: ${guildId}`);
    console.log(`[Seed] Staff members: ${staffMembers.length}`);
}

// Run seeding
seedDatabase();

module.exports = { seedDatabase };
