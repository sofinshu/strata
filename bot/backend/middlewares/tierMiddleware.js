const db = require('../database/connection');

// Middleware to enforce subscription tiers on API routes
function requireTier(requiredTier) {
    const tierLevels = {
        'free': 0,
        'premium': 1,
        'enterprise': 2
    };

    return (req, res, next) => {
        const guildId = req.params.guildId || req.body.guildId;
        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID is required for tier verification.' });
        }

        try {
            const row = db.prepare('SELECT tier FROM guilds WHERE id = ?').get(guildId);
            const currentTier = row ? row.tier : 'free';
            
            const currentLevel = tierLevels[currentTier.toLowerCase()] || 0;
            const requiredLevel = tierLevels[requiredTier.toLowerCase()] || 0;

            if (currentLevel >= requiredLevel) {
                // Attach tier to request for downstream handlers
                req.guildTier = currentTier;
                next();
            } else {
                return res.status(403).json({ 
                    error: `This feature requires ${requiredTier.toUpperCase()} tier or higher. Your current tier is ${currentTier.toUpperCase()}.` 
                });
            }
        } catch (error) {
            console.error('[Tier Middleware] Error verifying tier:', error);
            return res.status(500).json({ error: 'Failed to verify guild subscription tier.' });
        }
    };
}

// Function checking for Bot interaction tier requirements 
function checkGuildTier(guildId, requiredTier) {
    const tierLevels = {
        'free': 0,
        'premium': 1,
        'enterprise': 2
    };

    try {
        const row = db.prepare('SELECT tier FROM guilds WHERE id = ?').get(guildId);
        const currentTier = row ? row.tier : 'free';
        
        const currentLevel = tierLevels[currentTier.toLowerCase()] || 0;
        const requiredLevel = tierLevels[requiredTier.toLowerCase()] || 0;

        return {
            hasAccess: currentLevel >= requiredLevel,
            currentTier,
            requiredTier
        };
    } catch (e) {
        console.error('[Tier DB] Error', e);
        return { hasAccess: false, currentTier: 'free', requiredTier };
    }
}

module.exports = { requireTier, checkGuildTier };
