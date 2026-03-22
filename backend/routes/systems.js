const express = require('express');
const axios = require('axios');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');
const { getBotApiConfig } = require('../utils/config');
const { client } = require('../bot');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const router = express.Router({ mergeParams: true });

// Available systems
const SYSTEMS = ['automod', 'welcome', 'goodbye', 'autorole', 'logging', 'antispam', 'tickets', 'leveling', 'economy', 'giveaways', 'applications', 'alerts', 'branding'];

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

        // Normalize guildId to string for consistent storage and lookup
        const normalizedGuildId = String(guildId);
        
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

        stmt.run(normalizedGuildId, system, JSON.stringify(config), enabled ? 1 : 0);
        console.log(`[Systems] ${normalizedGuildId}: Saved ${system} (Enabled: ${enabled}). Config:`, JSON.stringify(config));

        // Sync to Bot API removed - Bot and Dashboard are now unified/single-process.
        // The bot instance running in this same process reads directly from the shared SQLite database.
        console.log(`[Systems] Adjusted ${system} config in database. Bot will pick up changes on next relevant event.`);


        // Log activity
        logActivity(normalizedGuildId, req.discordUser?.id, `${system}_updated`, { enabled });

        // --- UNIFIED BOT ACTIONS (IMMEDIATE FEEDBACK) ---
        let actionMessage = `${system} configuration saved`;
        
        // Use fetch instead of cache.get to ensure guild exists even if not in cache
        let guild = null;
        try {
            guild = await client.guilds.fetch(normalizedGuildId).catch(() => null);
        } catch (fetchErr) {
            console.error(`[Systems] Error fetching guild ${normalizedGuildId}:`, fetchErr.message);
        }
        
        if (enabled && guild && client.isReady()) {
            try {
                // TICKET PANEL
                if (system === 'tickets' && config.panelChannelId) {
                    const channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setAuthor({ name: 'ULTRA-SUPPORT PROTOCOL', iconURL: 'https://i.imgur.com/vH9YkYm.png' })
                            .setTitle('🛡️ SECURE SERVICE PORTAL')
                            .setDescription(config.openMessage || 'Our specialized support team is ready to assist. Click the button below to initialize a secure connection.')
                            .addFields(
                                { name: '⚡ Response Time', value: '`< 5 Minutes`', inline: true },
                                { name: '🔒 Security', value: '`Encrypted`', inline: true }
                            )
                            .setColor(0x6c63ff)
                            .setImage('https://i.imgur.com/Atu9E8I.png')
                            .setFooter({ text: 'STRATA TICKET CORE • SYSTEM READY', iconURL: client.user.displayAvatarURL() });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('open_ticket')
                                .setLabel('Initialize Ticket')
                                .setEmoji('🎫')
                                .setStyle(ButtonStyle.Primary)
                        );

                        await channel.send({ embeds: [embed], components: [row] });
                        actionMessage = `✅ **Ticket System Synchronized!** Panel posted to #${channel.name}.`;
                    }
                }

                // WELCOME PREVIEW
                else if (system === 'welcome' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        const welcomeMsg = (config.message || 'Welcome {user} to {server}!')
                            .replace(/{user}/g, req.discordUser?.username || 'User')
                            .replace(/{server}/g, guild.name)
                            .replace(/{count}/g, guild.memberCount)
                            .replace(/{membercount}/g, guild.memberCount);

                        const embed = new EmbedBuilder()
                            .setAuthor({ name: 'ENTRY DETECTED • PROTOCOL TEST', iconURL: guild.iconURL({ dynamic: true }) })
                            .setTitle('WELCOME TO THE NEON DOMAIN')
                            .setDescription(`**CONFIG PREVIEW:**\n${welcomeMsg}`)
                            .setColor(0x6c63ff)
                            .setImage('https://i.imgur.com/Atu9E8I.png')
                            .setFooter({ text: 'PREVIEW MODE: System Active & Verified' })
                            .setTimestamp();

                        await channel.send({ content: `👋 **Test Arrival Logic Processed.**`, embeds: [embed] });
                        actionMessage = `✅ **Welcome Flow Verified!** Preview sent to #${channel.name}.`;
                    }
                }

                // GOODBYE PREVIEW
                else if (system === 'goodbye' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        const goodbyeMsg = (config.message || '{user} has left {server}.')
                            .replace(/{user}/g, req.discordUser?.username || 'User')
                            .replace(/{server}/g, guild.name)
                            .replace(/{count}/g, guild.memberCount)
                            .replace(/{membercount}/g, guild.memberCount);

                        const embed = new EmbedBuilder()
                            .setAuthor({ name: 'DISCONNECTION DETECTED • PROTOCOL TEST', iconURL: guild.iconURL() })
                            .setTitle(`A VIBE HAS LEFT THE SERVER`)
                            .setDescription(`**CONFIG PREVIEW:**\n${goodbyeMsg}`)
                            .setColor(0xff4757)
                            .setFooter({ text: 'PREVIEW MODE: System Active & Verified' });

                        await channel.send({ embeds: [embed] });
                        actionMessage = `✅ **Goodbye Flow Verified!** Preview sent to #${channel.name}.`;
                    }
                }

                // LOGGING INITIALIZATION
                else if (system === 'logging') {
                    const channels = [config.memberLogChannel, config.messageLogChannel, config.modLogChannel].filter(Boolean);
                    for (const chId of channels) {
                        const channel = await guild.channels.fetch(chId).catch(() => null);
                        if (channel) {
                            await channel.send({ 
                                embeds: [new EmbedBuilder().setDescription(`📑 **Logging system updated and active.**`).setColor(0x5865F2)] 
                            }).catch(() => null);
                        }
                    }
                    actionMessage = `✅ Logging settings saved and test logs sent.`;
                }

                // LEVELING ANNOUNCEMENT
                else if (system === 'leveling' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        await channel.send({ 
                            embeds: [new EmbedBuilder()
                                .setTitle('✨ Leveling Active')
                                .setDescription(`The leveling system has been enabled!\n**Preview:** ${config.message || 'GG {user}, you leveled up!'}`)
                                .setColor(0xf1c40f)] 
                        });
                        actionMessage = `✅ Leveling saved and announced in #${channel.name}!`;
                    }
                }

                // AUTOMOD CONFIRMATION
                else if (system === 'automod') {
                    const logChannel = config.logChannel ? await guild.channels.fetch(config.logChannel).catch(() => null) : null;
                    if (logChannel) {
                        await logChannel.send({ 
                            embeds: [new EmbedBuilder()
                                .setAuthor({ name: 'Shield System', iconURL: 'https://i.imgur.com/8S7X7f5.png' })
                                .setTitle('🛡️ Auto-Mod Configuration')
                                .setDescription('Auto-Mod system has been updated and is now active.')
                                .addFields(
                                    { name: '🔗 Links', value: config.blockLinks ? '`Blocked`' : '`Allowed`', inline: true },
                                    { name: '�Invite', value: config.blockInvites ? '`Blocked`' : '`Allowed`', inline: true },
                                    { name: '📣 Mentions', value: config.antiMentionSpam ? `\`Max ${config.maxMentions}\`` : '`Disabled`', inline: true }
                                )
                                .setColor(0x6c63ff)
                                .setTimestamp()]
                        });
                    }
                    actionMessage = `✅ Auto-Mod saved and ${logChannel ? `confirmed in #${logChannel.name}` : 'ready to use'}!`;
                }

                // AUTOROLE CONFIRMATION
                else if (system === 'autorole') {
                    const joinRole = config.joinRoleId ? guild.roles.cache.get(config.joinRoleId) : null;
                    const botRole = config.botRoleId ? guild.roles.cache.get(config.botRoleId) : null;
                    
                    actionMessage = `✅ Auto-Role configured! Members: ${joinRole ? `will get ${joinRole.name}` : 'none'}, Bots: ${botRole ? `will get ${botRole.name}` : 'none'}.`;
                }

                // ANTISPAM CONFIRMATION
                else if (system === 'antispam') {
                    const logChannel = config.logChannel ? await guild.channels.fetch(config.logChannel).catch(() => null) : null;
                    if (logChannel) {
                        await logChannel.send({ 
                            embeds: [new EmbedBuilder()
                                .setTitle('🛡️ Anti-Spam Shield Active')
                                .setDescription(`Maximum ${config.maxMessagesPerWindow} messages per 2 seconds allowed.`)
                                .setColor(0xff4757)
                                .setTimestamp()]
                        });
                    }
                    actionMessage = `✅ Anti-Spam saved and ${logChannel ? `active` : 'ready'}!`;
                }

                // ECONOMY CONFIRMATION
                else if (system === 'economy') {
                    actionMessage = `✅ Economy system enabled! Currency: ${config.currencySymbol} ${config.currencyName}.`;
                }

                // GIVEAWAYS CONFIRMATION
                else if (system === 'giveaways') {
                    const announceChannel = config.announcementChannelId ? await guild.channels.fetch(config.announcementChannelId).catch(() => null) : null;
                    if (announceChannel) {
                        await announceChannel.send({ 
                            embeds: [new EmbedBuilder()
                                .setTitle('🎉 Giveaway System Ready')
                                .setDescription('The giveaway system has been configured and is ready to use!')
                                .addFields(
                                    { name: '⏱️ Default Duration', value: `\`${config.defaultDurationMinutes} minutes\``, inline: true }
                                )
                                .setColor(0x9b59b6)
                                .setTimestamp()]
                        });
                    }
                    actionMessage = `✅ Giveaways configured and ${announceChannel ? `ready in #${announceChannel.name}` : 'ready to use'}!`;
                }

            } catch (botErr) {
                console.error(`[Bot] ${normalizedGuildId}: Discord action error:`, botErr.message);
                actionMessage = `⚠️ ${system} saved, but bot action failed: ${botErr.message}`;
            }
        } else if (enabled && !guild) {
            actionMessage = `⚠️ ${system} saved, but bot is NOT in this server! Invite it first.`;
        } else if (enabled && !client.isReady()) {
            actionMessage = `⚠️ ${system} saved, but Discord is connecting. Bot will sync shortly.`;
        }

        const debugInfo = `(System: ${system}, Enabled: ${enabled}, HasChannel: ${!!(config.panelChannelId || config.channelId)})`;
        res.json({ 
            success: true, 
            message: `${actionMessage} ${debugInfo}`,
            debug: { system, enabled, actionMessage }
        });
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
        },
        applications: {
            enabled: false,
            title: 'Staff Application',
            channelId: '',
            reviewChannelId: '',
            reviewerRoleId: '',
            questions: []
        },
        alerts: {
            enabled: false,
            channelId: '',
            alertRoles: [],
            thresholds: {
                lowActivity: 20,
                highWarnings: 5,
                ticketSpike: 10
            }
        },
        branding: {
            botName: '',
            embedColor: '#6c63ff',
            avatarURL: '',
            footerText: ''
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
