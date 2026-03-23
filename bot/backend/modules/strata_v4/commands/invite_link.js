const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');

module.exports = {
    data: {
        name: 'invite_link',
        description: 'Get bot invite link and support server resources'
    },
    async execute(interaction, client) {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        const supportServer = 'https://discord.gg/strata'; // Placeholder
        const documentation = 'https://docs.strata-bot.com'; // Placeholder

        const embed = new StrataEmbedBuilder()
            .setTitle('🔗 LINK ESTABLISHED: STRATA CORE')
            .setDescription('Access the main bot gateway or join our neural network for support and updates.')
            .addFields(
                { name: '🤖 Bot Gateway', value: '[Invite Strata to Server](' + inviteLink + ')', inline: false },
                { name: '🌐 Neural Network', value: '[Join Support Hub](' + supportServer + ')', inline: true },
                { name: '📚 Data Archive', value: '[Read Documentation](' + documentation + ')', inline: true }
            )
            .setImage('https://i.imgur.com/Atu9E8I.png')
            .setFooter({ text: 'STRATA v4.0 • CONNECTION VERIFIED' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Add to Discord')
                    .setURL(inviteLink)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setURL(supportServer)
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
