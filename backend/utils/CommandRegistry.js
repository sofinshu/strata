const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

class CommandRegistry {
    constructor() {
        this.commands = [];
        this.loadFromRegistry();
    }

    loadFromRegistry() {
        try {
            const listPath = path.join(__dirname, '../data/extracted_commands.json');
            const v4Path = path.join(__dirname, '../data/v4_slash_commands.json');
            
            if (fs.existsSync(listPath)) {
                this.commands = JSON.parse(fs.readFileSync(listPath, 'utf8'));
            }

            if (fs.existsSync(v4Path)) {
                const v4Cmds = JSON.parse(fs.readFileSync(v4Path, 'utf8'));
                // Replace or add v4 commands
                for (const v4 of v4Cmds) {
                    const idx = this.commands.findIndex(c => c.name === v4.name);
                    if (idx !== -1) {
                        this.commands[idx] = { ...this.commands[idx], ...v4 };
                    } else {
                        this.commands.push(v4);
                    }
                }
            }
        } catch (error) {
            console.error('[CommandRegistry] Error loading commands:', error);
        }
    }

    /**
     * Organize v4.0 Minimal Slash Commands
     */
    getGroupedCommands() {
        const v4SlashCommands = [
            'help', 'ping', 'invite_link', 'report_issue', 'dashboard',
            'shift_start', 'shift_end', 'shift_stats', 'promote', 'demote',
            'staff_list', 'staff_profile', 'staff_rank', 'staff_stats_agg', // stats_agg for #14
            'points', 'check_points', 'warn', 'warnings', 'clear_warnings', 'premium'
        ];
        
        const result = [];
        const handledNames = new Set();

        // Register the 20 Minimal Slash Commands
        for (const name of v4SlashCommands) {
            // Find command data in registry
            const cmd = this.commands.find(c => c.name === name);
            if (cmd) {
                result.push({
                    name: cmd.name,
                    description: cmd.desc || `Execute ${cmd.name} command`,
                    options: cmd.options || []
                });
                handledNames.add(name);
            }
        }

        return result;
    }
}

module.exports = new CommandRegistry();
