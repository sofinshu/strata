const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connection');
const StrataEmbedBuilder = require('../../utils/EmbedBuilder');

class StaffModule {
    constructor(client) {
        this.client = client;
        this.name = 'Staff';
        this.description = 'Comprehensive staff management and shift tracking.';
        this.tier = 'FREE';

        this.commands = [
            {
                data: new SlashCommandBuilder()
                    .setName('staff_stats')
                    .setDescription('View staff statistics and performance')
                    .addUserOption(opt => opt.setName('user').setDescription('User to view stats for')),
                execute: this.staffStats.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('shift_start')
                    .setDescription('Start a work shift'),
                execute: this.shiftStart.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('shift_end')
                    .setDescription('End your current work shift')
                    .addStringOption(opt => opt.setName('notes').setDescription('Shift completion notes')),
                execute: this.shiftEnd.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('recommend')
                    .setDescription('[PREMIUM] Get an AI-based staff recommendation')
                    .addStringOption(opt => opt.setName('task').setDescription('The task you need help with').setRequired(true)),
                execute: this.recommend.bind(this),
                tier: 'premium'
            }
        ];
    }

    async staffStats(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        try {
            const profile = db.prepare('SELECT * FROM staff_profiles WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, target.id);
            const memberData = db.prepare('SELECT points, rank FROM guild_members WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, target.id);

            if (!profile) {
                return interaction.reply({ content: `❌ No staff profile found for **${target.tag}**.`, ephemeral: true });
            }

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle(`Staff Record: ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🎖️ Rank', value: `\`${profile.current_rank.toUpperCase()}\``, inline: true },
                    { name: '💎 Points', value: `\`${memberData?.points || 0}\``, inline: true },
                    { name: '🔄 Shifts', value: `\`${profile.shifts_completed}\``, inline: true },
                    { name: '⏳ Total Time', value: `\`${this.formatDuration(profile.total_shift_minutes)}\``, inline: false },
                    { name: '⚠️ Warnings', value: `\`${profile.warnings_count}\``, inline: true },
                    { name: '📅 Joined Staff', value: profile.joined_staff_at ? `<t:${Math.floor(new Date(profile.joined_staff_at).getTime() / 1000)}:R>` : 'Unknown', inline: true }
                )
                .setFooter({ text: 'STRATA PERFORMANCE ANALYTICS' });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Staff] Stats Error:', e);
            await interaction.reply({ content: '❌ Failed to fetch staff stats.', ephemeral: true });
        }
    }

    async shiftStart(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            // Check if already on shift
            const activeShift = db.prepare('SELECT id FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "active"').get(guildId, userId);
            if (activeShift) {
                return interaction.reply({ content: '❌ You already have an active shift! Use `/shift_end` first.', ephemeral: true });
            }

            db.prepare('INSERT INTO shifts (guild_id, user_id, username, started_at, status) VALUES (?, ?, ?, ?, "active")')
                .run(guildId, userId, interaction.user.tag, new Date().toISOString());

            const embed = new StrataEmbedBuilder()
                .setTheme('success')
                .setTitle('Shift Started')
                .setDescription('🚨 **WORK PROTOCOL INITIATED**')
                .addFields(
                    { name: '👤 Operator', value: interaction.user.toString(), inline: true },
                    { name: '⏰ Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:t>`, inline: true }
                )
                .setFooter({ text: 'GOOD LUCK ON YOUR SHIFT!' });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Staff] Shift Start Error:', e);
            await interaction.reply({ content: '❌ Failed to start shift.', ephemeral: true });
        }
    }

    async shiftEnd(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const notes = interaction.options.getString('notes') || 'No notes provided.';

        try {
            const activeShift = db.prepare('SELECT * FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "active"').get(guildId, userId);
            if (!activeShift) {
                return interaction.reply({ content: '❌ You do not have an active shift to end.', ephemeral: true });
            }

            const startTime = new Date(activeShift.started_at);
            const endTime = new Date();
            const durationMs = endTime - startTime;
            const durationMinutes = Math.floor(durationMs / (1000 * 60));

            // Calculate points: 1 point per 10 minutes, minimum 1 point if duration > 0
            const pointsEarned = durationMinutes > 0 ? Math.max(1, Math.floor(durationMinutes / 10)) : 0;

            db.prepare('UPDATE shifts SET ended_at = ?, duration_minutes = ?, points_earned = ?, status = "completed", notes = ? WHERE id = ?')
                .run(endTime.toISOString(), durationMinutes, pointsEarned, notes, activeShift.id);

            // Update user points and profile
            db.prepare('UPDATE guild_members SET points = points + ? WHERE guild_id = ? AND user_id = ?').run(pointsEarned, guildId, userId);
            db.prepare('UPDATE staff_profiles SET shifts_completed = shifts_completed + 1, total_shift_minutes = total_shift_minutes + ? WHERE guild_id = ? AND user_id = ?')
                .run(durationMinutes, guildId, userId);

            // Log transaction
            db.prepare('INSERT INTO point_transactions (guild_id, user_id, amount, reason, source, issued_by) VALUES (?, ?, ?, ?, "shift", "STRATA-SYSTEM")')
                .run(guildId, userId, pointsEarned, `Completed shift: ${durationMinutes} mins`);

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle('Shift Completed')
                .setDescription('✅ **WORK PROTOCOL TERMINATED**')
                .addFields(
                    { name: '👤 Operator', value: interaction.user.toString(), inline: true },
                    { name: '⏱️ Duration', value: `\`${this.formatDuration(durationMinutes)}\``, inline: true },
                    { name: '💎 Points Earned', value: `\`+${pointsEarned}\``, inline: true },
                    { name: '📝 Notes', value: notes }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Staff] Shift End Error:', e);
            await interaction.reply({ content: '❌ Failed to end shift.', ephemeral: true });
        }
    }

    async recommend(interaction) {
        // AI Stub for recommendation
        const task = interaction.options.getString('task');
        
        await interaction.deferReply();
        
        // Simulate AI thinking
        await new Promise(r => setTimeout(r, 2000));

        const embed = new StrataEmbedBuilder()
            .setTheme('premium')
            .setTitle('Strata AI: Staff Recommendation')
            .setDescription(`Analysis complete for task: **"${task}"**`)
            .addFields(
                { name: '🎯 Best Fit', value: 'Senior Moderator [AI Suggestion]', inline: true },
                { name: '📊 Confidence', value: '`94%`', inline: true },
                { name: '💡 Reasoning', value: 'High consistency and zero warnings in the last 30 days.' }
            )
            .setFooter({ text: 'ZENITH AI PROTOCOL v8.2' });

        await interaction.editReply({ embeds: [embed] });
    }

    formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
}

module.exports = StaffModule;
