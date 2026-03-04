const express = require('express');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');

const router = express.Router({ mergeParams: true });

// Available systems
const SYSTEMS = ['automod', 'welcome', 'autorole', 'logging', 'antispam', 'tickets'];

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
        // Map enabled to appropriate property based on system
        const result = mapConfigToUI(system, parsed, config.enabled === 1);
        res.json(result);
    } catch (error) {
        console.error(`[Systems] Get ${req.params.system} error:`, error);
        res.status(500).json({ error: 'Failed to fetch system configuration' });
    }
});

// Update system configuration
router.patch('/systems/:system', verifyDiscordToken, (req, res) => {
    try {
        const { guildId, system } = req.params;
        const data = req.body;
        
        if (!SYSTEMS.includes(system)) {
            return res.status(404).json({ error: 'Unknown system' });
        }

        // Map UI data to storage format
        const { enabled, config } = mapUItoConfig(system, data);

        const stmt = db.prepare(`
            INSERT INTO system_configs (guild_id, system_type, config_json, enabled)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, system_type) DO UPDATE SET
                config_json = excluded.config_json,
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(guildId, system, JSON.stringify(config), enabled ? 1 : 0);

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
        tickets: {
            enabled: false,
            panelChannelId: '',
            categoryId: '',
            supportRoleId: '',
            openMessage: 'Welcome to your ticket! A staff member will assist you shortly.',
            transcriptsEnabled: true,
            transcriptChannelId: '',
            maxOpenPerUser: 1
        }
    };

    return defaults[system] || {};
}

// Map stored config to UI format with specific IDs
function mapConfigToUI(system, config, enabled) {
    const result = { ...config };
    
    switch (system) {
        case 'automod':
            // am- prefix for automod
            return {
                profanity: result.blockProfanity || false,
                links: result.blockLinks || false,
                mentions: result.antiMentionSpam || false,
                invites: result.blockInvites || false,
                timeout: result.autoTimeout || false,
                log: result.logViolations || false,
                'banned-words': (result.bannedWords || []).join(', '),
                'allowed-domains': (result.allowedDomains || []).join(', '),
                'max-mentions': result.maxMentions || 5,
                'timeout-dur': result.timeoutDuration || 10,
                'log-channel': result.logChannel || ''
            };
        case 'welcome':
            // wlc- prefix for welcome
            return {
                enabled: enabled,
                channel: result.channelId || '',
                message: result.message || '',
                dm: result.dmEnabled || false,
                'dm-message': result.dmMessage || ''
            };
        case 'autorole':
            // ar- prefix for autorole
            return {
                join: result.joinEnabled || false,
                'join-role': result.joinRoleId || '',
                bot: result.botEnabled || false,
                'bot-role': result.botRoleId || ''
            };
        case 'logging':
            // log- prefix for logging
            return {
                members: result.memberLog || false,
                'members-ch': result.memberLogChannel || '',
                messages: result.messageLog || false,
                'messages-ch': result.messageLogChannel || '',
                mod: result.modLog || false,
                'mod-ch': result.modLogChannel || '',
                roles: result.roleLog || false,
                'roles-ch': result.roleLogChannel || '',
                voice: result.voiceLog || false,
                'voice-ch': result.voiceLogChannel || ''
            };
        case 'antispam':
            // as- prefix for antispam
            return {
                enabled: enabled,
                rate: result.maxMessagesPerWindow || 5,
                action: result.action || 'delete',
                'ignore-staff': result.ignoreStaff !== false,
                dupes: result.filterDuplicates !== false,
                'log-ch': result.logChannel || ''
            };
        case 'tickets':
            // tk- prefix for tickets
            return {
                enabled: enabled,
                'panel-ch': result.panelChannelId || '',
                category: result.categoryId || '',
                'support-role': result.supportRoleId || '',
                'open-msg': result.openMessage || '',
                transcripts: result.transcriptsEnabled !== false,
                'transcript-ch': result.transcriptChannelId || '',
                max: result.maxOpenPerUser || 1
            };
        default:
            return result;
    }
}

// Map UI data to storage format
function mapUItoConfig(system, data) {
    let enabled = false;
    let config = {};

    switch (system) {
        case 'automod':
            enabled = true; // Automod is always "enabled" when configured
            config = {
                blockProfanity: data.profanity || false,
                blockLinks: data.links || false,
                antiMentionSpam: data.mentions || false,
                blockInvites: data.invites || false,
                autoTimeout: data.timeout || false,
                logViolations: data.log || false,
                bannedWords: (data['banned-words'] || '').split(',').map(w => w.trim()).filter(Boolean),
                allowedDomains: (data['allowed-domains'] || '').split(',').map(d => d.trim()).filter(Boolean),
                maxMentions: parseInt(data['max-mentions']) || 5,
                timeoutDuration: parseInt(data['timeout-dur']) || 10,
                logChannel: data['log-channel'] || ''
            };
            break;
        case 'welcome':
            enabled = data.enabled || false;
            config = {
                channelId: data.channel || '',
                message: data.message || '',
                dmEnabled: data.dm || false,
                dmMessage: data['dm-message'] || ''
            };
            break;
        case 'autorole':
            enabled = true;
            config = {
                joinEnabled: data.join || false,
                joinRoleId: data['join-role'] || '',
                botEnabled: data.bot || false,
                botRoleId: data['bot-role'] || ''
            };
            break;
        case 'logging':
            enabled = true;
            config = {
                memberLog: data.members || false,
                memberLogChannel: data['members-ch'] || '',
                messageLog: data.messages || false,
                messageLogChannel: data['messages-ch'] || '',
                modLog: data.mod || false,
                modLogChannel: data['mod-ch'] || '',
                roleLog: data.roles || false,
                roleLogChannel: data['roles-ch'] || '',
                voiceLog: data.voice || false,
                voiceLogChannel: data['voice-ch'] || ''
            };
            break;
        case 'antispam':
            enabled = data.enabled || false;
            config = {
                maxMessagesPerWindow: parseInt(data.rate) || 5,
                action: data.action || 'delete',
                ignoreStaff: data['ignore-staff'] !== false,
                filterDuplicates: data.dupes !== false,
                logChannel: data['log-ch'] || ''
            };
            break;
        case 'tickets':
            enabled = data.enabled || false;
            config = {
                panelChannelId: data['panel-ch'] || '',
                categoryId: data.category || '',
                supportRoleId: data['support-role'] || '',
                openMessage: data['open-msg'] || '',
                transcriptsEnabled: data.transcripts !== false,
                transcriptChannelId: data['transcript-ch'] || '',
                maxOpenPerUser: parseInt(data.max) || 1
            };
            break;
        default:
            config = data;
    }

    return { enabled, config };
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
