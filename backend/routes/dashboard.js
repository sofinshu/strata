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

        // Check which guilds have the bot installed.
        // First checks local SQLite (fast). If not found, confirms via Discord bot API.
        const BOT_TOKEN = process.env.DISCORD_TOKEN;

        const guildsWithData = await Promise.all(managedGuilds.map(async g => {
            let botInstalled = false;
            let tier = 'free';

            // Fast check: is this guild already in the local DB?
            const dbGuild = db.prepare('SELECT tier FROM guilds WHERE id = ?').get(g.id);
            if (dbGuild) {
                botInstalled = true;
                tier = dbGuild.tier || 'free';
            } else if (BOT_TOKEN) {
                // Slow check: ask Discord if our bot is in this guild
                try {
                    await axios.get(`${DISCORD_API}/guilds/${g.id}`, {
                        headers: { Authorization: `Bot ${BOT_TOKEN}` }
                    });
                    botInstalled = true;
                    // Cache guild in DB for future fast lookups
                    try {
                        db.prepare('INSERT OR IGNORE INTO guilds (id, name, tier) VALUES (?, ?, ?)').run(g.id, g.name, 'free');
                    } catch (_) {}
                } catch (_e) {
                    // 403/404 means bot is not in this guild
                    botInstalled = false;
                }
            }

            return {
                id: g.id,
                name: g.name,
                icon: g.icon,
                owner: g.owner,
                permissions: g.permissions,
                botInstalled,
                tier
            };
        }));

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

// Search for non-staff members to hire
router.get('/guild/:guildId/members/search', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const query = req.query.q || '';
        
        if (!query || query.length < 2) {
            return res.json({ members: [] });
        }

        const members = db.prepare(`
            SELECT user_id as id, username, avatar
            FROM guild_members
            WHERE guild_id = ? AND is_staff = 0
            AND (username LIKE ? OR user_id LIKE ?)
            LIMIT 10
        `).all(guildId, `%${query}%`, `%${query}%`);

        res.json({ members });
    } catch (error) {
        console.error('[Dashboard] Member search error:', error);
        res.status(500).json({ error: 'Failed to search members' });
    }
});

// Add a user to the staff team
router.post('/guild/:guildId/staff', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, rank } = req.body;

        if (!userId || !rank) {
            return res.status(400).json({ error: 'User ID and rank are required' });
        }

        // 1. Update guild_members
        const updateMember = db.prepare(`
            UPDATE guild_members 
            SET is_staff = 1, rank = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ? AND user_id = ?
        `);
        const result = updateMember.run(rank, guildId, userId);

        if (result.changes === 0) {
            // Handle case where member doesn't exist in our cache yet
            // Usually the bot would sync this, but for the dashboard we can insert a stub
            db.prepare(`
                INSERT INTO guild_members (guild_id, user_id, username, rank, is_staff, joined_at)
                VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            `).run(guildId, userId, req.body.username || 'Unknown', rank);
        }

        // 2. Ensure staff_profile exists
        db.prepare(`
            INSERT INTO staff_profiles (guild_id, user_id, current_rank, joined_staff_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET
                current_rank = excluded.current_rank,
                updated_at = CURRENT_TIMESTAMP
        `).run(guildId, userId, rank);

        // 3. Log activity
        const logStmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        logStmt.run(guildId, req.discordUser.id, 'promotion', JSON.stringify({
            targetUserId: userId,
            newRank: rank,
            meta: `Added to staff team as ${rank.toUpperCase()}`
        }));

        res.json({ success: true, message: 'Added to staff team' });
    } catch (error) {
        console.error('[Dashboard] Add staff error:', error);
        res.status(500).json({ error: 'Failed to add staff' });
    }
});

