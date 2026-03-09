const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const Database = require('better-sqlite3');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Initialize database
const dbPath = process.env.DB_PATH || './database/strata.db';
let db;
try {
    db = new Database(dbPath);
    console.log('[Bot] Database connected');
} catch (err) {
    console.error('[Bot] Database connection failed:', err.message);
}

client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
    client.user.setActivity('staff management', { type: ActivityType.Watching });

    // Sync existing guilds to database on startup
    if (db) {
        const stmt = db.prepare('INSERT OR IGNORE INTO guilds (id, name, tier) VALUES (?, ?, ?)');
        for (const guild of client.guilds.cache.values()) {
            stmt.run(guild.id, guild.name, 'free');
        }
        console.log('[Bot] Synced guilds to database');
    }
});

client.on('guildCreate', (guild) => {
    console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);

    // Save to database when bot joins a server
    if (db) {
        try {
            db.prepare('INSERT OR REPLACE INTO guilds (id, name, tier) VALUES (?, ?, ?)').run(guild.id, guild.name, 'free');
            console.log(`[Bot] Added guild ${guild.name} to database`);
        } catch (err) {
            console.error('[Bot] Failed to save guild to database:', err.message);
        }
    }
});

client.on('guildDelete', (guild) => {
    console.log(`[Bot] Left guild: ${guild.name} (${guild.id})`);

    // Optionally remove from database when bot leaves
    // (commented out to preserve data if bot is re-added later)
    // if (db) {
    //     db.prepare('DELETE FROM guilds WHERE id = ?').run(guild.id);
    // }
});

const token = process.env.DISCORD_TOKEN;
if (token) {
    client.login(token).catch(err => {
        console.error('[Bot] Failed to login:', err.message);
    });
} else {
    console.warn('[Bot] DISCORD_TOKEN not set - bot will not connect to Discord');
}

// Export client for use in other modules
module.exports = { client };
