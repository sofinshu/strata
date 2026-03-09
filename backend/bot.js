const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
    client.user.setActivity('staff management', { type: ActivityType.Watching });
});

client.on('guildCreate', (guild) => {
    console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);
});

client.on('guildDelete', (guild) => {
    console.log(`[Bot] Left guild: ${guild.name} (${guild.id})`);
});

const token = process.env.DISCORD_TOKEN;
if (token) {
    client.login(token).catch(err => {
        console.error('[Bot] Failed to login:', err.message);
    });
} else {
    console.warn('[Bot] DISCORD_TOKEN not set - bot will not connect to Discord');
}

module.exports = client;
