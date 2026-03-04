const express = require('axios');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');

const router = require('express').Router({ mergeParams: true });

// Get guild settings
router.get('/settings', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const settings = db.prepare(`
            SELECT 
                mod_channel_id as modChannelId,
                staff_channel_id as staffChannelId,
                log_channel_id as logChannelId,
                warn_threshold as warnThreshold,
                min_shift_minutes as minShiftMinutes,
                auto_promotion as autoPromotion,
                shift_tracking_enabled as shiftTrackingEnabled
            FROM guilds
            WHERE id = ?
        `).get(guildId);

        if (!settings) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        res.json(settings);
    } catch (error) {
        console.error('[Guild] Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update guild settings
router.patch('/settings', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const {
            modChannelId,
            staffChannelId,
            logChannelId,
            warnThreshold,
            minShiftMinutes,
            autoPromotion,
            shiftTrackingEnabled
        } = req.body;

        const stmt = db.prepare(`
            UPDATE guilds SET
                mod_channel_id = COALESCE(?, mod_channel_id),
                staff_channel_id = COALESCE(?, staff_channel_id),
                log_channel_id = COALESCE(?, log_channel_id),
                warn_threshold = COALESCE(?, warn_threshold),
                min_shift_minutes = COALESCE(?, min_shift_minutes),
                auto_promotion = COALESCE(?, auto_promotion),
                shift_tracking_enabled = COALESCE(?, shift_tracking_enabled),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            modChannelId,
            staffChannelId,
            logChannelId,
            warnThreshold,
            minShiftMinutes,
            autoPromotion ? 1 : 0,
            shiftTrackingEnabled ? 1 : 0,
            guildId
        );

        // Log the change
        logActivity(guildId, req.discordUser?.id, 'settings_updated', { fields: Object.keys(req.body) });

        res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        console.error('[Guild] Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get promotion requirements
router.get('/promotion-requirements', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const reqs = db.prepare(`
            SELECT 
                rank_name,
                rank_role_id,
                points_required as points,
                shifts_required as shifts,
                consistency_required as consistency,
                max_warnings as maxWarnings,
                shift_hours_required as shiftHours,
                achievements_required as achievements,
                reputation_required as reputation,
                days_in_server_required as daysInServer,
                clean_record_days as cleanRecordDays,
                custom_note as customNote
            FROM promotion_requirements
            WHERE guild_id = ?
        `).all(guildId);

        const guild = db.prepare('SELECT promotion_channel_id FROM guilds WHERE id = ?').get(guildId);

        // Transform to object format
        const requirements = {};
        const rankRoles = {};
        
        reqs.forEach(req => {
            requirements[req.rank_name] = {
                points: req.points,
                shifts: req.shifts,
                consistency: req.consistency,
                maxWarnings: req.maxWarnings,
                shiftHours: req.shiftHours,
                achievements: req.achievements,
                reputation: req.reputation,
                daysInServer: req.daysInServer,
                cleanRecordDays: req.cleanRecordDays,
                customNote: req.customNote
            };
            if (req.rank_role_id) {
                rankRoles[req.rank_name] = req.rank_role_id;
            }
        });

        res.json({
            requirements,
            rankRoles,
            promotionChannel: guild?.promotion_channel_id
        });
    } catch (error) {
        console.error('[Guild] Get promotion requirements error:', error);
        res.status(500).json({ error: 'Failed to fetch promotion requirements' });
    }
});

// Update promotion requirements
router.patch('/promotion-requirements', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { requirements, rankRoles, promotionChannel } = req.body;

        const insertStmt = db.prepare(`
            INSERT INTO promotion_requirements (
                guild_id, rank_name, rank_role_id, points_required, shifts_required,
                consistency_required, max_warnings, shift_hours_required,
                achievements_required, reputation_required, days_in_server_required,
                clean_record_days, custom_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, rank_name) DO UPDATE SET
                rank_role_id = excluded.rank_role_id,
                points_required = excluded.points_required,
                shifts_required = excluded.shifts_required,
                consistency_required = excluded.consistency_required,
                max_warnings = excluded.max_warnings,
                shift_hours_required = excluded.shift_hours_required,
                achievements_required = excluded.achievements_required,
                reputation_required = excluded.reputation_required,
                days_in_server_required = excluded.days_in_server_required,
                clean_record_days = excluded.clean_record_days,
                custom_note = excluded.custom_note,
                updated_at = CURRENT_TIMESTAMP
        `);

        // Update promotion channel if provided
        if (promotionChannel !== undefined) {
            db.prepare('UPDATE guilds SET promotion_channel_id = ? WHERE id = ?')
                .run(promotionChannel, guildId);
        }

        // Update each rank
        if (requirements) {
            Object.entries(requirements).forEach(([rank, req]) => {
                insertStmt.run(
                    guildId,
                    rank,
                    rankRoles?.[rank] || null,
                    req.points || 0,
                    req.shifts || 0,
                    req.consistency || 0,
                    req.maxWarnings || 3,
                    req.shiftHours || 0,
                    req.achievements || 0,
                    req.reputation || 0,
                    req.daysInServer || 0,
                    req.cleanRecordDays || 0,
                    req.customNote || ''
                );
            });
        }

        logActivity(guildId, req.discordUser?.id, 'promotion_requirements_updated', { ranks: Object.keys(requirements || {}) });

        res.json({ success: true, message: 'Promotion requirements updated' });
    } catch (error) {
        console.error('[Guild] Update promotion requirements error:', error);
        res.status(500).json({ error: 'Failed to update promotion requirements' });
    }
});

// Get custom commands
router.get('/custom-commands', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const commands = db.prepare(`
            SELECT 
                trigger,
                response,
                match_type as type,
                is_embed as isEmbed,
                enabled
            FROM custom_commands
            WHERE guild_id = ?
            ORDER BY created_at DESC
        `).all(guildId);

        res.json({ commands });
    } catch (error) {
        console.error('[Guild] Get custom commands error:', error);
        res.status(500).json({ error: 'Failed to fetch custom commands' });
    }
});

// Update custom commands
router.patch('/custom-commands', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { commands } = req.body;

        // Delete existing commands
        db.prepare('DELETE FROM custom_commands WHERE guild_id = ?').run(guildId);

        // Insert new commands
        if (commands && commands.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO custom_commands (guild_id, trigger, response, match_type, is_embed, enabled, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            commands.forEach(cmd => {
                stmt.run(
                    guildId,
                    cmd.trigger,
                    cmd.response,
                    cmd.type || 'exact',
                    cmd.isEmbed ? 1 : 0,
                    cmd.enabled !== false ? 1 : 0,
                    req.discordUser?.id
                );
            });
        }

        logActivity(guildId, req.discordUser?.id, 'custom_commands_updated', { count: commands?.length || 0 });

        res.json({ success: true, message: 'Custom commands updated' });
    } catch (error) {
        console.error('[Guild] Update custom commands error:', error);
        res.status(500).json({ error: 'Failed to update custom commands' });
    }
});

// Get staff rewards (achievements and role rewards)
router.get('/staff-rewards', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        
        const achievements = db.prepare(`
            SELECT 
                achievement_id as id,
                name,
                description,
                icon,
                criteria_type as 'criteria.type',
                criteria_value as 'criteria.value',
                reward_points as rewardPoints,
                reward_role_id as rewardRoleId
            FROM achievements
            WHERE guild_id = ?
        `).all(guildId);

        const roleRewards = db.prepare(`
            SELECT 
                name,
                role_id as roleId,
                required_points as requiredPoints
            FROM role_rewards
            WHERE guild_id = ?
            ORDER BY required_points ASC
        `).all(guildId);

        // Transform achievements to proper format
        const formattedAchievements = achievements.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            criteria: {
                type: a['criteria.type'],
                value: a['criteria.value']
            },
            rewardPoints: a.rewardPoints,
            rewardRoleId: a.rewardRoleId
        }));

        res.json({ 
            achievements: formattedAchievements,
            roleRewards 
        });
    } catch (error) {
        console.error('[Guild] Get staff rewards error:', error);
        res.status(500).json({ error: 'Failed to fetch staff rewards' });
    }
});

// Update staff rewards
router.patch('/staff-rewards', verifyDiscordToken, (req, res) => {
    try {
        const { guildId } = req.params;
        const { achievements, roleRewards } = req.body;

        // Update achievements
        if (achievements) {
            db.prepare('DELETE FROM achievements WHERE guild_id = ?').run(guildId);
            
            const stmt = db.prepare(`
                INSERT INTO achievements (guild_id, achievement_id, name, description, icon, criteria_type, criteria_value, reward_points, reward_role_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            achievements.forEach(ach => {
                stmt.run(
                    guildId,
                    ach.id || `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    ach.name,
                    ach.description || '',
                    ach.icon || '🏅',
                    ach.criteria?.type || 'points',
                    ach.criteria?.value || 0,
                    ach.rewardPoints || 0,
                    ach.rewardRoleId || null
                );
            });
        }

        // Update role rewards
        if (roleRewards) {
            db.prepare('DELETE FROM role_rewards WHERE guild_id = ?').run(guildId);
            
            const stmt = db.prepare(`
                INSERT INTO role_rewards (guild_id, name, role_id, required_points)
                VALUES (?, ?, ?, ?)
            `);

            roleRewards.forEach(rr => {
                stmt.run(guildId, rr.name, rr.roleId, rr.requiredPoints || 0);
            });
        }

        logActivity(guildId, req.discordUser?.id, 'staff_rewards_updated', { 
            achievements: achievements?.length || 0,
            roleRewards: roleRewards?.length || 0
        });

        res.json({ success: true, message: 'Staff rewards updated' });
    } catch (error) {
        console.error('[Guild] Update staff rewards error:', error);
        res.status(500).json({ error: 'Failed to update staff rewards' });
    }
});

// Get root-level configs (alerts, applications, branding)
router.get('/alerts', verifyDiscordToken, (req, res) => {
    getSystemConfig(req.params.guildId, 'alerts', res);
});

router.get('/applications', verifyDiscordToken, (req, res) => {
    getSystemConfig(req.params.guildId, 'applications', res);
});

router.get('/branding', verifyDiscordToken, (req, res) => {
    getSystemConfig(req.params.guildId, 'branding', res);
});

// Update root-level configs
router.patch('/alerts', verifyDiscordToken, (req, res) => {
    updateSystemConfig(req.params.guildId, 'alerts', req.body, req.discordUser?.id, res);
});

router.patch('/applications', verifyDiscordToken, (req, res) => {
    updateSystemConfig(req.params.guildId, 'applications', req.body, req.discordUser?.id, res);
});

router.patch('/branding', verifyDiscordToken, (req, res) => {
    updateSystemConfig(req.params.guildId, 'branding', req.body, req.discordUser?.id, res);
});

// Helper functions
function getSystemConfig(guildId, systemType, res) {
    try {
        const config = db.prepare(`
            SELECT config_json as config, enabled
            FROM system_configs
            WHERE guild_id = ? AND system_type = ?
        `).get(guildId, systemType);

        if (!config) {
            return res.json(getDefaultConfig(systemType));
        }

        const parsed = JSON.parse(config.config);
        parsed.enabled = config.enabled === 1;
        res.json(parsed);
    } catch (error) {
        console.error(`[Guild] Get ${systemType} config error:`, error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
}

function updateSystemConfig(guildId, systemType, data, userId, res) {
    try {
        const stmt = db.prepare(`
            INSERT INTO system_configs (guild_id, system_type, config_json, enabled)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, system_type) DO UPDATE SET
                config_json = excluded.config_json,
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);

        const config = { ...data };
        const enabled = config.enabled !== undefined ? config.enabled : true;
        delete config.enabled;

        stmt.run(guildId, systemType, JSON.stringify(config), enabled ? 1 : 0);

        logActivity(guildId, userId, `${systemType}_updated`, { enabled });

        res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
        console.error(`[Guild] Update ${systemType} config error:`, error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
}

function getDefaultConfig(systemType) {
    const defaults = {
        alerts: {
            enabled: false,
            channelId: '',
            roleId: '',
            threshold: 50
        },
        applications: {
            enabled: false,
            panelTitle: 'Staff Application',
            applyChannelId: '',
            reviewChannelId: '',
            reviewerRoleId: '',
            questions: []
        },
        branding: {
            color: '#6c63ff',
            footer: '',
            iconURL: ''
        }
    };
    return defaults[systemType] || {};
}

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
