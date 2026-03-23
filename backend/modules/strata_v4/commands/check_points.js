const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'check_points',
        description: 'Quick point balance check with management functionality'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guildId;

        const member = db.prepare('SELECT points FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);

        if (!member) {
            return interaction.reply({ content: '❌ Identity not found in central database.', ephemeral: true });
        }

        const embed = new StrataEmbedBuilder()
            .setTitle(`🔍 IDENTITY SCAN • ${targetUser.tag.toUpperCase()}`)
            .setDescription(`Real-time point verification complete. Select an override option if administrative adjustment is required.`)
            .addFields(
                { name: '👤 Identity', value: `${targetUser}`, inline: true },
                { name: '⚡ Points', value: `\`${member.points} XP\``, inline: true }
            )
            .setFooter({ text: 'STRATA v4.0 • ADMINISTRATIVE ACCESS' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`points_add_${targetUser.id}`)
                    .setLabel('Add Points')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`points_remove_${targetUser.id}`)
                    .setLabel('Remove Points')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`points_reset_${targetUser.id}`)
                    .setLabel('Reset')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
