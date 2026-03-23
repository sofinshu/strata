const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'shift_stats',
        description: 'View personal or staff shift statistics with period filters'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const period = interaction.options.getString('period') || 'all';
        const guildId = interaction.guildId;

        try {
            let query = 'SELECT COUNT(*) as count, SUM(duration_minutes) as total_mins, SUM(points_earned) as total_points FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "completed"';
            const params = [guildId, targetUser.id];

            if (period === 'today') {
                query += ' AND date(started_at) = date("now")';
            } else if (period === 'week') {
                query += ' AND date(started_at) > date("now", "-7 days")';
            } else if (period === 'month') {
                query += ' AND date(started_at) > date("now", "-30 days")';
            }

            const stats = db.prepare(query).get(...params);

            if (!stats || stats.count === 0) {
                return interaction.reply({ content: `❌ No shift data found for **${targetUser.tag}** in the selected period (\`${period}\`).`, ephemeral: true });
            }

            const totalHours = Math.floor((stats.total_mins || 0) / 60);
            const totalMins = (stats.total_mins || 0) % 60;

            const embed = new StrataEmbedBuilder()
                .setTitle(`📈 SHIFT ANALYTICS • ${targetUser.username.toUpperCase()}`)
                .setDescription(`Displaying operational metrics for the selected window: \`${period.toUpperCase()}\``)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '📂 Total Shifts', value: `\`${stats.count}\``, inline: true },
                    { name: '🕒 Time on Duty', value: `\`${totalHours}h ${totalMins}m\``, inline: true },
                    { name: '⚡ Efficiency XP', value: `\`${stats.total_points || 0}\``, inline: true }
                )
                .addFields(
                    { name: '📊 Average Shift', value: `\`${Math.round((stats.total_mins || 0) / stats.count)} mins\``, inline: true },
                    { name: '🏆 Performance Rank', value: `\`GOLD\``, inline: true }, // Placeholder
                    { name: '📅 Period', value: `\`${period.charAt(0).toUpperCase() + period.slice(1)}\``, inline: true }
                )
                .setImage('https://i.imgur.com/Atu9E8I.png')
                .setFooter({ text: 'STRATA NEURAL ANALYTICS • ACCURACY VERIFIED' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ShiftStats] Error:', error);
            await interaction.reply({ content: '❌ System error during analytics retrieval.', ephemeral: true });
        }
    }
};
