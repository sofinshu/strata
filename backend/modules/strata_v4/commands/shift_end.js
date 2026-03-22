const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'shift_end',
        description: 'Clock out with detailed summary and awards'
    },
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const summary = interaction.options.getString('summary') || 'No summary provided.';

        // Check for active shift
        const activeShift = db.prepare('SELECT * FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "active"').get(guildId, userId);

        if (!activeShift) {
            const errorEmbed = new StrataEmbedBuilder()
                .setTheme('danger')
                .setTitle('⚠️ SESSION NOT FOUND')
                .setDescription('**PROTOCOL ERROR:** No active shift session detected for your identity. Use `/shift_start` to initialize tracking.')
                .setFooter({ text: 'STRATA SECURITY • CLOCK-OUT REJECTED' });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Calculate duration
            const startTime = new Date(activeShift.started_at);
            const endTime = new Date();
            const durationMs = endTime - startTime;
            const durationMins = Math.max(1, Math.round(durationMs / 1000 / 60));

            // Calculate points: 10 base + 5 per 30 mins
            const earnedPoints = 10 + Math.floor(durationMins / 30) * 5;

            // Update DB
            db.prepare('UPDATE shifts SET ended_at = datetime("now"), duration_minutes = ?, points_earned = ?, status = "completed", notes = ? WHERE id = ?').run(
                durationMins, earnedPoints, activeShift.notes + ' | Summary: ' + summary, activeShift.id
            );

            // Update member points
            db.prepare('UPDATE guild_members SET points = points + ? WHERE guild_id = ? AND user_id = ?').run(earnedPoints, guildId, userId);

            // Update staff profile
            db.prepare('INSERT OR IGNORE INTO staff_profiles (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
            db.prepare('UPDATE staff_profiles SET shifts_completed = shifts_completed + 1, total_shift_minutes = total_shift_minutes + ? WHERE guild_id = ? AND user_id = ?').run(
                durationMins, guildId, userId
            );

            const successEmbed = new StrataEmbedBuilder()
                .setTheme('success')
                .setTitle('🛑 SHIFT TERMINATED')
                .setDescription(`**SESSION ARCHIVED:** Your shift data has been processed and your awards have been distributed to your neural profile.`)
                .addFields(
                    { name: '🕒 Duration', value: `\`${Math.floor(durationMins / 60)}h ${durationMins % 60}m\``, inline: true },
                    { name: '⚡ Points Earned', value: `\`+${earnedPoints} XP\``, inline: true },
                    { name: '🆔 Session ID', value: `\`#${activeShift.id}\``, inline: true }
                )
                .addFields(
                    { name: '📝 Final Summary', value: `\`${summary}\``, inline: false }
                )
                .setImage('https://i.imgur.com/Atu9E8I.png')
                .setFooter({ text: 'STRATA v4.0 • SYSTEM RECOGNITION AWARDED' });

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('[ShiftEnd] Error:', error);
            await interaction.reply({ content: '❌ System error during shift termination.', ephemeral: true });
        }
    }
};
