const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const StrataEmbedBuilder = require('../../../utils/EmbedBuilder');
const db = require('../../../database/connection');

module.exports = {
    data: {
        name: 'shift_start',
        description: 'Clock into shift with role tagging and progress tracking'
    },
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const role = interaction.options.getString('role') || 'General Staff';
        const notes = interaction.options.getString('notes') || 'N/A';

        // Check for existing active shift
        const activeShift = db.prepare('SELECT id FROM shifts WHERE guild_id = ? AND user_id = ? AND status = "active"').get(guildId, userId);

        if (activeShift) {
            const errorEmbed = new StrataEmbedBuilder()
                .setTheme('danger')
                .setTitle('⚠️ SHIFT COLLISION DETECTED')
                .setDescription('**PROTOCOL BREACH:** You are already clocked into an active shift session. You must terminate your current session before initializing a new one.')
                .addFields({ name: 'Active Session ID', value: `\`#${activeShift.id}\``, inline: true })
                .setFooter({ text: 'STRATA SECURITY • DOUBLE CLOCK-IN PREVENTED' });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Initialize new shift
        try {
            const result = db.prepare('INSERT INTO shifts (guild_id, user_id, username, started_at, status, notes) VALUES (?, ?, ?, datetime("now"), "active", ?)').run(
                guildId, userId, interaction.user.tag, role + (notes !== 'N/A' ? ': ' + notes : '')
            );

            const shiftId = result.lastInsertRowid;

            const successEmbed = new StrataEmbedBuilder()
                .setTheme('success')
                .setTitle('✅ SHIFT INITIALIZED')
                .setDescription(`**CONNECTION ESTABLISHED:** Your shift session has been logged and is now being tracked by the Strata Neural Network.`)
                .addFields(
                    { name: '👤 Operator', value: `<@${userId}>`, inline: true },
                    { name: '📍 Sector/Role', value: `\`${role}\``, inline: true },
                    { name: '🆔 Session ID', value: `\`#${shiftId}\``, inline: true }
                )
                .addFields(
                    { name: '🕒 Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '📝 Notes', value: `\`${notes}\``, inline: false }
                )
                .setImage('https://i.imgur.com/Atu9E8I.png')
                .setFooter({ text: 'STRATA v4.0 • PROGRESS TRACKING ACTIVE' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shift_end_${shiftId}`)
                        .setLabel('End Shift')
                        .setEmoji('🛑')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel('View Dashboard')
                        .setURL('https://impartial-sparkle-production-ffde.up.railway.app/dashboard')
                        .setStyle(ButtonStyle.Link)
                );

            await interaction.reply({ embeds: [successEmbed], components: [row] });
        } catch (error) {
            console.error('[ShiftStart] Error:', error);
            await interaction.reply({ content: '❌ System error during shift initialization.', ephemeral: true });
        }
    }
};
