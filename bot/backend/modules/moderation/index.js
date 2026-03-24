const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connection');
const StrataEmbedBuilder = require('../../utils/EmbedBuilder');

class ModerationModule {
    constructor(client) {
        this.client = client;
        this.name = 'Moderation';
        this.description = 'Advanced server moderation and protection systems.';
        this.tier = 'FREE'; // Base commands are free, advanced ones will be tiered in registry

        this.commands = [
            {
                data: new SlashCommandBuilder()
                    .setName('ban')
                    .setDescription('Ban a user from the server')
                    .addUserOption(opt => opt.setName('target').setDescription('The user to ban').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban'))
                    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
                execute: this.ban.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('kick')
                    .setDescription('Kick a user from the server')
                    .addUserOption(opt => opt.setName('target').setDescription('The user to kick').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick'))
                    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
                execute: this.kick.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('warn')
                    .setDescription('Issue a warning to a user')
                    .addUserOption(opt => opt.setName('target').setDescription('The user to warn').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
                    .addStringOption(opt => opt.setName('severity').setDescription('Warning severity').addChoices(
                        { name: 'Low', value: 'low' },
                        { name: 'Medium', value: 'medium' },
                        { name: 'High', value: 'high' }
                    )),
                execute: this.warn.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('timeout')
                    .setDescription('Put a user in timeout')
                    .addUserOption(opt => opt.setName('target').setDescription('The user to timeout').setRequired(true))
                    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout'))
                    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
                execute: this.timeout.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('purge')
                    .setDescription('Delete a specified number of messages')
                    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
                    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
                execute: this.purge.bind(this)
            }
        ];
    }

    async logAction(interaction, type, target, reason) {
        try {
            db.prepare(`
                INSERT INTO moderation_actions (guild_id, action_type, target_user_id, target_username, moderator_user_id, moderator_username, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                interaction.guild.id,
                type,
                target.id,
                target.tag || target.username,
                interaction.user.id,
                interaction.user.tag,
                reason || 'No reason provided'
            );
        } catch (e) {
            console.error('[Moderation] Log Error:', e);
        }
    }

    async ban(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ I cannot ban this user. They may have a higher role than me.', ephemeral: true });
        }

        await interaction.guild.members.ban(target, { reason });
        await this.logAction(interaction, 'ban', target, reason);

        const embed = new StrataEmbedBuilder()
            .setTheme('danger')
            .setTitle('User Banned')
            .setDescription(`**${target.tag}** has been banned from the server.`)
            .addFields(
                { name: '👤 Target', value: target.toString(), inline: true },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true },
                { name: '📝 Reason', value: reason }
            );

        await interaction.reply({ embeds: [embed] });
    }

    async kick(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });

        await member.kick(reason);
        await this.logAction(interaction, 'kick', target, reason);

        const embed = new StrataEmbedBuilder()
            .setTheme('warning')
            .setTitle('User Kicked')
            .setDescription(`**${target.tag}** has been kicked from the server.`)
            .addFields(
                { name: '👤 Target', value: target.toString(), inline: true },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true },
                { name: '📝 Reason', value: reason }
            );

        await interaction.reply({ embeds: [embed] });
    }

    async warn(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const severity = interaction.options.getString('severity') || 'low';

        try {
            db.prepare(`
                INSERT INTO warnings (guild_id, target_user_id, target_username, issuer_user_id, issuer_username, reason, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                interaction.guild.id,
                target.id,
                target.tag,
                interaction.user.id,
                interaction.user.tag,
                reason,
                severity
            );

            await this.logAction(interaction, 'warn', target, reason);

            const embed = new StrataEmbedBuilder()
                .setTheme('warning')
                .setTitle('Warning Issued')
                .setDescription(`**${target.tag}** has received a formal warning.`)
                .addFields(
                    { name: '👤 Target', value: target.toString(), inline: true },
                    { name: '⚠️ Severity', value: severity.toUpperCase(), inline: true },
                    { name: '📝 Reason', value: reason }
                );

            await interaction.reply({ embeds: [embed] });

            // Try to DM the user
            const dmEmbed = new EmbedBuilder()
                .setTitle(`Warning from ${interaction.guild.name}`)
                .setDescription(`You have been warned for: **${reason}**`)
                .setColor(0xffa500)
                .setFooter({ text: 'Please follow the server rules.' });
            
            await target.send({ embeds: [dmEmbed] }).catch(() => null);

        } catch (e) {
            console.error('[Moderation] Warn Error:', e);
            await interaction.reply({ content: '❌ Failed to issue warning.', ephemeral: true });
        }
    }

    async timeout(interaction) {
        const target = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        
        try {
            await member.timeout(duration * 60 * 1000, reason);
            await this.logAction(interaction, 'timeout', target, reason);

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle('User Timed Out')
                .setDescription(`**${target.tag}** has been placed in timeout.`)
                .addFields(
                    { name: '👤 Target', value: target.toString(), inline: true },
                    { name: '⏳ Duration', value: `${duration} minutes`, inline: true },
                    { name: '📝 Reason', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Moderation] Timeout Error:', e);
            await interaction.reply({ content: '❌ Failed to timeout user.', ephemeral: true });
        }
    }

    async purge(interaction) {
        const amount = interaction.options.getInteger('amount');

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            const embed = new StrataEmbedBuilder()
                .setTheme('success')
                .setTitle('Messages Purged')
                .setDescription(`Successfully deleted **${deleted.size}** messages from this channel.`)
                .setFooter({ text: 'Note: Messages older than 14 days cannot be bulk deleted.' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            await this.logAction(interaction, 'purge', { id: interaction.channel.id, tag: interaction.channel.name }, `Deleted ${deleted.size} messages`);
        } catch (e) {
            console.error('[Moderation] Purge Error:', e);
            await interaction.reply({ content: '❌ Failed to purge messages.', ephemeral: true });
        }
    }
}

module.exports = ModerationModule;
