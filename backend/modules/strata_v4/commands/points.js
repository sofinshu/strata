const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'points',
        description: 'View own point balance, history, and earning sources'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;

        const member = db.prepare('SELECT points, reputation FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);
        const recentTx = db.prepare('SELECT amount, reason, created_at FROM point_transactions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 5').all(guildId, targetUser.id);

        if (!member) {
            return interaction.reply({ content: '❌ Target user not found in the neural registry.', ephemeral: true });
        }

        const embed = new StrataEmbedBuilder()
            .setTitle(`⚡ NEURAL BALANCE • ${targetUser.username.toUpperCase()}`)
            .setDescription(`Accessing point ledger for identity \`${targetUser.id}\`.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🔥 Current Points', value: `\`${member.points} XP\``, inline: true },
                { name: '⭐ Reputation', value: `\`${member.reputation || 0}\``, inline: true }
            );

        if (recentTx.length > 0) {
            const history = recentTx.map(t => `• \`${t.amount > 0 ? '+' : ''}${t.amount}\` | ${t.reason} (<t:${Math.floor(new Date(t.created_at).getTime() / 1000)}:R>)`).join('\n');
            embed.addFields({ name: '📜 Recent Ledger Activity', value: history, inline: false });
        } else {
            embed.addFields({ name: '📜 Recent Ledger Activity', value: 'No recent transactions found.', inline: false });
        }

        embed.setImage('https://i.imgur.com/Atu9E8I.png')
            .setFooter({ text: 'STRATA v4.0 • TRANSACTION DATA SECURED' });

        await interaction.reply({ embeds: [embed] });
    }
};
