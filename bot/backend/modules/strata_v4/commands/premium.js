const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');

module.exports = {
    data: {
        name: 'premium',
        description: 'Display tier comparison, manage subscription, upsell'
    },
    async execute(interaction, client) {
        const action = interaction.options.getString('action') || 'compare';

        const embed = new StrataEmbedBuilder()
            .setTitle('💎 STRATA PREMIUM • TIER ANALYTICS')
            .setDescription('Unlock the full potential of your server management with advanced AI, deep analytics, and professional security protocols.')
            .addFields(
                { name: '🟢 FREE', value: '• 20 Slash Commands\n• Basic Staff Tracking\n• Public Dashboard', inline: true },
                { name: '🔵 PREMIUM', value: '• **V3-V5 Automation**\n• Smart Promotion\n• Role Rewards', inline: true },
                { name: '🟣 ENTERPRISE', value: '• **V6-V8 Security**\n• AI Recommendations\n• White-label Bot', inline: true }
            )
            .addFields(
                { name: '📊 FEATURE COMPARISON', value: '```\nFEATURE       | FREE | PREM | ENTP\n--------------|------|------|-----\nStaff Limit   | 25   | 100  | ∞\nAuto-Promo    | ❌   | ✅   | ✅\nThreat Shield | ❌   | ❌   | ✅\nCustom Logo   | ❌   | ❌   | ✅\n```', inline: false }
            )
            .setImage('https://i.imgur.com/Atu9E8I.png')
            .setFooter({ text: 'Elevate your experience at strata-bot.com/premium' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Upgrade Now')
                    .setURL('https://impartial-sparkle-production-ffde.up.railway.app/premium')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setCustomId('manage_guild_subs')
                    .setLabel('Manage Subscriptions')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
