const express = require('express');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');

const router = express.Router({ mergeParams: true });

// Get moderation actions (bans, kicks, mutes)
router.get('/moderation/actions', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { type, limit = 50 } = req.query;
        
        let query = `
            SELECT 
                id,
                action_type as actionType,
                target_user_id as targetUserId,
                target_username as targetUsername,
                moderator_user_id as moderatorId,
                moderator_username as moderatorUsername,
                reason,
                duration_minutes as duration,
                active,
                created_at as createdAt
            FROM moderation_actions
            WHERE guild_id = ?
        `;
        
        const params = [guildId];
        
        if (type) {
            query += ' AND action_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const actions = db.prepare(query).all(...params);
        res.json(actions);
    } catch (error) {
        console.error('[Moderation] Get actions error:', error);
        res.status(500).json({ error: 'Failed to fetch moderation actions' });
    }
});

// Ban user
router.post('/moderation/ban', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, username, reason, duration } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO moderation_actions 
            (guild_id, action_type, target_user_id, target_username, moderator_user_id, moderator_username, reason, duration_minutes)
            VALUES (?, 'ban', ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            guildId,
            userId,
            username,
            req.discordUser.id,
            req.discordUser.username,
            reason,
            duration || null
        );

        // Log activity
        logActivity(guildId, req.discordUser.id, 'user_banned', { target: userId, reason });

        res.json({ success: true, message: 'User banned' });
    } catch (error) {
        console.error('[Moderation] Ban error:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Kick user
router.post('/moderation/kick', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, username, reason } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO moderation_actions 
            (guild_id, action_type, target_user_id, target_username, moderator_user_id, moderator_username, reason)
            VALUES (?, 'kick', ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            guildId,
            userId,
            username,
            req.discordUser.id,
            req.discordUser.username,
            reason
        );

        logActivity(guildId, req.discordUser.id, 'user_kicked', { target: userId, reason });

        res.json({ success: true, message: 'User kicked' });
    } catch (error) {
        console.error('[Moderation] Kick error:', error);
        res.status(500).json({ error: 'Failed to kick user' });
    }
});

// Warn user
router.post('/moderation/warn', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, username, reason, severity = 'medium', expiresAt } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO warnings 
            (guild_id, target_user_id, target_username, issuer_user_id, issuer_username, reason, severity, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            guildId,
            userId,
            username,
            req.discordUser.id,
            req.discordUser.username,
            reason,
            severity,
            expiresAt || null
        );

        // Update staff profile warning count if user is staff
        db.prepare(`
            UPDATE staff_profiles 
            SET warnings_count = warnings_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ? AND user_id = ?
        `).run(guildId, userId);

        logActivity(guildId, req.discordUser.id, 'user_warned', { target: userId, reason, severity });

        res.json({ success: true, message: 'Warning issued' });
    } catch (error) {
        console.error('[Moderation] Warn error:', error);
        res.status(500).json({ error: 'Failed to issue warning' });
    }
});

// Revoke warning
router.post('/moderation/warnings/:warningId/revoke', verifyDiscordToken, (req, res) => {
    try {
        const { guildId, warningId } = req.params;
        const { reason } = req.body;
        
        const stmt = db.prepare(`
            UPDATE warnings 
            SET status = 'revoked', revoked_by = ?, revoked_at = CURRENT_TIMESTAMP, revoked_reason = ?
            WHERE id = ? AND guild_id = ?
        `);
        
        stmt.run(req.discordUser.id, reason, warningId, guildId);

        logActivity(guildId, req.discordUser.id, 'warning_revoked', { warningId, reason });

        res.json({ success: true, message: 'Warning revoked' });
    } catch (error) {
        console.error('[Moderation] Revoke warning error:', error);
        res.status(500).json({ error: 'Failed to revoke warning' });
    }
});

// Mute user (timeout)
router.post('/moderation/mute', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, username, reason, duration } = req.body;
        
        const expiresAt = duration ? new Date(Date.now() + duration * 60000).toISOString() : null;
        
        const stmt = db.prepare(`
            INSERT INTO moderation_actions 
            (guild_id, action_type, target_user_id, target_username, moderator_user_id, moderator_username, reason, duration_minutes, expires_at)
            VALUES (?, 'timeout', ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            guildId,
            userId,
            username,
            req.discordUser.id,
            req.discordUser.username,
            reason,
            duration,
            expiresAt
        );

        logActivity(guildId, req.discordUser.id, 'user_muted', { target: userId, duration, reason });

        res.json({ success: true, message: 'User muted' });
    } catch (error) {
        console.error('[Moderation] Mute error:', error);
        res.status(500).json({ error: 'Failed to mute user' });
    }
});

// Unmute user
router.post('/moderation/unmute', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, reason } = req.body;
        
        // Deactivate timeout actions
        db.prepare(`
            UPDATE moderation_actions 
            SET active = 0
            WHERE guild_id = ? AND target_user_id = ? AND action_type = 'timeout' AND active = 1
        `).run(guildId, userId);

        // Log unmute action
        const stmt = db.prepare(`
            INSERT INTO moderation_actions 
            (guild_id, action_type, target_user_id, moderator_user_id, moderator_username, reason, active)
            VALUES (?, 'unmute', ?, ?, ?, ?, 0)
        `);
        
        stmt.run(guildId, userId, req.discordUser.id, req.discordUser.username, reason);

        logActivity(guildId, req.discordUser.id, 'user_unmuted', { target: userId, reason });

        res.json({ success: true, message: 'User unmuted' });
    } catch (error) {
        console.error('[Moderation] Unmute error:', error);
        res.status(500).json({ error: 'Failed to unmute user' });
    }
});

// Unban user
router.post('/moderation/unban', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { userId, reason } = req.body;
        
        // Deactivate ban actions
        db.prepare(`
            UPDATE moderation_actions 
            SET active = 0
            WHERE guild_id = ? AND target_user_id = ? AND action_type = 'ban' AND active = 1
        `).run(guildId, userId);

        // Log unban action
        const stmt = db.prepare(`
            INSERT INTO moderation_actions 
            (guild_id, action_type, target_user_id, moderator_user_id, moderator_username, reason, active)
            VALUES (?, 'unban', ?, ?, ?, ?, 0)
        `);
        
        stmt.run(guildId, userId, req.discordUser.id, req.discordUser.username, reason);

        logActivity(guildId, req.discordUser.id, 'user_unbanned', { target: userId, reason });

        res.json({ success: true, message: 'User unbanned' });
    } catch (error) {
        console.error('[Moderation] Unban error:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Get moderation stats
router.get('/moderation/stats', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const stats = db.prepare(`
            SELECT 
                action_type,
                COUNT(*) as count
            FROM moderation_actions
            WHERE guild_id = ?
            AND created_at > datetime('now', '-30 days')
            GROUP BY action_type
        `).all(guildId);

        const warningsCount = db.prepare(`
            SELECT COUNT(*) as count 
            FROM warnings 
            WHERE guild_id = ? AND status = 'active'
        `).get(guildId).count;

        const result = {
            totalActions: stats.reduce((acc, s) => acc + s.count, 0),
            warnings: warningsCount,
            byType: stats.reduce((acc, s) => {
                acc[s.action_type] = s.count;
                return acc;
            }, {})
        };

        res.json(result);
    } catch (error) {
        console.error('[Moderation] Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch moderation stats' });
    }
});

function logActivity(guildId, userId, actionType, metadata) {
    try {
        const stmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(guildId, userId, actionType, JSON.stringify(metadata));
    } catch (e) {
        console.error('[Activity Log] Error:', e);
    }
}

module.exports = router;
