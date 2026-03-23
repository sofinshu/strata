const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'dashboard',
        description: 'Quick server overview with key metrics and quick actions'
    },
    async execute(interaction, client) {
        const guildId = interaction.guildId;
        
        // Fetch stats from DB
        const staffCount = db.prepare('SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?').get(guildId).count;
        const totalPoints = db.prepare('SELECT SUM(points) as total FROM guild_members WHERE guild_id = ?').get(guildId).total || 0;
        const recentShifts = db.prepare('SELECT COUNT(*) as count FROM shift_logs WHERE guild_id = ? AND start_time > datetime("now", "-24 hours")').get(guildId).count;

        const embed = new StrataEmbedBuilder()
            .setTitle(`📊 DASHBOARD • ${interaction.guild.name.toUpperCase()}`)
            .setDescription('Real-time synchronization established. Access the web interface for deep analytics and configuration.')
            .addFields(
                { name: '👥 Staff Active', value: `\`${staffCount}\``, inline: true },
                { name: '⚡ Neural Points', value: `\`${totalPoints}\``, inline: true },
                { name: '📂 Shifts (24h)', value: `\`${recentShifts}\``, inline: true }
            )
            .addFields(
                { name: '🛡️ System Tier', value: `\`FREE v4.0\``, inline: true },
                { name: '🌐 Uptime', value: `\`99.9%\``, inline: true },
                { name: '🛰️ Status', value: `\`✅ OPERATIONAL\``, inline: true }
            )
            .setImage('https://i.imgur.com/Atu9E8I.png') // Purple Banner
            .setFooter({ text: 'STRATA PROTOCOL • SECURITY VERIFIED' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Open Web Dashboard')
                    .setURL('https://impartial-sparkle-production-ffde.up.railway.app/dashboard')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setCustomId('refresh_dashboard')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
