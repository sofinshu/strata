const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'warnings',
        description: 'View warning history with filtering and management options'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const statusFilter = interaction.options.getString('status') || 'all';
        const guildId = interaction.guildId;

        let query = 'SELECT * FROM warnings WHERE guild_id = ? AND target_user_id = ?';
        const params = [guildId, targetUser.id];

        if (statusFilter !== 'all') {
            query += ' AND status = ?';
            params.push(statusFilter);
        }

        const warnings = db.prepare(query).all(...params);

        if (warnings.length === 0) {
            return interaction.reply({ content: `✅ No warning records found for **${targetUser.tag}** matching current filters.`, ephemeral: true });
        }

        const itemsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(warnings.length / itemsPerPage);

        const createEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, warnings.length);
            const currentWarnings = warnings.slice(start, end);

            const embed = new StrataEmbedBuilder()
                .setTitle(`⚖️ WARNING HISTORY: ${targetUser.username.toUpperCase()}`)
                .setDescription(`Displaying records ${start + 1}-${end} of ${warnings.length} total.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Page ${page + 1}/${totalPages} • STRATA SECURITY LOG` });

            currentWarnings.forEach(w => {
                embed.addFields({
                    name: `Incident #${w.id} | ${w.severity.toUpperCase()}`,
                    value: `**Reason:** \`${w.reason}\`\n**Date:** <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:d>\n**Status:** \`${w.status.toUpperCase()}\``,
                    inline: false
                });
            });

            return embed;
        };

        const createRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('warnings_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('warnings_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const response = await interaction.reply({ 
            embeds: [createEmbed(currentPage)], 
            components: [createRow(currentPage)],
            ephemeral: true 
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'warnings_prev') currentPage--;
            if (i.customId === 'warnings_next') currentPage++;

            await i.update({
                embeds: [createEmbed(currentPage)],
                components: [createRow(currentPage)]
            });
        });
    }
};
