const fs = require('fs');
const path = require('path');

class ModuleManager {
    constructor(client, interactionHandler) {
        this.client = client;
        this.interactionHandler = interactionHandler;
        this.modules = new Map();
        this.modulesPath = path.join(__dirname);
        this.commandList = [];
        this.loadCommandList();
    }

    loadCommandList() {
        try {
            const listPath = path.join(__dirname, '../data/extracted_commands.json');
            if (fs.existsSync(listPath)) {
                this.commandList = JSON.parse(fs.readFileSync(listPath, 'utf8'));
                console.log(`[ModuleManager] Loaded ${this.commandList.length} commands from registry.`);
            }
        } catch (error) {
            console.error('[ModuleManager] Error loading command list:', error);
        }
    }

    getCommandTier(commandName) {
        const cmd = this.commandList.find(c => c.name === commandName);
        return cmd ? cmd.tier : 'free';
    }

    async loadModules() {
        console.log('[ModuleManager] Loading modules...');
        
        // Ensure modules directory exists
        if (!fs.existsSync(this.modulesPath)) {
            fs.mkdirSync(this.modulesPath, { recursive: true });
        }

        const dirs = fs.readdirSync(this.modulesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const dir of dirs) {
            try {
                const moduleIndexPath = path.join(this.modulesPath, dir, 'index.js');
                if (fs.existsSync(moduleIndexPath)) {
                    const SystemModule = require(moduleIndexPath);
                    const systemInstance = new SystemModule(this.client);
                    
                    // Register commands and events
                    if (systemInstance.commands) {
                        for (const command of systemInstance.commands) {
                            // Automatically inject tier from command registry if not specified
                            if (!command.tier) {
                                command.tier = this.getCommandTier(command.data.name);
                            }
                            this.interactionHandler.registerCommand(command);
                        }
                    }

                    if (systemInstance.buttons) {
                        for (const button of systemInstance.buttons) {
                            this.interactionHandler.registerButton(button);
                        }
                    }
                    
                    if (systemInstance.selectMenus) {
                        for (const selectMenu of systemInstance.selectMenus) {
                            this.interactionHandler.registerSelectMenu(selectMenu);
                        }
                    }

                    // Store module
                    this.modules.set(systemInstance.name, systemInstance);
                    console.log(`[ModuleManager] Loaded module: ${systemInstance.name} (Tier: ${systemInstance.tier || 'FREE'})`);

                    // Initialize the module if it has an init function
                    if (typeof systemInstance.init === 'function') {
                        await systemInstance.init();
                    }
                }
            } catch (error) {
                console.error(`[ModuleManager] Error loading module ${dir}:`, error);
            }
        }
    }

    getModule(name) {
        return this.modules.get(name);
    }

    getAllModules() {
        return Array.from(this.modules.values());
    }
}

module.exports = ModuleManager;
