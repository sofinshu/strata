const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Get current subscription info
router.get('/:guildId', (req, res) => {
    try {
        const row = db.prepare('SELECT id, name, tier FROM guilds WHERE id = ?').get(req.params.guildId);
        if (!row) {
            return res.status(404).json({ error: 'Guild not found in database.' });
        }
        res.json({
            id: row.id,
            name: row.name,
            tier: row.tier
        });
    } catch (error) {
        console.error('[API] Subscription Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription data.' });
    }
});

// Update subscription tier (Admin/Webhook use only normally)
router.post('/:guildId/update', (req, res) => {
    const { tier } = req.body;
    const validTiers = ['free', 'premium', 'enterprise'];
    
    if (!validTiers.includes(tier?.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid tier specified.' });
    }

    try {
        const result = db.prepare('UPDATE guilds SET tier = ? WHERE id = ?').run(tier.toLowerCase(), req.params.guildId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Guild not found.' });
        }
        res.json({ success: true, message: `Guild tier updated to ${tier.toUpperCase()}` });
    } catch (error) {
        console.error('[API] Subscription Update Error:', error);
        res.status(500).json({ error: 'Failed to update subscription data.' });
    }
});

module.exports = router;
