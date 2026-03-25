const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'clear_warnings',
        description: 'Clear all or specific warnings with confirmation'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const warningId = interaction.options.getString('warning_id');
        const guildId = interaction.guildId;

        const embed = new StrataEmbedBuilder()
            .setTheme('warning')
            .setTitle('⚠️ CLEARANCE AUTHORIZATION')
            .setDescription(`You are about to expunge disciplinary records for **${targetUser.tag}**. This action is permanent and will be logged.`)
            .addFields(
                { name: 'Subject', value: `${targetUser}`, inline: true },
                { name: 'Target', value: warningId ? `\`Incident #${warningId}\`` : '`ALL Records`', inline: true }
            )
            .setFooter({ text: 'STRATA SECURITY • CONFIRMATION REQUIRED' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('clear_confirm')
                    .setLabel('Confirm Clearance')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('clear_cancel')
                    .setLabel('Abort')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'clear_cancel') {
                await i.update({ content: '✅ Clearance protocol aborted.', embeds: [], components: [] });
                return collector.stop();
            }

            if (i.customId === 'clear_confirm') {
                try {
                    let deletedCount = 0;
                    if (warningId) {
                        const result = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND target_user_id = ? AND id = ?').run(guildId, targetUser.id, warningId);
                        deletedCount = result.changes;
                    } else {
                        const result = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND target_user_id = ?').run(guildId, targetUser.id);
                        deletedCount = result.changes;
                    }

                    // Update staff profile count
                    db.prepare('UPDATE staff_profiles SET warnings_count = (SELECT COUNT(*) FROM warnings WHERE guild_id = ? AND target_user_id = ?) WHERE guild_id = ? AND user_id = ?').run(
                        guildId, targetUser.id, guildId, targetUser.id
                    );

                    const finalEmbed = new StrataEmbedBuilder()
                        .setTheme('success')
                        .setTitle('✨ RECORDS EXPUNGED')
                        .setDescription(`**CLEARANCE COMPLETE:** \`${deletedCount}\` disciplinary incident(s) have been removed from the registry for **${targetUser.tag}**.`)
                        .addFields(
                            { name: 'Authorized By', value: `${interaction.user}`, inline: true },
                            { name: 'Status', value: '`LOGGED & SYNCED`', inline: true }
                        )
                        .setFooter({ text: 'STRATA NEURAL NETWORK • REGISTRY UPDATED' });

                    await i.update({ embeds: [finalEmbed], components: [] });
                    collector.stop();
                } catch (error) {
                    console.error('[ClearWarnings] Error:', error);
                    await i.update({ content: '❌ System error during clearance.', embeds: [], components: [] });
                }
            }
        });
    }
};
