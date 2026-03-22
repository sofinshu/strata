const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../database/connection');

// Basic Health Check Endpoint
router.get('/', (req, res) => {
    try {
        const uptime = process.uptime();
        const mem = process.memoryUsage();
        
        // Check DB connection
        const dbStatus = db.prepare('SELECT 1').get() ? 'Connected' : 'Disconnected';

        res.json({
            status: 'success',
            botUptime: uptime,
            memory: {
                rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
                heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
            },
            system: {
                platform: os.platform(),
                freemem: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
                totalmem: (os.totalmem() / 1024 / 1024).toFixed(2) + ' MB'
            },
            database: dbStatus,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Health check failed', detail: e.message });
    }
});

module.exports = router;
