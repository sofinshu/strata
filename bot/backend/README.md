# STRATA Dashboard Backend

Real-time backend API for the STRATA Discord staff management dashboard.

## Features

- Discord OAuth2 Authentication
- SQLite Database for data persistence
- RESTful API for all dashboard features
- WebSocket support for real-time updates
- Multi-server support with isolated data
- Comprehensive moderation, staff, and automation systems

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```env
PORT=3000
NODE_ENV=development
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback
JWT_SECRET=your_jwt_secret
```

3. Run migrations:
```bash
npm run migrate
```

4. Start server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `GET /auth/discord` - Discord OAuth login
- `GET /auth/callback` - OAuth callback
- `GET /auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Public stats
- `GET /api/dashboard/guilds` - User's managed guilds
- `GET /api/dashboard/guild/:id` - Guild overview
- `GET /api/dashboard/guild/:id/staff` - Staff roster
- `GET /api/dashboard/guild/:id/shifts` - Shift logs
- `GET /api/dashboard/guild/:id/warnings` - Warning logs
- `GET /api/dashboard/guild/:id/leaderboard` - Staff leaderboard
- `GET /api/dashboard/guild/:id/settings` - Guild settings
- `PATCH /api/dashboard/guild/:id/settings` - Update settings

### Systems
- `GET /api/dashboard/guild/:id/systems/:system` - Get system config
- `PATCH /api/dashboard/guild/:id/systems/:system` - Update system

### Moderation
- `GET /api/dashboard/guild/:id/moderation/bans` - Ban list
- `GET /api/dashboard/guild/:id/moderation/kicks` - Kick logs
- `POST /api/dashboard/guild/:id/moderation/ban` - Ban user
- `POST /api/dashboard/guild/:id/moderation/kick` - Kick user
- `POST /api/dashboard/guild/:id/moderation/warn` - Warn user

## Database Schema

See `database/schema.sql` for full schema definition.
