# STRATA Dashboard - Full Stack Implementation

A complete Discord staff management dashboard with real data persistence.

## Overview

This implementation provides a production-ready backend API with SQLite database that powers the STRATA Discord bot dashboard with:

- Real data persistence across all features
- Discord OAuth2 authentication
- Multi-server support with isolated data
- Comprehensive staff management systems
- Full moderation tools
- Automated systems (welcome, autorole, logging, etc.)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   SQLite DB     │
│  (HTML/JS)      │     │   (Node.js)     │     │  (strata.db)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Discord API    │
                        │  (OAuth2/Bot)   │
                        └─────────────────┘
```

## Features Implemented

### Core Dashboard
- [x] Server overview with real-time stats
- [x] Staff roster management
- [x] Shift logging and tracking
- [x] Warning system
- [x] Leaderboards
- [x] Activity logs
- [x] Promotion history

### Moderation Tools
- [x] Ban/unban users
- [x] Kick users
- [x] Warn users with severity levels
- [x] Timeout/mute users
- [x] Warning revocation
- [x] Moderation action history

### Automated Systems
- [x] Welcome messages (with DM support)
- [x] Auto-role assignment
- [x] Server logging (members, messages, moderation, roles, voice)
- [x] Anti-spam protection
- [x] Ticket system configuration
- [x] Auto-moderation (profanity, links, invites, mentions)

### Staff Management
- [x] Custom promotion requirements per rank
- [x] Auto-promotion system
- [x] Custom commands
- [x] Achievement system
- [x] Role rewards based on points
- [x] Staff application system
- [x] Activity alerts

### Configuration
- [x] Server settings
- [x] Tier-based feature access (Free/Premium/Enterprise)
- [x] Custom branding (Enterprise)

## API Endpoints

### Authentication
- `GET /auth/discord` - Get Discord OAuth URL
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Public statistics
- `GET /api/dashboard/guilds` - List user's managed guilds
- `GET /api/dashboard/guild/:id` - Guild overview
- `GET /api/dashboard/guild/:id/staff` - Staff roster
- `GET /api/dashboard/guild/:id/shifts` - Shift logs
- `GET /api/dashboard/guild/:id/warnings` - Warning logs
- `GET /api/dashboard/guild/:id/leaderboard` - Staff leaderboard
- `GET /api/dashboard/guild/:id/activity-logs` - Activity history
- `GET /api/dashboard/guild/:id/promo-history` - Promotion history
- `GET /api/dashboard/guild/:id/ticket-logs` - Ticket logs

### Settings
- `GET /api/dashboard/guild/:id/settings` - Get settings
- `PATCH /api/dashboard/guild/:id/settings` - Update settings
- `GET /api/dashboard/guild/:id/promotion-requirements` - Get promotion reqs
- `PATCH /api/dashboard/guild/:id/promotion-requirements` - Update promotion reqs
- `GET /api/dashboard/guild/:id/custom-commands` - Get custom commands
- `PATCH /api/dashboard/guild/:id/custom-commands` - Update custom commands
- `GET /api/dashboard/guild/:id/staff-rewards` - Get staff rewards
- `PATCH /api/dashboard/guild/:id/staff-rewards` - Update staff rewards

### Systems
- `GET /api/dashboard/guild/:id/systems/:system` - Get system config
- `PATCH /api/dashboard/guild/:id/systems/:system` - Update system config

Available systems: `automod`, `welcome`, `autorole`, `logging`, `antispam`, `tickets`

### Root-level configs
- `GET|PATCH /api/dashboard/guild/:id/alerts` - Activity alerts
- `GET|PATCH /api/dashboard/guild/:id/applications` - Staff applications
- `GET|PATCH /api/dashboard/guild/:id/branding` - Custom branding

### Moderation
- `GET /api/dashboard/guild/:id/moderation/actions` - List actions
- `POST /api/dashboard/guild/:id/moderation/ban` - Ban user
- `POST /api/dashboard/guild/:id/moderation/kick` - Kick user
- `POST /api/dashboard/guild/:id/moderation/warn` - Warn user
- `POST /api/dashboard/guild/:id/moderation/mute` - Mute user
- `POST /api/dashboard/guild/:id/moderation/unmute` - Unmute user
- `POST /api/dashboard/guild/:id/moderation/unban` - Unban user
- `POST /api/dashboard/guild/:id/moderation/warnings/:id/revoke` - Revoke warning

## Database Schema

See `backend/database/schema.sql` for the complete schema.

Key tables:
- `guilds` - Server configurations
- `guild_members` - Member data per server
- `staff_profiles` - Extended staff information
- `shifts` - Work shift records
- `warnings` - Moderation warnings
- `moderation_actions` - Ban/kick/mute logs
- `promotion_requirements` - Auto-promotion criteria
- `system_configs` - Feature configurations
- `custom_commands` - User-defined commands
- `achievements` - Achievement definitions
- `tickets` - Support ticket records

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Discord application with OAuth2 credentials

### 1. Clone and Install
```bash
git clone <repository>
cd Hacka/backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your Discord credentials
```

### 3. Initialize Database
```bash
npm run migrate
# Optional: add seed data
npm run seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

### 5. Frontend Setup
The frontend (`index.html` and `app.js`) can be served statically:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

Then open `http://localhost:8080`

## Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 → General
4. Add redirect URI: `http://localhost:3000/auth/callback`
5. Copy Client ID and Client Secret to `.env`
6. Enable `identify` and `guilds` scopes

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-domain.com/auth/callback
JWT_SECRET=strong_random_string
FRONTEND_URL=https://your-domain.com
```

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name strata-api
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Database Backups
The SQLite database is stored in `backend/database/strata.db`. Set up regular backups:

```bash
# Add to crontab for daily backups
0 0 * * * cp /path/to/strata.db /backups/strata-$(date +\%Y\%m\%d).db
```

## Security Considerations

1. **JWT Secret**: Use a strong, random JWT secret in production
2. **CORS**: Configure `FRONTEND_URL` to only allow your domain
3. **Rate Limiting**: API has built-in rate limiting (100 req/15min per IP)
4. **Helmet**: Security headers are enabled by default
5. **HTTPS**: Always use HTTPS in production

## Feature Tiers

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| Staff Management | ✅ | ✅ | ✅ |
| Shift Tracking | ✅ | ✅ | ✅ |
| Warnings | ✅ | ✅ | ✅ |
| Leaderboard | ✅ | ✅ | ✅ |
| Auto-Promotion | ❌ | ✅ | ✅ |
| Ticket System | ❌ | ✅ | ✅ |
| Custom Commands | ❌ | ✅ | ✅ |
| Staff Rewards | ❌ | ✅ | ✅ |
| Applications | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |

## Troubleshooting

### Database Issues
```bash
# Reset database
rm backend/database/strata.db
npm run migrate
npm run seed
```

### Discord OAuth Issues
- Check redirect URI matches exactly
- Verify client ID and secret
- Ensure bot has required permissions

### CORS Errors
- Verify `FRONTEND_URL` environment variable
- Check protocol matches (http vs https)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (if available)
5. Submit a pull request

## License

MIT License - See LICENSE file

---

Built for [reynerabdon14](https://newworkspace-d8i3453.slack.com/archives/D0AHX76RKKR/p1772649696790889?thread_ts=1772579600.412499&cid=D0AHX76RKKR) by [Kilo for Slack](https://kilo.ai/features/slack-integration)
