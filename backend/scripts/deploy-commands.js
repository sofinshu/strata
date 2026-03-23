const { REST, Routes } = require('discord.js');
const registry = require('../utils/CommandRegistry');
require('dotenv').config();

const commands = registry.getGroupedCommands();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands (Grouped from 271).`);

        const client_id = process.env.CLIENT_ID;
        if (!client_id) {
            console.error('ERROR: CLIENT_ID environment variable is not set!');
            process.exit(1);
        }

        await rest.put(
            Routes.applicationCommands(client_id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
