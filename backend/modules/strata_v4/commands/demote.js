const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'demote',
        description: 'Demote staff member with required reason and double confirmation'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const newRank = interaction.options.getString('rank');
        const reason = interaction.options.getString('reason');

        if (!reason) return interaction.reply({ content: '❌ A reason is mandatory for demotion protocols.', ephemeral: true });
        if (targetUser.bot) return interaction.reply({ content: '❌ Cannot demote a bot entity.', ephemeral: true });

        // Get current rank
        const member = db.prepare('SELECT rank FROM guild_members WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, targetUser.id);
        const currentRank = member ? member.rank : 'member';

        const embed = new StrataEmbedBuilder()
            .setTheme('danger')
            .setTitle('🚨 DEMOTION PROTOCOL INITIATED')
            .setDescription(`**WARNING:** You are attempting to strip **${targetUser.tag}** of their current rank. This action will be recorded in the security logs.`)
            .addFields(
                { name: '👤 Subject', value: `${targetUser}`, inline: true },
                { name: '📉 New Rank', value: `\`${newRank.toUpperCase()}\``, inline: true },
                { name: '📝 Reason', value: `\`${reason}\``, inline: false }
            )
            .setFooter({ text: 'STRATA SECURITY • DOUBLE CONFIRMATION REQUIRED' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`demote_confirm`)
                    .setLabel('Confirm Demotion')
                    .setEmoji('⚠️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`demote_cancel`)
                    .setLabel('Cancel protocol')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({ embeds: [embed], components: [row] });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Unauthorized.', ephemeral: true });

            if (i.customId === 'demote_cancel') {
                await i.update({ content: '✅ Demotion protocol aborted.', embeds: [], components: [] });
                return collector.stop();
            }

            if (i.customId === 'demote_confirm') {
                try {
                    db.prepare('UPDATE guild_members SET rank = ? WHERE guild_id = ? AND user_id = ?').run(newRank, interaction.guildId, targetUser.id);
                    db.prepare('INSERT INTO promotion_history (guild_id, user_id, username, from_rank, to_rank, promoted_by, promoted_by_username, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
                        interaction.guildId, targetUser.id, targetUser.tag, currentRank, newRank, interaction.user.id, interaction.user.tag, 'DEMOTION: ' + reason
                    );

                    const finalEmbed = new StrataEmbedBuilder()
                        .setTheme('info')
                        .setTitle('📊 RANK ADJUSTED')
                        .setDescription(`**DE-ELEVATION COMPLETE:** **${targetUser.tag}** has been demoted to \`${newRank.toUpperCase()}\`.`)
                        .addFields(
                            { name: 'New Status', value: `\`${newRank.toUpperCase()}\``, inline: true },
                            { name: 'Authorized By', value: `${interaction.user}`, inline: true }
                        )
                        .setFooter({ text: 'STRATA NEURAL NETWORK • SECURITY LOGS UPDATED' });

                    await i.update({ embeds: [finalEmbed], components: [] });
                    collector.stop();
                } catch (error) {
                    console.error('[Demote] Error:', error);
                    await i.update({ content: '❌ System error during demotion.', embeds: [], components: [] });
                }
            }
        });
    }
};
