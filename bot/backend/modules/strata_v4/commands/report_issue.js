const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');

module.exports = {
    data: {
        name: 'report_issue',
        description: 'Submit bug reports or feature requests through modal form'
    },
    async execute(interaction, client) {
        const modal = new ModalBuilder()
            .setCustomId('report_issue_modal')
            .setTitle('Strata | Report Issue or Request');

        const typeInput = new TextInputBuilder()
            .setCustomId('issue_type')
            .setLabel('Type of Request')
            .setPlaceholder('Bug Report / Feature Request / Support')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const summaryInput = new TextInputBuilder()
            .setCustomId('issue_summary')
            .setLabel('Subject / Summary')
            .setPlaceholder('Briefly describe the issue...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const detailInput = new TextInputBuilder()
            .setCustomId('issue_details')
            .setLabel('Detailed Description')
            .setPlaceholder('Describe the bug or feature request in detail...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(typeInput);
        const secondActionRow = new ActionRowBuilder().addComponents(summaryInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(detailInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    }
};
