const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'staff_list',
        description: 'View paginated staff directory with filters and search'
    },
    async execute(interaction, client) {
        const filterRank = interaction.options.getString('rank');
        const filterStatus = interaction.options.getString('status') || 'all';
        const guildId = interaction.guildId;

        // Fetch staff
        let query = 'SELECT * FROM guild_members WHERE guild_id = ? AND is_staff = 1';
        const params = [guildId];

        if (filterRank) {
            query += ' AND rank = ?';
            params.push(filterRank);
        }

        const staff = db.prepare(query).all(...params);

        if (staff.length === 0) {
            return interaction.reply({ content: '❌ No staff members found matching the current filters.', ephemeral: true });
        }

        // Sorting: by points descending
        staff.sort((a, b) => b.points - a.points);

        const itemsPerPage = 8;
        let currentPage = 0;
        const totalPages = Math.ceil(staff.length / itemsPerPage);

        const createEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, staff.length);
            const currentStaff = staff.slice(start, end);

            const embed = new StrataEmbedBuilder()
                .setTitle(`👥 STAFF DIRECTORY • PAGE ${page + 1}/${totalPages}`)
                .setDescription(`Displaying all authorized personnel for **${interaction.guild.name}**.`)
                .setFooter({ text: `Total Staff: ${staff.length} • Use buttons to navigate` });

            currentStaff.forEach((m, idx) => {
                const statusEmoji = '⚪'; // We can't easily check real-time status here without fetching all members
                embed.addFields({
                    name: `${start + idx + 1}. ${m.username}`,
                    value: `\`Rank: ${m.rank.toUpperCase()}\` • \`${m.points} XP\``,
                    inline: true
                });
            });

            return embed;
        };

        const createRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('staff_list_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('staff_list_next')
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
            time: 120000
        });

        collector.on('collect', async i => {
            if (i.customId === 'staff_list_prev') currentPage--;
            if (i.customId === 'staff_list_next') currentPage++;

            await i.update({
                embeds: [createEmbed(currentPage)],
                components: [createRow(currentPage)]
            });
        });
    }
};