// Update staff member (rank or points)
router.patch('/guild/:guildId/staff/:userId', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const { rank, points, pointsAction } = req.body; // pointsAction: 'add', 'remove', 'set'

        if (rank !== undefined) {
            db.prepare('UPDATE guild_members SET rank = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
                .run(rank, guildId, userId);
            db.prepare('UPDATE staff_profiles SET current_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
                .run(rank, guildId, userId);
        }

        if (points !== undefined) {
            if (pointsAction === 'add') {
                db.prepare('UPDATE guild_members SET points = points + ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
                    .run(points, guildId, userId);
            } else if (pointsAction === 'remove') {
                db.prepare('UPDATE guild_members SET points = MAX(0, points - ?), updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
                    .run(points, guildId, userId);
            } else {
                db.prepare('UPDATE guild_members SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
                    .run(points, guildId, userId);
            }
        }

        // Log activity
        const logStmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        logStmt.run(guildId, req.discordUser.id, 'admin_action', JSON.stringify({
            targetUserId: userId,
            rankUpdated: rank,
            pointsUpdated: points,
            pointsAction
        }));

        res.json({ success: true, message: 'Staff member updated' });
    } catch (error) {
        console.error('[Dashboard] Update staff error:', error);
        res.status(500).json({ error: 'Failed to update staff' });
    }
});

// Remove user from staff team
router.delete('/guild/:guildId/staff/:userId', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId, userId } = req.params;

        db.prepare(`
            UPDATE guild_members 
            SET is_staff = 0, points = 0, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ? AND user_id = ?
        `).run(guildId, userId);

        // Delete profile or keep it for history? Let's just update it
        db.prepare("UPDATE staff_profiles SET current_rank = 'member', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?")
            .run(guildId, userId);

        // Log activity
        const logStmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        logStmt.run(guildId, req.discordUser.id, 'demotion', JSON.stringify({
            targetUserId: userId,
            meta: 'Removed from staff team'
        }));

        res.json({ success: true, message: 'Removed from staff team' });
    } catch (error) {
        console.error('[Dashboard] Remove staff error:', error);
        res.status(500).json({ error: 'Failed to remove staff' });
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
                COALESCE(claimed_by_username, target_staff_name) as staffName,
                target_staff_id as staffId,
                feedback_text as feedback,
                description as details,
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

// Simple in-memory cache for user guilds to prevent 429 rate limits
const guildAccessCache = new Map();

// Middleware to check guild access
async function checkGuildAccess(req, res, next) {
    const { guildId } = req.params;
    const token = req.discordToken;
    
    try {
        let userGuilds = null;
        
        // Check cache first (valid for 5 minutes)
        if (guildAccessCache.has(token)) {
            const cached = guildAccessCache.get(token);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                userGuilds = cached.data;
            } else {
                guildAccessCache.delete(token); // expired
            }
        }
        
        // Fetch from Discord if not cached
        if (!userGuilds) {
            const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            userGuilds = guildsRes.data;
            
            // Save to cache
            guildAccessCache.set(token, {
                data: userGuilds,
                timestamp: Date.now()
            });
        }

        const guild = userGuilds.find(g => g.id === guildId);
        
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

// ── ROLE REWARDS ──────────────────────────────────────────────

// Get all role rewards
router.get('/guild/:guildId/role-rewards', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const rewards = db.prepare('SELECT * FROM role_rewards WHERE guild_id = ? ORDER BY required_points ASC').all(guildId);
        res.json(rewards);
    } catch (error) {
        console.error('[Dashboard] Get role rewards error:', error);
        res.status(500).json({ error: 'Failed to fetch role rewards' });
    }
});

// Create a role reward
router.post('/guild/:guildId/role-rewards', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { name, roleId, requiredPoints } = req.body;

        if (!name || !roleId || requiredPoints === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const stmt = db.prepare(`
            INSERT INTO role_rewards (guild_id, name, role_id, required_points)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(guildId, name, roleId, requiredPoints);

        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        console.error('[Dashboard] Create role reward error:', error);
        res.status(500).json({ error: 'Failed to create role reward' });
    }
});

// Delete a role reward
router.delete('/guild/:guildId/role-rewards/:id', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId, id } = req.params;
        const result = db.prepare('DELETE FROM role_rewards WHERE guild_id = ? AND id = ?').run(guildId, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Role reward not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Dashboard] Delete role reward error:', error);
        res.status(500).json({ error: 'Failed to delete role reward' });
    }
});

// Get point transactions
router.get('/guild/:guildId/transactions', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const transactions = db.prepare(`
            SELECT t.*, u.username 
            FROM point_transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.guild_id = ? 
            ORDER BY t.created_at DESC 
            LIMIT 50
        `).all(guildId);
        res.json(transactions);
    } catch (error) {
        console.error('[Dashboard] Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ── GIVEAWAYS ────────────────────────────────────────────────

// Get all giveaways
router.get('/guild/:guildId/giveaways', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const giveaways = db.prepare(`
            SELECT g.*, 
                   (SELECT COUNT(*) FROM giveaway_participants WHERE giveaway_id = g.id) as participantCount
            FROM giveaways g
            WHERE g.guild_id = ?
            ORDER BY g.created_at DESC
        `).all(guildId);
        
        res.json(giveaways);
    } catch (error) {
        console.error('[Dashboard] Get giveaways error:', error);
        res.status(500).json({ error: 'Failed to fetch giveaways' });
    }
});

// Create a giveaway
router.post('/guild/:guildId/giveaways', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { prize, winnerCount, durationMinutes, channelId } = req.body;

        if (!prize || !winnerCount || !durationMinutes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const endAt = new Date(Date.now() + durationMinutes * 60000).toISOString();
        
        const stmt = db.prepare(`
            INSERT INTO giveaways (guild_id, prize, winner_count, channel_id, host_user_id, end_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        `);
        
        const result = stmt.run(guildId, prize, winnerCount, channelId || null, req.discordUser.id, endAt);

        res.json({ success: true, id: result.lastInsertRowid, endAt });
    } catch (error) {
        console.error('[Dashboard] Create giveaway error:', error);
        res.status(500).json({ error: 'Failed to create giveaway' });
    }
});

// Delete/Cancel a giveaway
router.delete('/guild/:guildId/giveaways/:id', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId, id } = req.params;
        
        // Only delete if it belongs to this guild
        const result = db.prepare('DELETE FROM giveaways WHERE guild_id = ? AND id = ?').run(guildId, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Giveaway not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Dashboard] Delete giveaway error:', error);
        res.status(500).json({ error: 'Failed to delete giveaway' });
    }
});

// ── CUSTOM COMMANDS ──────────────────────────────────────────

// Get all custom commands
router.get('/guild/:guildId/custom-commands', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const commands = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY trigger ASC').all(guildId);
        res.json(commands);
    } catch (error) {
        console.error('[Dashboard] Get custom commands error:', error);
        res.status(500).json({ error: 'Failed to fetch custom commands' });
    }
});

// Create/Update custom command
router.post('/guild/:guildId/custom-commands', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { id, trigger, response, matchType, isEmbed, enabled } = req.body;

        if (!trigger || !response) {
            return res.status(400).json({ error: 'Trigger and response are required' });
        }

        if (id) {
            // Update
            const stmt = db.prepare(`
                UPDATE custom_commands 
                SET trigger = ?, response = ?, match_type = ?, is_embed = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND guild_id = ?
            `);
            stmt.run(trigger.toLowerCase(), response, matchType || 'exact', isEmbed ? 1 : 0, enabled ? 1 : 0, id, guildId);
        } else {
            // New
            const stmt = db.prepare(`
                INSERT INTO custom_commands (guild_id, trigger, response, match_type, is_embed, enabled, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(guildId, trigger.toLowerCase(), response, matchType || 'exact', isEmbed ? 1 : 0, enabled ? 1 : 0, req.discordUser.id);
        }

        res.json({ success: true, message: 'Custom command saved' });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A command with this trigger already exists' });
        }
        console.error('[Dashboard] Save custom command error:', error);
        res.status(500).json({ error: 'Failed to save custom command' });
    }
});

// Delete custom command
router.delete('/guild/:guildId/custom-commands/:id', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId, id } = req.params;
        const stmt = db.prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?');
        const result = stmt.run(id, guildId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Command not found' });
        }

        res.json({ success: true, message: 'Custom command deleted' });
    } catch (error) {
        console.error('[Dashboard] Delete custom command error:', error);
        res.status(500).json({ error: 'Failed to delete custom command' });
    }
});

