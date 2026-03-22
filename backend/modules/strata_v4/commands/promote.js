const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'promote',
        description: 'Promote staff member with confirmation flow and auto role update'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const newRank = interaction.options.getString('rank');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        if (targetUser.bot) return interaction.reply({ content: '❌ Cannot promote a bot entity.', ephemeral: true });

        // Get current rank
        const member = db.prepare('SELECT rank FROM guild_members WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, targetUser.id);
        const currentRank = member ? member.rank : 'member';

        if (currentRank.toLowerCase() === newRank.toLowerCase()) {
            return interaction.reply({ content: `❌ **${targetUser.tag}** already holds the rank of \`${newRank}\`.`, ephemeral: true });
        }

        const embed = new StrataEmbedBuilder()
            .setTheme('warning')
            .setTitle('⚠️ PROMOTION AUTHORIZATION REQUIRED')
            .setDescription(`You are attempting to elevate **${targetUser.tag}** to a new operational rank. Please verify the credentials and rank hierarchy before confirming.`)
            .addFields(
                { name: '👤 Operator', value: `${targetUser}`, inline: true },
                { name: '📉 Current Rank', value: `\`${currentRank.toUpperCase()}\``, inline: true },
                { name: '📈 Target Rank', value: `\`${newRank.toUpperCase()}\``, inline: true }
            )
            .addFields(
                { name: '📝 Reason', value: `\`${reason}\``, inline: false }
            )
            .setFooter({ text: 'STRATA SECURITY • CONFIRMATION PENDING' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`promote_confirm_${targetUser.id}_${newRank.replace(/\s+/g, '_')}`)
                    .setLabel('Confirm Promotion')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`promote_cancel`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({ embeds: [embed], components: [row] });

        // Simple collector for immediate confirmation
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Unauthorized access. Only the initiating operator can confirm.', ephemeral: true });
            }

            if (i.customId === 'promote_cancel') {
                await i.update({ content: '✅ Promotion protocol cancelled.', embeds: [], components: [] });
                return collector.stop();
            }

            if (i.customId.startsWith('promote_confirm_')) {
                try {
                    // Update DB
                    db.prepare('UPDATE guild_members SET rank = ?, is_staff = 1 WHERE guild_id = ? AND user_id = ?').run(newRank, interaction.guildId, targetUser.id);
                    db.prepare('INSERT INTO promotion_history (guild_id, user_id, username, from_rank, to_rank, promoted_by, promoted_by_username, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
                        interaction.guildId, targetUser.id, targetUser.tag, currentRank, newRank, interaction.user.id, interaction.user.tag, reason
                    );

                    const finalEmbed = new StrataEmbedBuilder()
                        .setTheme('success')
                        .setTitle('✨ PROMOTION SUCCESSFUL')
                        .setDescription(`**RANK ELEVATED:** **${targetUser.tag}** has been promoted to \`${newRank.toUpperCase()}\`.`)
                        .addFields(
                            { name: 'New Rank', value: `\`${newRank.toUpperCase()}\``, inline: true },
                            { name: 'Authorized By', value: `${interaction.user}`, inline: true }
                        )
                        .setImage('https://i.imgur.com/Atu9E8I.png')
                        .setFooter({ text: 'STRATA NEURAL NETWORK • HIERARCHY UPDATED' });

                    await i.update({ embeds: [finalEmbed], components: [] });
                    collector.stop();
                } catch (error) {
                    console.error('[Promote] Error:', error);
                    await i.update({ content: '❌ System error during promotion finalization.', embeds: [], components: [] });
                }
            }
        });
    }
};
