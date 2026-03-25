const { EmbedBuilder: DiscordEmbedBuilder } = require('discord.js');

class StrataEmbedBuilder extends DiscordEmbedBuilder {
    constructor(options = {}) {
        super(options);
        // Default Strata Theme colors
        this.colors = {
            primary: 0x6c63ff,  // Brand Purple
            success: 0x00e096,  // Brand Green
            danger: 0xff4757,   // Brand Red
            warning: 0xf1c40f,  // Brand Yellow
            info: 0x00b7ff      // Brand Blue
        };
        
        // Apply default strata styles if no options provided
        if (!options.color) {
            this.setColor(this.colors.primary);
        }
        
        // Add default strata footer
        this.setFooter({ text: 'STRATA PROTOCOL • SYSTEM ACTIVE' });
    }

    setTheme(type) {
        if (this.colors[type]) {
            this.setColor(this.colors[type]);
        }
        return this;
    }

    setGuildBranding(guild, customConfig = null) {
        // If a server has custom branding via dashboard, apply it
        if (customConfig && customConfig.color) {
            this.setColor(customConfig.color);
        }
        if (guild && guild.iconURL) {
            this.setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) });
        }
        return this;
    }
}

module.exports = StrataEmbedBuilder;
