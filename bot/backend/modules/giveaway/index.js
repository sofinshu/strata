const { SlashCommandBuilder } = require('discord.js');
const StrataEmbedBuilder = require('../../utils/EmbedBuilder');
const db = require('../../database/connection');

class GiveawayModule {
    constructor(client) {
        this.client = client;
        this.name = 'giveaway';
        this.tier = 'premium'; // Require premium subscription
        
        // Define Slash Commands for this module
        this.commands = [
            {
                data: new SlashCommandBuilder()
                    .setName('giveaway')
                    .setDescription('Create a new native giveaway (Premium)')
                    .addStringOption(option => 
                        option.setName('prize')
                        .setDescription('The prize to give away')
                        .setRequired(true))
                    .addIntegerOption(option => 
                        option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)),
                tier: 'premium',
                execute: async (interaction) => {
                    const prize = interaction.options.getString('prize');
                    const winnersCount = interaction.options.getInteger('winners');

                    const embed = new StrataEmbedBuilder()
                        .setTheme('success')
                        .setGuildBranding(interaction.guild)
                        .setTitle('🎉 GIVEAWAY TIME')
                        .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnersCount}\n\nClick the button below to enter!`)
                        .addFields(
                            { name: 'Hosted By', value: interaction.user.toString() }
                        );

                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ga_enter')
                            .setLabel('Enter Giveaway')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🎊')
                    );

                    await interaction.reply({ embeds: [embed], components: [row] });
                }
            }
        ];

        // Define Button Interactions for this module
        this.buttons = [
            {
                id: 'ga_enter',
                tier: 'free', // Interaction itself is free, the ga command was premium
                execute: async (interaction) => {
                    // Logic to store entry in DB
                    // Simulating DB write
                    const embed = new StrataEmbedBuilder()
                        .setTheme('info')
                        .setTitle('Entry Confirmed')
                        .setDescription(`You have successfully entered the giveaway!`);
                        
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        ];

        // Initialize Module Table in Database
        this.initDatabase();
    }

    initDatabase() {
        try {
            db.prepare(`
                CREATE TABLE IF NOT EXISTS system_giveaways (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    prize TEXT NOT NULL,
                    winners INTEGER,
                    hosted_by TEXT,
                    entries TEXT DEFAULT '[]'
                )
            `).run();
            console.log('[Module: Giveaway] Database table ensured.');
        } catch (e) {
            console.error('[Module: Giveaway] Database Init Error:', e);
        }
    }

    init() {
        console.log('[Module: Giveaway] System initialized and ready.');
    }
}

module.exports = GiveawayModule;
