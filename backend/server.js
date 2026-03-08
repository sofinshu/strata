require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./database/connection');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const guildRoutes = require('./routes/guild');
const moderationRoutes = require('./routes/moderation');
const systemRoutes = require('./routes/systems');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for now
    crossOriginEmbedderPolicy: false
}));

// CORS - allow dashboard to connect
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:8080', 
            'http://localhost:3000', 
            'https://stratadashboard-beta.vercel.app',
            'https://strata-gamma-blond.vercel.app'
        ];
        if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
        
        // Allow requests with no origin (like mobile apps or curl)
        // or if the origin is in our allowed list
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error('[CORS] Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/auth', authRoutes.router);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard/guild/:guildId', guildRoutes);
app.use('/api/dashboard/guild/:guildId', moderationRoutes);
app.use('/api/dashboard/guild/:guildId', systemRoutes);

// Serve static files (frontend) in production
if (NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
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

// Start server
app.listen(PORT, () => {
    console.log(`[Server] STRATA Dashboard API running on port ${PORT}`);
    console.log(`[Server] Environment: ${NODE_ENV}`);
    console.log(`[Server] Database: ${process.env.DB_PATH || './database/strata.db'}`);
});

module.exports = app;
