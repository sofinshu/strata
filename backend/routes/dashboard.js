const express = require('express');
const axios = require('axios');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');

const router = express.Router();
const DISCORD_API = 'https://discord.com/api/v10';

// Public stats endpoint
router.get('/stats', (req, res) => {
    try {
        // Get aggregated stats from database
        const guildCount = db.prepare('SELECT COUNT(*) as count FROM guilds').get().count;
        const staffCount = db.prepare('SELECT COUNT(*) as count FROM guild_members WHERE is_staff = 1').get().count;
        const shiftCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE status = ?').get('completed').count;
        
        res.json({
            guildCount: guildCount || 2400,
            staffCount: staffCount || 0,
            totalShifts: shiftCount || 0,
            commandCount: 271,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Dashboard] Stats error:', error);
        // Return fallback stats
        res.json({
            guildCount: 2400,
            staffCount: 0,
            totalShifts: 0,
            commandCount: 271
        });
    }
});

// Get user's managed guilds
router.get('/guilds', verifyDiscordToken, async (req, res) => {
    try {
        // Get user's guilds from Discord
        const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${req.discordToken}` }
        });

        const allGuilds = guildsRes.data;

        // Filter guilds where user has Manage Server permission (0x20)
        const managedGuilds = allGuilds.filter(g => {
            const permissions = BigInt(g.permissions);
            return g.owner || (permissions & BigInt(0x20));
        });

        // Check which guilds have bot installed and get their tier
        const guildsWithData = managedGuilds.map(g => {
            const dbGuild = db.prepare('SELECT tier FROM guilds WHERE id = ?').get(g.id);
            return {
                id: g.id,
                name: g.name,
                icon: g.icon,
                owner: g.owner,
                permissions: g.permissions,
                botInstalled: !!dbGuild,
                tier: dbGuild?.tier || 'free'
            };
        });

        res.json(guildsWithData);
    } catch (error) {
        console.error('[Dashboard] Guilds error:', error.message);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// Get specific guild overview
router.get('/guild/:guildId', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild info
        let guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
        
        if (!guild) {
            // Guild not in database yet, create entry
            const stmt = db.prepare(`
                INSERT INTO guilds (id, name, icon, owner_id, tier)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
            `);
            stmt.run(guildId, 'Unknown Server', null, req.discordUser.id, 'free');
            guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
        }

        // Get stats
        const staffCount = db.prepare('SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ? AND is_staff = 1').get(guildId).count;
        const shiftCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE guild_id = ? AND status = ?').get(guildId, 'completed').count;
        const warnCount = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND status = ?').get(guildId, 'active').count;
        const totalPoints = db.prepare('SELECT SUM(points) as total FROM guild_members WHERE guild_id = ?').get(guildId).total || 0;

        // Get recent activity for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const activityData = db.prepare(`
            SELECT date(started_at) as date, COUNT(*) as count 
            FROM shifts 
            WHERE guild_id = ? AND started_at > ?
            GROUP BY date(started_at)
            ORDER BY date
        `).all(guildId, sevenDaysAgo.toISOString());

        res.json({
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                tier: guild.tier
            },
            stats: {
                staffCount,
                shiftCount,
                warnCount,
                totalPoints,
                activityCount: totalPoints
            },
            activity: activityData
        });
    } catch (error) {
        console.error('[Dashboard] Guild overview error:', error);
        res.status(500).json({ error: 'Failed to fetch guild overview' });
    }
});

// Get guild staff
router.get('/guild/:guildId/staff', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const staff = db.prepare(`
            SELECT 
                gm.user_id as id,
                gm.username,
                gm.avatar,
                gm.rank as role,
                gm.points,
                gm.reputation,
                gm.is_staff as isStaff,
                sp.shifts_completed as shifts,
                sp.warnings_count as warnings,
                sp.current_rank as currentRank,
                CASE 
                    WHEN s.status = 'active' THEN 1 
                    ELSE 0 
                END as onShift
            FROM guild_members gm
            LEFT JOIN staff_profiles sp ON gm.guild_id = sp.guild_id AND gm.user_id = sp.user_id
            LEFT JOIN shifts s ON gm.guild_id = s.guild_id AND gm.user_id = s.user_id AND s.status = 'active'
            WHERE gm.guild_id = ? AND gm.is_staff = 1
            ORDER BY gm.points DESC
        `).all(guildId);

        res.json(staff);
    } catch (error) {
        console.error('[Dashboard] Staff error:', error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Get shift logs
router.get('/guild/:guildId/shifts', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const shifts = db.prepare(`
            SELECT 
                id,
                user_id as userId,
                username,
                started_at as startTime,
                ended_at as endTime,
                duration_minutes as duration,
                points_earned as pointsEarned,
                status,
                notes
            FROM shifts
            WHERE guild_id = ?
            ORDER BY started_at DESC
            LIMIT ?
        `).all(guildId, limit);

        res.json(shifts);
    } catch (error) {
        console.error('[Dashboard] Shifts error:', error);
        res.status(500).json({ error: 'Failed to fetch shifts' });
    }
});

// Get warnings
router.get('/guild/:guildId/warnings', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const warnings = db.prepare(`
            SELECT 
                id,
                target_user_id as userId,
                target_username as targetUsername,
                issuer_user_id as issuerId,
                issuer_username as issuerUsername,
                reason,
                severity,
                status,
                created_at as createdAt,
                expires_at as expiresAt,
                CASE WHEN status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now')) THEN 0 ELSE 1 END as expired
            FROM warnings
            WHERE guild_id = ?
            ORDER BY created_at DESC
        `).all(guildId);

        res.json(warnings);
    } catch (error) {
        console.error('[Dashboard] Warnings error:', error);
        res.status(500).json({ error: 'Failed to fetch warnings' });
    }
});

// Get leaderboard
router.get('/guild/:guildId/leaderboard', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const leaderboard = db.prepare(`
            SELECT 
                gm.user_id as id,
                gm.username,
                gm.avatar,
                gm.points,
                COALESCE(sp.shifts_completed, 0) as shifts,
                gm.reputation as activity,
                RANK() OVER (ORDER BY gm.points DESC) as rank
            FROM guild_members gm
            LEFT JOIN staff_profiles sp ON gm.guild_id = sp.guild_id AND gm.user_id = sp.user_id
            WHERE gm.guild_id = ? AND gm.is_staff = 1
            ORDER BY gm.points DESC
            LIMIT 25
        `).all(guildId);

        res.json(leaderboard);
    } catch (error) {
        console.error('[Dashboard] Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get activity logs
router.get('/guild/:guildId/activity-logs', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const logs = db.prepare(`
            SELECT 
                id,
                user_id as userId,
                action_type as type,
                metadata as meta,
                created_at as createdAt
            FROM activity_logs
            WHERE guild_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(guildId, limit);

        // Parse metadata JSON
        const parsed = logs.map(log => ({
            ...log,
            meta: log.meta ? JSON.parse(log.meta) : null
        }));

        res.json(parsed);
    } catch (error) {
        console.error('[Dashboard] Activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Get promotion history
router.get('/guild/:guildId/promo-history', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get activity log for rank changes
        const activityLog = db.prepare(`
            SELECT 
                created_at as createdAt,
                user_id as userId,
                action_type as type,
                metadata as meta
            FROM activity_logs
            WHERE guild_id = ? AND action_type IN ('promotion', 'demotion', 'rank_change')
            ORDER BY created_at DESC
            LIMIT 20
        `).all(guildId);

        // Get recent promotions
        const promotions = db.prepare(`
            SELECT 
                ph.user_id as userId,
                ph.username,
                ph.to_rank as currentRank,
                gm.points,
                ph.created_at as lastPromotionDate
            FROM promotion_history ph
            LEFT JOIN guild_members gm ON ph.guild_id = gm.guild_id AND ph.user_id = gm.user_id
            WHERE ph.guild_id = ?
            ORDER BY ph.created_at DESC
            LIMIT 10
        `).all(guildId);

        res.json({
            activityLog: activityLog.map(log => ({
                ...log,
                meta: log.meta ? JSON.parse(log.meta) : null
            })),
            promotions
        });
    } catch (error) {
        console.error('[Dashboard] Promo history error:', error);
        res.status(500).json({ error: 'Failed to fetch promotion history' });
    }
});

// Get ticket logs
router.get('/guild/:guildId/ticket-logs', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { type, status } = req.query;
        
        let query = `
            SELECT 
                id,
                ticket_id as idDisplay,
                category,
                status,
                creator_user_id as originatorId,
                creator_username as username,
                claimed_by_username as staffName,
                target_staff_id as staffId,
                target_staff_name as staffName,
                feedback_text as feedback,
                reason as details,
                created_at as createdAt
            FROM tickets
            WHERE guild_id = ?
        `;
        
        const params = [guildId];
        
        if (type) {
            query += ' AND category = ?';
            params.push(type);
        }
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC LIMIT 50';
        
        const tickets = db.prepare(query).all(...params);
        res.json(tickets);
    } catch (error) {
        console.error('[Dashboard] Ticket logs error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket logs' });
    }
});

// Middleware to check guild access
async function checkGuildAccess(req, res, next) {
    const { guildId } = req.params;
    
    try {
        // Verify user has access to this guild
        const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${req.discordToken}` }
        });

        const guild = guildsRes.data.find(g => g.id === guildId);
        
        if (!guild) {
            return res.status(403).json({ error: 'Access denied to this guild' });
        }

        const permissions = BigInt(guild.permissions);
        const hasAccess = guild.owner || (permissions & BigInt(0x20));
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'Manage Server permission required' });
        }

        req.guildAccess = { guild, permissions };
        next();
    } catch (error) {
        console.error('[Dashboard] Guild access check error:', error.message);
        res.status(500).json({ error: 'Failed to verify guild access' });
    }
}

module.exports = router;
