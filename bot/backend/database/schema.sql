-- STRATA Dashboard Database Schema
-- SQLite database for real data persistence

-- Guilds table - stores server configurations
CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    owner_id TEXT NOT NULL,
    tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'premium', 'enterprise')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Settings
    mod_channel_id TEXT,
    staff_channel_id TEXT,
    log_channel_id TEXT,
    warn_threshold INTEGER DEFAULT 3,
    min_shift_minutes INTEGER DEFAULT 30,
    auto_promotion BOOLEAN DEFAULT 0,
    shift_tracking_enabled BOOLEAN DEFAULT 1,
    
    -- Feature flags
    tickets_enabled BOOLEAN DEFAULT 0,
    alerts_enabled BOOLEAN DEFAULT 0,
    applications_enabled BOOLEAN DEFAULT 0,
    promotion_channel_id TEXT
);

-- Users table - Discord user cache
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar TEXT,
    email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guild Members table - staff and regular members
CREATE TABLE IF NOT EXISTS guild_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    nickname TEXT,
    avatar TEXT,
    roles TEXT, -- JSON array of role IDs
    rank TEXT DEFAULT 'member',
    points INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    achievements TEXT, -- JSON array
    is_staff BOOLEAN DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0,
    joined_at DATETIME,
    last_active_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

-- Staff Profiles - extended staff data
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    current_rank TEXT DEFAULT 'trial',
    previous_rank TEXT,
    shifts_completed INTEGER DEFAULT 0,
    shifts_active INTEGER DEFAULT 0,
    total_shift_minutes INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    last_promotion_at DATETIME,
    joined_staff_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

-- Shifts table - work shift tracking
CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    duration_minutes INTEGER,
    points_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Warnings table - moderation warnings
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    target_username TEXT,
    issuer_user_id TEXT NOT NULL,
    issuer_username TEXT,
    reason TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked')),
    expires_at DATETIME,
    revoked_by TEXT,
    revoked_at DATETIME,
    revoked_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Moderation Actions - bans, kicks, mutes, timeouts
CREATE TABLE IF NOT EXISTS moderation_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('ban', 'unban', 'kick', 'mute', 'unmute', 'timeout', 'warn', 'delete')),
    target_user_id TEXT NOT NULL,
    target_username TEXT,
    moderator_user_id TEXT NOT NULL,
    moderator_username TEXT,
    reason TEXT,
    duration_minutes INTEGER,
    expires_at DATETIME,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Promotion Requirements - auto-promotion criteria
CREATE TABLE IF NOT EXISTS promotion_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    rank_name TEXT NOT NULL,
    rank_role_id TEXT,
    points_required INTEGER DEFAULT 0,
    shifts_required INTEGER DEFAULT 0,
    consistency_required INTEGER DEFAULT 0,
    max_warnings INTEGER DEFAULT 3,
    shift_hours_required INTEGER DEFAULT 0,
    achievements_required INTEGER DEFAULT 0,
    reputation_required INTEGER DEFAULT 0,
    days_in_server_required INTEGER DEFAULT 0,
    clean_record_days INTEGER DEFAULT 0,
    xp_required INTEGER DEFAULT 0,
    promotion_message TEXT,
    custom_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, rank_name)
);

-- Promotion History
CREATE TABLE IF NOT EXISTS promotion_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    from_rank TEXT,
    to_rank TEXT,
    promoted_by TEXT,
    promoted_by_username TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Activity Log - general server activity
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT,
    action_type TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Tickets - support ticket system
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    ticket_id TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- report_staff, feedback, support
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'closed')),
    creator_user_id TEXT NOT NULL,
    creator_username TEXT,
    claimed_by_user_id TEXT,
    claimed_by_username TEXT,
    closed_by_user_id TEXT,
    closed_by_username TEXT,
    subject TEXT,
    description TEXT,
    target_staff_id TEXT, -- for report_staff
    target_staff_name TEXT,
    feedback_text TEXT, -- for feedback
    transcript TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimed_at DATETIME,
    closed_at DATETIME,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- System Configurations - automod, welcome, etc.
CREATE TABLE IF NOT EXISTS system_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    system_type TEXT NOT NULL, -- automod, welcome, autorole, logging, antispam, tickets, alerts, applications, branding
    config_json TEXT NOT NULL, -- JSON configuration
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, system_type)
);

-- Custom Commands - user-defined commands
CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    match_type TEXT DEFAULT 'exact' CHECK(match_type IN ('exact', 'starts', 'contains')),
    is_embed BOOLEAN DEFAULT 1,
    enabled BOOLEAN DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, trigger)
);

-- Achievements - staff achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🏅',
    criteria_type TEXT DEFAULT 'points', -- points, shifts, consistency
    criteria_value INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 0,
    reward_role_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, achievement_id)
);

-- User Achievements - earned achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id, achievement_id)
);

-- Role Rewards - automatic role assignments based on points
CREATE TABLE IF NOT EXISTS role_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role_id TEXT NOT NULL,
    required_points INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Economy/Points Transactions
CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    source TEXT, -- shift, bonus, achievement, command
    issued_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Reaction Roles - message reactions for role assignment
CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Application Templates - staff application questions
CREATE TABLE IF NOT EXISTS application_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 0,
    panel_title TEXT DEFAULT 'Staff Application',
    apply_channel_id TEXT,
    review_channel_id TEXT,
    reviewer_role_id TEXT,
    questions_json TEXT, -- JSON array of questions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Applications - submitted applications
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    applicant_user_id TEXT NOT NULL,
    applicant_username TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'approved', 'rejected')),
    answers_json TEXT, -- JSON object of question: answer
    reviewed_by TEXT,
    reviewed_by_username TEXT,
    review_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Leaderboard Cache - for performance
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    points INTEGER DEFAULT 0,
    shifts INTEGER DEFAULT 0,
    activity_score INTEGER DEFAULT 0,
    rank_position INTEGER,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

-- Giveaways - server giveaway system
CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    prize TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    channel_id TEXT,
    host_user_id TEXT,
    end_at DATETIME NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended', 'cancelled')),
    winners TEXT, -- JSON array of user IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Giveaway Participants - tracking entries
CREATE TABLE IF NOT EXISTS giveaway_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
    UNIQUE(giveaway_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_shifts_guild ON shifts(guild_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_guild ON warnings(guild_id);
CREATE INDEX IF NOT EXISTS idx_warnings_target ON warnings(guild_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_guild ON moderation_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_guild ON activity_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_system_configs_guild ON system_configs(guild_id);
CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_participants_giveaway ON giveaway_participants(giveaway_id);
