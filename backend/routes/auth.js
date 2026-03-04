const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Discord OAuth login URL
router.get('/discord', (req, res) => {
    const scope = 'identify guilds';
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    res.json({ authUrl });
});

// OAuth callback - exchange code for token
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, 
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Get user info
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResponse.data;

        // Store/update user in database
        const stmt = db.prepare(`
            INSERT INTO users (id, username, discriminator, avatar, access_token, refresh_token, token_expires_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${expires_in} seconds'))
            ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                discriminator = excluded.discriminator,
                avatar = excluded.avatar,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                updated_at = CURRENT_TIMESTAMP
        `);
        stmt.run(user.id, user.username, user.discriminator, user.avatar, access_token, refresh_token);

        // Generate JWT for session
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username,
                avatar: user.avatar 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect back to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        res.redirect(`${frontendUrl}/#/auth/callback?token=${token}`);

    } catch (error) {
        console.error('[Auth] OAuth callback error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Verify token and get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = db.prepare('SELECT id, username, discriminator, avatar, created_at FROM users WHERE id = ?').get(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[Auth] Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Refresh Discord token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const user = db.prepare('SELECT refresh_token FROM users WHERE id = ?').get(req.user.userId);
        
        if (!user || !user.refresh_token) {
            return res.status(401).json({ error: 'No refresh token available' });
        }

        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: user.refresh_token
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Update tokens in database
        db.prepare(`
            UPDATE users 
            SET access_token = ?, refresh_token = ?, token_expires_at = datetime('now', '+${expires_in} seconds'), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(access_token, refresh_token, req.user.userId);

        res.json({ success: true });
    } catch (error) {
        console.error('[Auth] Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Middleware to verify Discord Bearer token from frontend
async function verifyDiscordToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Discord access token required' });
    }

    try {
        // Verify token with Discord
        const response = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        req.discordUser = response.data;
        req.discordToken = token;
        next();
    } catch (error) {
        console.error('[Auth] Discord token verification failed:', error.message);
        res.status(401).json({ error: 'Invalid Discord token' });
    }
}

module.exports = { router, authenticateToken, verifyDiscordToken };
