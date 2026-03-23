const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'database', 'strata.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
try {
    if (!fs.existsSync(dbDir)) {
        // Try to create the directory
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('[Database] Created directory:', dbDir);
    }
    // Test if writable
    fs.accessSync(dbDir, fs.constants.W_OK);
} catch (err) {
    console.warn(`[Database] Directory ${dbDir} is not writable or cannot be created. Fallback may be needed.`);
}

// Create database connection
let db;
try {
    // Try primary path
    db = new Database(DB_PATH);
    console.log('[Database] Connected to primary:', DB_PATH);
} catch (error) {
    console.warn(`[Database] Failed to open primary database at ${DB_PATH}:`, error.message);
    
    // Check if it's a likely Railway volume issue
    if (DB_PATH.startsWith('/data')) {
        console.info('[Database TIP] If you want persistence on Railway, make sure to mount a volume at /data in your service settings!');
    }

    // Try relative fallback (inside project, writable but not persistent)
    const LOCAL_FALLBACK = path.resolve(__dirname, '..', 'database', 'strata.db');
    if (DB_PATH !== LOCAL_FALLBACK) {
        try {
            console.log('[Database] Trying local project fallback:', LOCAL_FALLBACK);
            db = new Database(LOCAL_FALLBACK);
            console.log('[Database] Connected to local fallback.');
        } catch (localErr) {
            console.warn('[Database] Local fallback also failed:', localErr.message);
        }
    }

    // Final attempt: Temp directory (always writable, never persistent)
    if (!db) {
        const TEMP_PATH = '/tmp/strata.db';
        console.log('[Database] Falling back to temporary storage (EPHEMERAL):', TEMP_PATH);
        db = new Database(TEMP_PATH);
    }
}

// Enable WAL mode for better concurrency
if (db) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
}

// Initialize schema
function initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('[Database] Schema initialized');
    }
}

// Run migrations on startup
initSchema();

module.exports = db;
