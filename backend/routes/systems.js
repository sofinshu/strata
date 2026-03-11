const express = require('express');
const axios = require('axios');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');

const router = express.Router({ mergeParams: true });

// Available systems
const SYSTEMS = ['automod', 'welcome', 'goodbye', 'autorole', 'logging', 'antispam', 'tickets', 'leveling', 'economy', 'giveaways'];

// Get system configuration
router.get('/systems/:system', verifyDiscordToken, (req, res) => {
    try {
        const { guildId, system } = req.params;
        
        if (!SYSTEMS.includes(system)) {
            return res.status(404).json({ error: 'Unknown system' });
        }

        const config = db.prepare(`
            SELECT config_json as config, enabled
            FROM system_configs
            WHERE guild_id = ? AND system_type = ?
        `).get(guildId, system);

        if (!config) {
            return res.json(getDefaultSystemConfig(system));
        }

        const parsed = JSON.parse(config.config);
        
        // Inject enabled status from db back into the config object
        const result = { ...parsed, enabled: config.enabled === 1 };
        
        res.json(result);
    } catch (error) {
        console.error(`[Systems] Get ${req.params.system} error:`, error);
        res.status(500).json({ error: 'Failed to fetch system configuration' });
    }
});

// Update system configuration
router.patch('/systems/:system', verifyDiscordToken, async (req, res) => {
    try {
        const { guildId, system } = req.params;
        const data = req.body;
        
        if (!SYSTEMS.includes(system)) {
            return res.status(404).json({ error: 'Unknown system' });
        }

        // The frontend sends the payload exactly how it should be stored in the DB
        // For systems without an explicit 'enabled' toggle in the UI payload, assume they are enabled when configured (e.g., automod, autorole, logging)
        const enabled = data.enabled !== undefined ? data.enabled : true;
        
        // Remove enabled from config since we store it in a separate column
        const config = { ...data };
        delete config.enabled;

        const stmt = db.prepare(`
            INSERT INTO system_configs (guild_id, system_type, config_json, enabled)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, system_type) DO UPDATE SET
                config_json = excluded.config_json,
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(guildId, system, JSON.stringify(config), enabled ? 1 : 0);

        // Forward to Discord Bot API to sync MongoDB and clear cache
        const BOT_API = process.env.REAL_BOT_API || 'https://sofinshu-production.up.railway.app';
        try {
            await axios.patch(`${BOT_API}/api/dashboard/guild/${guildId}/systems/${system}`, data, {
                headers: {
                    'Authorization': req.headers.authorization,
                    'Content-Type': 'application/json'
                }
            });
        } catch (botErr) {
            console.error(`[Systems] Failed to sync ${system} config to Bot API:`, botErr.message);
        }

        // Log activity
        logActivity(guildId, req.discordUser?.id, `${system}_updated`, { enabled });

        res.json({ success: true, message: `${system} configuration saved` });
    } catch (error) {
        console.error(`[Systems] Update ${req.params.system} error:`, error);
        res.status(500).json({ error: 'Failed to update system configuration' });
    }
});

// Helper function to get default config for each system
function getDefaultSystemConfig(system) {
    const defaults = {
        automod: {
            blockProfanity: false,
            blockLinks: false,
            antiMentionSpam: false,
            blockInvites: false,
            autoTimeout: false,
            logViolations: false,
            bannedWords: [],
            allowedDomains: [],
            maxMentions: 5,
            timeoutDuration: 10,
            logChannel: ''
        },
        welcome: {
            enabled: false,
            channelId: '',
            message: 'Welcome {user} to {server}! You are member #{count}.',
            dmEnabled: false,
            dmMessage: 'Thanks for joining {server}! Read the rules and enjoy your stay.'
        },
        goodbye: {
            enabled: false,
            channelId: '',
            message: '{user} has left {server}. We now have {count} members.',
            dmEnabled: false,
            dmMessage: ''
        },
        leveling: {
            enabled: false,
            minXp: 15,
            maxXp: 25,
            cooldown: 60,
            channelId: '',
            message: 'GG {user}, you just leveled up to **Level {level}**!',
            dmEnabled: false,
            excludedRoles: [],
            excludedChannels: []
        },
        autorole: {
            joinEnabled: false,
            joinRoleId: '',
            botEnabled: false,
            botRoleId: ''
        },
        logging: {
            memberLog: false,
            memberLogChannel: '',
            messageLog: false,
            messageLogChannel: '',
            modLog: false,
            modLogChannel: '',
            roleLog: false,
            roleLogChannel: '',
            voiceLog: false,
            voiceLogChannel: ''
        },
        antispam: {
            enabled: false,
            maxMessagesPerWindow: 5,
            action: 'delete',
            ignoreStaff: true,
            filterDuplicates: true,
            logChannel: ''
        },
        economy: {
            enabled: true,
            currencyName: 'Credits',
            currencySymbol: '💰',
            startingBalance: 0,
            multiplier: 1.0
        },
        tickets: {
            enabled: false,
            panelChannelId: '',
            categoryId: '',
            supportRoleId: '',
            openMessage: 'Welcome to your ticket! A staff member will assist you shortly.',
            transcriptsEnabled: true,
            transcriptChannelId: '',
            maxOpenPerUser: 1
        },
        giveaways: {
            enabled: false,
            announcementChannelId: '',
            defaultDurationMinutes: 1440, // 24 hours
            mentionRole: ''
        }
    };

    return defaults[system] || {};
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