// ── LOGGING ───────────────────────────────────────────────────
// Get moderation actions
router.get('/guild/:guildId/moderation', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { type } = req.query;
        
        let query = 'SELECT * FROM moderation_actions WHERE guild_id = ?';
        const params = [guildId];
        
        if (type) {
            query += ' AND action_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY created_at DESC LIMIT 100';
        
        const actions = db.prepare(query).all(...params);
        res.json(actions);
    } catch (error) {
        console.error('[Dashboard] Get moderation actions error:', error);
        res.status(500).json({ error: 'Failed to fetch moderation history' });
    }
});

// Issue a moderation action
router.post('/guild/:guildId/moderation', verifyDiscordToken, checkGuildAccess, (req, res) => {
    try {
        const { guildId } = req.params;
        const { targetUserId, targetUsername, actionType, reason, durationMinutes } = req.body;

        if (!targetUserId || !actionType) {
            return res.status(400).json({ error: 'Target User ID and Action Type are required' });
        }

        const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null;

        // 1. Insert into moderation_actions
        const modStmt = db.prepare(`
            INSERT INTO moderation_actions (
                guild_id, action_type, target_user_id, target_username, 
                moderator_user_id, moderator_username, reason, duration_minutes, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        modStmt.run(
            guildId, actionType, targetUserId, targetUsername || 'Unknown',
            req.discordUser.id, req.discordUser.username, reason || 'No reason provided',
            durationMinutes || null, expiresAt
        );

        // 2. If it's a warning, also insert into warnings table
        if (actionType === 'warn') {
            const warnStmt = db.prepare(`
                INSERT INTO warnings (
                    guild_id, target_user_id, target_username, 
                    issuer_user_id, issuer_username, reason, severity
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            warnStmt.run(guildId, targetUserId, targetUsername || 'Unknown', req.discordUser.id, req.discordUser.username, reason || 'No reason provided', 'medium');
            
            // Increment warning count in staff profile if the target is staff
            db.prepare('UPDATE staff_profiles SET warnings_count = warnings_count + 1 WHERE guild_id = ? AND user_id = ?').run(guildId, targetUserId);
        }

        // 3. Log activity
        const logStmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        logStmt.run(guildId, req.discordUser.id, `mod_${actionType}`, JSON.stringify({
            targetUserId,
            reason,
            duration: durationMinutes
        }));

        res.json({ success: true, message: `Action ${actionType} issued successfully` });
    } catch (error) {
        console.error('[Dashboard] Post moderation action error:', error);
        res.status(500).json({ error: 'Failed to issue moderation action' });
    }
});

module.exports = router;
