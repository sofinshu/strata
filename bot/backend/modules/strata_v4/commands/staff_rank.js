const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'staff_rank',
        description: 'View rank hierarchy with member counts and requirements'
    },
    async execute(interaction, client) {
        const guildId = interaction.guildId;

        // Fetch all ranks and counts
        const ranks = db.prepare('SELECT rank, COUNT(*) as count FROM guild_members WHERE guild_id = ? AND is_staff = 1 GROUP BY rank').all(guildId);
        const requirements = db.prepare('SELECT * FROM promotion_requirements WHERE guild_id = ?').all(guildId);

        const embed = new StrataEmbedBuilder()
            .setTitle('📂 RANK HIERARCHY & STRUCTURE')
            .setDescription('Current operational framework for the server staff team. Ranks are listed by order of authorization.')
            .setImage('https://i.imgur.com/Atu9E8I.png');

        if (ranks.length === 0) {
            embed.setDescription('No rank data available in the Strata registry.');
        } else {
            ranks.forEach(r => {
                const req = requirements.find(req => req.rank_name.toLowerCase() === r.rank.toLowerCase());
                const points = req ? `\`${req.points_required} XP req.\`` : '`No req.`';
                embed.addFields({
                    name: `🔹 ${r.rank.toUpperCase()}`,
                    value: `Members: \`${r.count}\` • ${points}`,
                    inline: true
                });
            });
        }

        embed.setFooter({ text: 'STRATA v4.0 • HIERARCHY OVERVIEW' });

        await interaction.reply({ embeds: [embed] });
    }
};
