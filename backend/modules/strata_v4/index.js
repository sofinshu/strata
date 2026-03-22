const fs = require('fs');
const path = require('path');
const db = require('../../database/connection');

class StrataV4Module {
    constructor(client) {
        this.client = client;
        this.name = 'Strata V4 Professional Core';
        this.description = 'Fully functional 20 minimal slash commands with premium UX';
        this.tier = 'FREE';
        this.commands = [];

        this.init();
    }

    async init() {
        console.log('[StrataV4] Initializing V4 Core Module...');
        
        const commandsPath = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(commandsPath, file));
                    this.commands.push(command);
                    console.log(`[StrataV4] Loaded Command: /${command.data.name}`);
                } catch (e) {
                    console.error(`[StrataV4 ERROR] Failed to load command ${file}:`, e);
                }
            }
        }
    }
}

module.exports = StrataV4Module;
