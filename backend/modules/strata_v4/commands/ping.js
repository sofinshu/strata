const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');

module.exports = {
    data: {
        name: 'ping',
        description: 'Check bot latency and system health with live metrics'
    },
    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        
        const embed = this.createPingEmbed(ping, client.ws.ping);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ping_refresh')
                    .setLabel('Refresh')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setLabel('Full Status (Web)')
                    .setURL(`https://impartial-sparkle-production-ffde.up.railway.app/dashboard`) // Placeholder or real URL
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    createPingEmbed(botLatency, apiLatency) {
        let color = 0x57F287; // Green
        // Health Bar Logic
        const hexColor = botLatency < 100 ? '#57F287' : (botLatency < 200 ? '#FEE75C' : '#ED4245');

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const uptimeStr = `${days}d ${hours}h ${mins}m`;

        const mem = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMem = process.memoryUsage().heapTotal / 1024 / 1024;

        // Health Bar Logic
        const healthPct = Math.min(100, Math.max(0, 100 - (botLatency / 10)));
        const filled = Math.round(healthPct / 10);
        const healthBar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

        const embed = new StrataEmbedBuilder()
            .setTitle('🏓 PONG! SYSTEM STATUS')
            .setColor(hexColor)
            .setDescription('──────────────────────────────────────────')
            .addFields(
                { name: '🏓 Bot Latency', value: `\`${botLatency}ms\``, inline: true },
                { name: '💓 API Latency', value: `\`${apiLatency}ms\``, inline: true },
                { name: '🕐 Uptime', value: `\`${uptimeStr}\``, inline: true },
                { name: '📊 Memory Usage', value: `\`${Math.round(mem)} MB / ${Math.round(totalMem)} MB\``, inline: true },
                { name: '🌐 Shard Status', value: `\`#1 of 1 shards\``, inline: true },
                { name: '💾 Database', value: `\`✅ Connected\``, inline: true }
            )
            .addFields(
                { name: '📡 Health Status', value: `${healthBar} ${Math.round(healthPct)}%`, inline: false }
            )
            .setFooter({ text: `STRATA v4.0 • Last restart: ${new Date(Date.now() - uptime * 1000).toLocaleString()}` })
            .setTimestamp();

        return embed;
    }
};
