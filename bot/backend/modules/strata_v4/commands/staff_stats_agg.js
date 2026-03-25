const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'staff_stats',
        description: 'View aggregated server-wide staff performance statistics'
    },
    async execute(interaction, client) {
        const period = interaction.options.getString('period') || 'all';
        const guildId = interaction.guildId;

        try {
            let query = 'SELECT COUNT(DISTINCT user_id) as active_staff, SUM(duration_minutes) as total_mins, SUM(points_earned) as total_points, COUNT(*) as total_shifts FROM shifts WHERE guild_id = ? AND status = "completed"';
            const params = [guildId];

            if (period === 'today') query += ' AND date(started_at) = date("now")';
            if (period === 'week') query += ' AND date(started_at) > date("now", "-7 days")';
            if (period === 'month') query += ' AND date(started_at) > date("now", "-30 days")';

            const stats = db.prepare(query).get(...params);
            const topPerformers = db.prepare('SELECT username, SUM(points_earned) as pts FROM shifts WHERE guild_id = ? AND status = "completed" GROUP BY user_id ORDER BY pts DESC LIMIT 3').all(guildId);

            const totalHours = Math.floor((stats.total_mins || 0) / 60);

            const embed = new StrataEmbedBuilder()
                .setTitle(`🌍 SERVER ANALYTICS • ${interaction.guild.name.toUpperCase()}`)
                .setDescription(`Aggregated performance metrics for the selected window: \`${period.toUpperCase()}\``)
                .addFields(
                    { name: '📊 Total Shifts', value: `\`${stats.total_shifts || 0}\``, inline: true },
                    { name: '🕒 Total Duty Time', value: `\`${totalHours}h\``, inline: true },
                    { name: '👥 Staff Participating', value: `\`${stats.active_staff || 0}\``, inline: true }
                )
                .addFields(
                    { name: '⚡ Points Generated', value: `\`+${stats.total_points || 0} XP\``, inline: true },
                    { name: '📈 Avg Efficiency', value: `\`${stats.total_shifts ? Math.round(stats.total_mins / stats.total_shifts) : 0}m/shift\``, inline: true },
                    { name: '📅 Timeframe', value: `\`${period.toUpperCase()}\``, inline: true }
                );

            if (topPerformers.length > 0) {
                const leaderboard = topPerformers.map((p, i) => `${i + 1}. **${p.username}** (\`${p.pts} pts\`)`).join('\n');
                embed.addFields({ name: '🏆 Top Performers (Period)', value: leaderboard, inline: false });
            }

            embed.setImage('https://i.imgur.com/Atu9E8I.png')
                .setFooter({ text: 'STRATA GLOBAL ANALYTICS • DATA VERIFIED' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[StaffStatsAgg] Error:', error);
            await interaction.reply({ content: '❌ System error during global analytics retrieval.', ephemeral: true });
        }
    }
};
