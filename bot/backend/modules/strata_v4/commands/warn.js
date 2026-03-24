const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'warn',
        description: 'Issue warning with severity and auto-threshold detection'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const severity = interaction.options.getString('severity') || 'minor';
        const guildId = interaction.guildId;

        if (targetUser.bot) return interaction.reply({ content: '❌ Bots are immune to disciplinary warnings.', ephemeral: true });

        try {
            // Insert warning
            const result = db.prepare('INSERT INTO warnings (guild_id, target_user_id, target_username, issuer_user_id, issuer_username, reason, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?, "active")').run(
                guildId, targetUser.id, targetUser.tag, interaction.user.id, interaction.user.tag, reason, severity
            );

            // Fetch total active warnings
            const count = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND target_user_id = ? AND status = "active"').get(guildId, targetUser.id).count;

            // Update staff profile warning count
            db.prepare('UPDATE staff_profiles SET warnings_count = warnings_count + 1 WHERE guild_id = ? AND user_id = ?').run(guildId, targetUser.id);

            const embed = new StrataEmbedBuilder()
                .setTheme('danger')
                .setTitle('⚖️ DISCIPLINARY LOG: WARNING ISSUED')
                .setDescription(`A formal warning has been recorded against **${targetUser.tag}**. Repeating violations will result in automated system escalation.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Subject', value: `${targetUser}`, inline: true },
                    { name: '🛡️ Severity', value: `\`${severity.toUpperCase()}\``, inline: true },
                    { name: '📊 Active Warnings', value: `\`${count}\``, inline: true }
                )
                .addFields(
                    { name: '📝 Reason', value: `\`${reason}\``, inline: false },
                    { name: '⚖️ Issuer', value: `${interaction.user}`, inline: true }
                )
                .setImage('https://i.imgur.com/Atu9E8I.png')
                .setFooter({ text: 'STRATA NEURAL LOG • CONDUCT RECORDED' });

            await interaction.reply({ embeds: [embed] });

            // DM the user
            const dmEmbed = new StrataEmbedBuilder()
                .setTheme('danger')
                .setTitle(`⚠️ FORMAL WARNING: ${interaction.guild.name}`)
                .setDescription(`You have received a formal disciplinary warning. Please review our server protocols to avoid further escalation.`)
                .addFields(
                    { name: 'Reason', value: `\`${reason}\`` },
                    { name: 'Severity', value: `\`${severity.toUpperCase()}\`` },
                    { name: 'Total Active', value: `\`${count}\`` }
                )
                .setFooter({ text: 'This is an automated system notification.' });

            await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

        } catch (error) {
            console.error('[Warn] Error:', error);
            await interaction.reply({ content: '❌ System error during warning issuance.', ephemeral: true });
        }
    }
};
