require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const db = require('./database/connection');
require('./bot');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const guildRoutes = require('./routes/guild');
const moderationRoutes = require('./routes/moderation');
const systemRoutes = require('./routes/systems');
const monetizationRoutes = require('./routes/monetization');
const healthRoutes = require('./routes/health');

const app = express();
app.set("trust proxy", 1);

const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'development' ? "5000" : "3000"), 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const legacyDir = path.join(__dirname, '..', 'legacy');
const indexPath = path.join(legacyDir, 'index.html');
const indexExists = fs.existsSync(indexPath);
console.log('[debug c78724] H4 legacy static precheck', {
    NODE_ENV,
    PORT,
    legacyDir,
    indexPath,
    indexExists
});

// #region agent log
fetch('http://127.0.0.1:7425/ingest/a26be208-b182-4a45-af21-f25fc31bb0f9', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c78724' }, body: JSON.stringify({ sessionId: 'c78724', runId: 'pre-debug', hypothesisId: 'H1', location: 'backend/server.js:config', message: 'Server startup config', data: { PORT, NODE_ENV } , timestamp: Date.now() }) }).catch(() => {});
console.log('[debug c78724] H1 startup config', { PORT, NODE_ENV });
// #endregion

// IMMEDIATE Health check for Railway - BEFORE any middlewares
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'strata-backend'
    });
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// CORS - manual implementation
app.use((req, res, next) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '/health')) {
        // #region agent log
        fetch('http://127.0.0.1:7425/ingest/a26be208-b182-4a45-af21-f25fc31bb0f9', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c78724' }, body: JSON.stringify({ sessionId: 'c78724', runId: 'pre-debug', hypothesisId: 'H2', location: 'backend/server.js:request-entry', message: 'Incoming GET (root/health)', data: { path: req.path, originalUrl: req.originalUrl } , timestamp: Date.now() }) }).catch(() => {});
        console.log('[debug c78724] H2 incoming GET', { path: req.path, originalUrl: req.originalUrl });
        // #endregion
    }
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    validate: { xForwardedForHeader: false }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// STEP 9: Integrated Connection Routes
const { EmbedBuilder } = require('discord.js');
const { client } = require('./bot');

app.post('/api/send-embed', async (req, res) => {
    try {
        const { channelId, title, description, color } = req.body;
        if (!channelId || !title || !description) {
            return res.status(400).json({ success: false, error: "Missing data" });
        }
        const channel = await client.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ success: false, error: "Channel not found" });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color || 0x5865F2);

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Redundant /api/settings/welcome removed - handled by systemRoutes

app.get('/api/servers/:serverId/channels', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(req.params.serverId);
        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/servers/:serverId/roles', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(req.params.serverId);
        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
        res.json(roles);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API Routes
app.use('/auth', authRoutes.router);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard/guild/:guildId', guildRoutes);
app.use('/api/dashboard/guild/:guildId', moderationRoutes);
app.use('/api/dashboard/guild/:guildId', systemRoutes);
app.use('/api/subscription', monetizationRoutes);
app.use('/api/health', healthRoutes);

// Serve static files (frontend) in production
// Debug endpoint to check bot status
app.get('/api/debug/bot', async (req, res) => {
    try {
        res.json({
            ready: client.isReady(),
            tag: client.user?.tag,
            guilds: client.guilds.cache.size,
            guildList: client.guilds.cache.map(g => ({ id: g.id, name: g.name })),
            uptime: Math.floor(process.uptime())
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// #region agent log
app.get('/api/debug/static', (req, res) => {
    const legacyDirCandidates = [
        path.join(__dirname, '..', 'legacy'),
        path.join(process.cwd(), 'legacy'),
    ];

    const indexCandidates = legacyDirCandidates.map((d) => {
        const p = path.join(d, 'index.html');
        return { dir: d, indexPath: p, indexExists: fs.existsSync(p) };
    });

    res.json({
        nodeEnv: NODE_ENV,
        port: PORT,
        cwd: process.cwd(),
        __dirname,
        indexCandidates,
    });
});
// #endregion

if (indexExists) {
    // #region agent log
    fetch('http://127.0.0.1:7425/ingest/a26be208-b182-4a45-af21-f25fc31bb0f9', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c78724' }, body: JSON.stringify({ sessionId: 'c78724', runId: 'pre-debug', hypothesisId: 'H4', location: 'backend/server.js:static', message: 'Static serving from legacy/index.html', data: { NODE_ENV, legacyDir, indexPath, indexExists: fs.existsSync(indexPath) } , timestamp: Date.now() }) }).catch(() => {});
    console.log('[debug c78724] H4 static serving from legacy/index.html', { NODE_ENV, legacyDir, indexPath, indexExists: fs.existsSync(indexPath) });
    // #endregion
    app.use(express.static(legacyDir));

    app.get('*', (req, res) => {
        // #region agent log
        console.log('[debug c78724] H5 sendFile handler hit', {
            method: req.method,
            originalUrl: req.originalUrl,
            indexExists: fs.existsSync(indexPath),
        });
        // #endregion
        res.sendFile(indexPath);
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7425/ingest/a26be208-b182-4a45-af21-f25fc31bb0f9', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c78724' }, body: JSON.stringify({ sessionId: 'c78724', runId: 'pre-debug', hypothesisId: 'H3', location: 'backend/server.js:404', message: 'Express 404 fallback hit', data: { method: req.method, originalUrl: req.originalUrl } , timestamp: Date.now() }) }).catch(() => {});
    console.log('[debug c78724] H3 Express 404 fallback', { method: req.method, originalUrl: req.originalUrl });
    // #endregion
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down gracefully');
    db.close();
    process.exit(0);
});

// Start server - Listen on 0.0.0.0 for Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] STRATA Dashboard API running on 0.0.0.0:${PORT}`);
    console.log(`[Server] Environment: ${NODE_ENV}`);
    console.log(`[Server] Database: ${process.env.DB_PATH || './database/strata.db'}`);
    
    // Security check for Discord Token (Masked)
    const tokenStatus = process.env.DISCORD_TOKEN ? `SET (starts with ${process.env.DISCORD_TOKEN.substring(0, 10)}...)` : 'NOT SET! (Bot will be offline)';
    console.log(`[Server] DISCORD_TOKEN: ${tokenStatus}`);
});

module.exports = app;
