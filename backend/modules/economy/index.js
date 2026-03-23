const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connection');
const StrataEmbedBuilder = require('../../utils/EmbedBuilder');

class EconomyModule {
    constructor(client) {
        this.client = client;
        this.name = 'Economy';
        this.description = 'Server economy system with points, leaderboards, and rewards.';
        this.tier = 'FREE';

        this.commands = [
            {
                data: new SlashCommandBuilder()
                    .setName('balance')
                    .setDescription('Check your current point balance')
                    .addUserOption(opt => opt.setName('user').setDescription('User to check balance for')),
                execute: this.balance.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('leaderboard')
                    .setDescription('View the server points leaderboard'),
                execute: this.leaderboard.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('pay')
                    .setDescription('Transfer points to another user')
                    .addUserOption(opt => opt.setName('target').setDescription('The user to pay').setRequired(true))
                    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to transfer').setRequired(true).setMinValue(1)),
                execute: this.pay.bind(this)
            },
            {
                data: new SlashCommandBuilder()
                    .setName('rewards')
                    .setDescription('View available role rewards'),
                execute: this.rewards.bind(this)
            }
        ];
    }

    async balance(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        try {
            const member = db.prepare('SELECT points FROM guild_members WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, target.id);
            const points = member ? member.points : 0;

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle('Point Balance')
                .addFields(
                    { name: '👤 User', value: target.toString(), inline: true },
                    { name: '💎 Points', value: `\`${points.toLocaleString()}\` credits`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Economy] Balance Error:', e);
            await interaction.reply({ content: '❌ Failed to fetch balance.', ephemeral: true });
        }
    }

    async leaderboard(interaction) {
        try {
            const topMembers = db.prepare(`
                SELECT user_id, username, points 
                FROM guild_members 
                WHERE guild_id = ? 
                ORDER BY points DESC 
                LIMIT 10
            `).all(interaction.guild.id);

            if (topMembers.length === 0) {
                return interaction.reply({ content: '❌ No points data found for this server.', ephemeral: true });
            }

            const description = topMembers.map((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
                return `${medal} **${m.username || 'Unknown'}** • \`${m.points.toLocaleString()}\` points`;
            }).join('\n');

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle(`Leaderboard: ${interaction.guild.name}`)
                .setDescription(description)
                .setFooter({ text: 'TOP 10 CONTRIBUTORS' });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Economy] Leaderboard Error:', e);
            await interaction.reply({ content: '❌ Failed to fetch leaderboard.', ephemeral: true });
        }
    }

    async pay(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot pay yourself!', ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ content: '❌ Bots do not participate in the economy.', ephemeral: true });
        }

        try {
            const sender = db.prepare('SELECT points FROM guild_members WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, interaction.user.id);
            if (!sender || sender.points < amount) {
                return interaction.reply({ content: '❌ Insufficient balance.', ephemeral: true });
            }

            // Perform transaction
            const updateSender = db.prepare('UPDATE guild_members SET points = points - ? WHERE guild_id = ? AND user_id = ?');
            const updateReceiver = db.prepare('INSERT INTO guild_members (guild_id, user_id, username, points) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET points = points + ?');
            
            const runTx = db.transaction(() => {
                updateSender.run(amount, interaction.guild.id, interaction.user.id);
                updateReceiver.run(interaction.guild.id, target.id, target.username, amount, amount);
                
                db.prepare('INSERT INTO point_transactions (guild_id, user_id, amount, reason, source, issued_by) VALUES (?, ?, ?, ?, "command", ?)')
                    .run(interaction.guild.id, interaction.user.id, -amount, `Paid to ${target.tag}`, interaction.user.id);
                
                db.prepare('INSERT INTO point_transactions (guild_id, user_id, amount, reason, source, issued_by) VALUES (?, ?, ?, ?, "command", ?)')
                    .run(interaction.guild.id, target.id, amount, `Received from ${interaction.user.tag}`, interaction.user.id);
            });

            runTx();

            const embed = new StrataEmbedBuilder()
                .setTheme('success')
                .setTitle('Transaction Successful')
                .setDescription(`Successfully sent **${amount}** points to ${target.toString()}.`)
                .addFields(
                    { name: '📉 From', value: interaction.user.toString(), inline: true },
                    { name: '📈 To', value: target.toString(), inline: true }
                );

            await interaction.reply({ embeds: [embed] });

        } catch (e) {
            console.error('[Economy] Pay Error:', e);
            await interaction.reply({ content: '❌ Failed to process payment.', ephemeral: true });
        }
    }

    async rewards(interaction) {
        try {
            const rewards = db.prepare('SELECT * FROM role_rewards WHERE guild_id = ? ORDER BY required_points ASC').all(interaction.guild.id);

            if (rewards.length === 0) {
                return interaction.reply({ content: '❌ No role rewards configured for this server.', ephemeral: true });
            }

            const description = rewards.map(r => `• <@&${r.role_id}> — \`${r.required_points.toLocaleString()}\` points`).join('\n');

            const embed = new StrataEmbedBuilder()
                .setTheme('info')
                .setTitle('Available Rewards')
                .setDescription(description)
                .setFooter({ text: 'REACH THE POINT REQUIREMENT TO AUTO-UNLOCK' });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('[Economy] Rewards Error:', e);
            await interaction.reply({ content: '❌ Failed to fetch rewards.', ephemeral: true });
        }
    }
}

module.exports = EconomyModule;
