const { EmbedBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'staff_profile',
        description: 'View comprehensive staff member profile with all stats'
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guildId;

        // Fetch data
        const member = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);
        const profile = db.prepare('SELECT * FROM staff_profiles WHERE guild_id = ? AND user_id = ?').get(guildId, targetUser.id);
        const latestShifts = db.prepare('SELECT * FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "completed" ORDER BY started_at DESC LIMIT 3').all(guildId, targetUser.id);

        if (!member || !member.is_staff) {
            return interaction.reply({ content: `❌ **${targetUser.tag}** is not registered as a staff member in the Strata registry.`, ephemeral: true });
        }

        const totalHours = Math.floor((profile?.total_shift_minutes || 0) / 60);
        const totalMins = (profile?.total_shift_minutes || 0) % 60;

        const embed = new StrataEmbedBuilder()
            .setTitle(`👤 STAFF PROFILE • ${targetUser.username.toUpperCase()}`)
            .setDescription(`Accessing neural profile for identity \`${targetUser.id}\`.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🎖️ Current Rank', value: `\`${member.rank.toUpperCase()}\``, inline: true },
                { name: '⚡ Evolution Points', value: `\`${member.points} XP\``, inline: true },
                { name: '🏆 REP Score', value: `\`${member.reputation || 0}\``, inline: true }
            )
            .addFields(
                { name: '📊 Shift Capacity', value: `\`${profile?.shifts_completed || 0} Records\``, inline: true },
                { name: '⏳ Duty Time', value: `\`${totalHours}h ${totalMins}m\``, inline: true },
                { name: '⚠️ Incidents', value: `\`${profile?.warnings_count || 0} Warnings\``, inline: true }
            )
            .addFields(
                { name: '📅 Service Since', value: `<t:${Math.floor(new Date(member.created_at).getTime() / 1000)}:R>`, inline: true },
                { name: '📡 Last Active', value: member.last_active_at ? `<t:${Math.floor(new Date(member.last_active_at).getTime() / 1000)}:R>` : '`N/A`', inline: true }
            );

        if (latestShifts.length > 0) {
            const shiftList = latestShifts.map(s => `• <t:${Math.floor(new Date(s.started_at).getTime() / 1000)}:d> (\`${s.duration_minutes}m\`)`).join('\n');
            embed.addFields({ name: '📂 Recent Activity Logs', value: shiftList, inline: false });
        }

        embed.setImage('https://i.imgur.com/Atu9E8I.png')
            .setFooter({ text: 'STRATA NEURAL PROFILE • DATA SYNCHRONIZED' });

        await interaction.reply({ embeds: [embed] });
    }
};
