const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const CommandRegistry = require('../../../utils/CommandRegistry');

module.exports = {
    data: {
        name: 'help',
        description: 'Display interactive command browser organized by categories'
    },
    async execute(interaction, client) {
        const categories = [
            { id: 'cat1', name: 'Management (V1-V2 FREE)', icon: '📊' },
            { id: 'cat2', name: 'Auto Systems (V3-V5 PREMIUM)', icon: '⚙️' },
            { id: 'cat3', name: 'Security (V6-V8 ENTERPRISE)', icon: '🛡️' }
        ];

        const embed = new StrataEmbedBuilder()
            .setTitle('📚 STRATA COMMAND DIRECTORY')
            .setDescription('Welcome to the centralized command browser. Select a category below to view all available features, tiers, and usage protocols.')
            .addFields(
                { name: '📊 Management', value: `\`12 Commands\``, inline: true },
                { name: '⚙️ Auto Systems', value: `\`32 Commands\``, inline: true },
                { name: '🛡️ Security', value: `\`-- Locked --\``, inline: true }
            )
            .setImage('https://i.imgur.com/Atu9E8I.png')
            .setFooter({ text: 'Tip: Use the dropdown to browse specific categories' });

        const select = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a Command Category')
            .addOptions(
                categories.map(cat => ({
                    label: cat.name,
                    value: cat.id,
                    emoji: cat.icon
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
