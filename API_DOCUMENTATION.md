# STRATA Dashboard API Documentation

Complete API reference for the STRATA Discord Dashboard backend.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: Your deployed backend URL

## Authentication

All protected endpoints require a Discord OAuth2 Bearer token in the Authorization header:

```
Authorization: Bearer <discord_access_token>
```

The token is obtained through Discord OAuth2 flow and verified against Discord's API on each request.

---

## Public Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### GET /api/dashboard/stats
Get public dashboard statistics.

**Response:**
```json
{
  "guildCount": 2400,
  "staffCount": 150,
  "totalShifts": 5000,
  "commandCount": 271,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### GET /auth/discord
Get Discord OAuth2 authorization URL.

**Response:**
```json
{
  "authUrl": "https://discord.com/oauth2/authorize?client_id=..."
}
```

### GET /auth/callback
OAuth2 callback handler. Redirects back to frontend with JWT token.

**Query Parameters:**
- `code` - Authorization code from Discord

### GET /auth/me
Get current authenticated user.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "id": "123456789",
  "username": "ExampleUser",
  "discriminator": "0",
  "avatar": "abc123",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Dashboard Endpoints

### GET /api/dashboard/guilds
Get list of guilds where user has Manage Server permission.

**Headers:**
- `Authorization: Bearer <discord_token>`

**Response:**
```json
[
  {
    "id": "123456789012345678",
    "name": "My Server",
    "icon": "abc123",
    "owner": false,
    "permissions": "274877910022",
    "botInstalled": true,
    "tier": "premium"
  }
]
```

### GET /api/dashboard/guild/:id
Get guild overview and statistics.

**Response:**
```json
{
  "guild": {
    "id": "123456789012345678",
    "name": "My Server",
    "icon": "abc123",
    "tier": "premium"
  },
  "stats": {
    "staffCount": 25,
    "shiftCount": 150,
    "warnCount": 3,
    "totalPoints": 5000
  },
  "activity": [
    { "date": "2024-01-08", "count": 5 },
    { "date": "2024-01-09", "count": 8 }
  ]
}
```

### GET /api/dashboard/guild/:id/staff
Get staff roster for guild.

**Response:**
```json
[
  {
    "id": "987654321098765432",
    "username": "StaffMember",
    "avatar": "def456",
    "role": "admin",
    "points": 2500,
    "reputation": 100,
    "isStaff": 1,
    "shifts": 50,
    "warnings": 0,
    "currentRank": "admin",
    "onShift": 1
  }
]
```

### GET /api/dashboard/guild/:id/shifts
Get shift logs for guild.

**Query Parameters:**
- `limit` - Number of shifts to return (default: 50)

**Response:**
```json
[
  {
    "id": 1,
    "userId": "987654321098765432",
    "username": "StaffMember",
    "startTime": "2024-01-15T08:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "duration": 150,
    "pointsEarned": 15,
    "status": "completed",
    "notes": null
  }
]
```

### GET /api/dashboard/guild/:id/warnings
Get warning logs for guild.

**Response:**
```json
[
  {
    "id": 1,
    "userId": "987654321098765432",
    "targetUsername": "ProblemUser",
    "issuerId": "111111111111111111",
    "issuerUsername": "AdminUser",
    "reason": "Spam in general chat",
    "severity": "medium",
    "status": "active",
    "createdAt": "2024-01-10T14:30:00.000Z",
    "expiresAt": null,
    "expired": 0
  }
]
```

### GET /api/dashboard/guild/:id/leaderboard
Get staff leaderboard.

**Response:**
```json
[
  {
    "id": "987654321098765432",
    "username": "TopStaff",
    "avatar": "abc123",
    "points": 5000,
    "shifts": 100,
    "activity": 95,
    "rank": 1
  }
]
```

### GET /api/dashboard/guild/:id/activity-logs
Get server activity logs.

**Query Parameters:**
- `limit` - Number of logs to return (default: 50)

**Response:**
```json
[
  {
    "id": 1,
    "userId": "987654321098765432",
    "type": "settings_updated",
    "meta": { "fields": ["modChannelId"] },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### GET /api/dashboard/guild/:id/promo-history
Get promotion/demotion history.

**Response:**
```json
{
  "activityLog": [
    {
      "createdAt": "2024-01-10T10:00:00.000Z",
      "userId": "987654321098765432",
      "type": "promotion",
      "meta": { "from": "staff", "to": "senior" }
    }
  ],
  "promotions": [
    {
      "userId": "987654321098765432",
      "username": "PromotedUser",
      "currentRank": "senior",
      "points": 3000,
      "lastPromotionDate": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### GET /api/dashboard/guild/:id/ticket-logs
Get ticket logs.

**Query Parameters:**
- `type` - Filter by category (report_staff, feedback, support)
- `status` - Filter by status (open, claimed, closed)

**Response:**
```json
[
  {
    "id": 1,
    "idDisplay": "TICKET-001",
    "category": "report_staff",
    "status": "closed",
    "originatorId": "987654321098765432",
    "username": "ReporterUser",
    "staffName": "ReportedStaff",
    "feedback": null,
    "details": "Inappropriate behavior",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

## Settings Endpoints

### GET /api/dashboard/guild/:id/settings
Get guild settings.

**Response:**
```json
{
  "modChannelId": "123456789012345678",
  "staffChannelId": "234567890123456789",
  "logChannelId": "345678901234567890",
  "warnThreshold": 3,
  "minShiftMinutes": 30,
  "autoPromotion": true,
  "shiftTrackingEnabled": true
}
```

### PATCH /api/dashboard/guild/:id/settings
Update guild settings.

**Request Body:**
```json
{
  "modChannelId": "123456789012345678",
  "warnThreshold": 3,
  "autoPromotion": true
}
```

---

## Promotion Requirements

### GET /api/dashboard/guild/:id/promotion-requirements
Get promotion requirements for all ranks.

**Response:**
```json
{
  "requirements": {
    "trial": { "points": 0, "shifts": 0, "consistency": 0, "maxWarnings": 3 },
    "staff": { "points": 500, "shifts": 10, "consistency": 50, "maxWarnings": 2 },
    "senior": { "points": 1500, "shifts": 30, "consistency": 70, "maxWarnings": 1 },
    "manager": { "points": 3000, "shifts": 60, "consistency": 80, "maxWarnings": 0 },
    "admin": { "points": 5000, "shifts": 100, "consistency": 90, "maxWarnings": 0 }
  },
  "rankRoles": {
    "trial": "111111111111111111",
    "staff": "222222222222222222"
  },
  "promotionChannel": "333333333333333333"
}
```

### PATCH /api/dashboard/guild/:id/promotion-requirements
Update promotion requirements.

**Request Body:**
```json
{
  "requirements": {
    "staff": {
      "points": 500,
      "shifts": 10,
      "consistency": 50,
      "maxWarnings": 2,
      "shiftHours": 5,
      "achievements": 0,
      "reputation": 0,
      "daysInServer": 7,
      "cleanRecordDays": 0,
      "customNote": "Requires minimum 7 days in server"
    }
  },
  "rankRoles": {
    "staff": "222222222222222222"
  },
  "promotionChannel": "333333333333333333"
}
```

---

## Custom Commands

### GET /api/dashboard/guild/:id/custom-commands
Get custom commands.

**Response:**
```json
{
  "commands": [
    {
      "trigger": "!rules",
      "response": "Please follow the server rules...",
      "type": "starts",
      "isEmbed": true,
      "enabled": true
    }
  ]
}
```

### PATCH /api/dashboard/guild/:id/custom-commands
Update custom commands.

**Request Body:**
```json
{
  "commands": [
    {
      "trigger": "!rules",
      "response": "Please follow the server rules...",
      "type": "starts",
      "isEmbed": true,
      "enabled": true
    }
  ]
}
```

---

## Staff Rewards

### GET /api/dashboard/guild/:id/staff-rewards
Get achievements and role rewards.

**Response:**
```json
{
  "achievements": [
    {
      "id": "ach_first_shift",
      "name": "First Shift",
      "description": "Complete your first work shift",
      "icon": "🎯",
      "criteria": { "type": "shifts", "value": 1 },
      "rewardPoints": 100,
      "rewardRoleId": null
    }
  ],
  "roleRewards": [
    {
      "name": "Bronze Staff",
      "roleId": "444444444444444444",
      "requiredPoints": 500
    }
  ]
}
```

### PATCH /api/dashboard/guild/:id/staff-rewards
Update staff rewards.

**Request Body:**
```json
{
  "achievements": [...],
  "roleRewards": [...]
}
```

---

## System Configurations

### GET /api/dashboard/guild/:id/systems/:system
Get system configuration.

**Available Systems:**
- `automod` - Auto-moderation settings
- `welcome` - Welcome message settings
- `autorole` - Auto-role assignment
- `logging` - Server logging
- `antispam` - Anti-spam protection
- `tickets` - Ticket system

**Example Response (welcome):**
```json
{
  "enabled": true,
  "channelId": "123456789012345678",
  "message": "Welcome {user} to {server}!",
  "dmEnabled": false,
  "dmMessage": ""
}
```

### PATCH /api/dashboard/guild/:id/systems/:system
Update system configuration.

---

## Root-level Configs

### GET /api/dashboard/guild/:id/alerts
Get activity alerts configuration.

**Response:**
```json
{
  "enabled": true,
  "channelId": "123456789012345678",
  "roleId": "987654321098765432",
  "threshold": 50
}
```

### PATCH /api/dashboard/guild/:id/alerts
Update alerts configuration.

---

### GET /api/dashboard/guild/:id/applications
Get staff application configuration.

**Response:**
```json
{
  "enabled": true,
  "panelTitle": "Staff Application",
  "applyChannelId": "123456789012345678",
  "reviewChannelId": "234567890123456789",
  "reviewerRoleId": "987654321098765432",
  "questions": [
    "Why do you want to join our team?",
    "What experience do you have?"
  ]
}
```

### PATCH /api/dashboard/guild/:id/applications
Update application configuration.

---

### GET /api/dashboard/guild/:id/branding
Get custom branding configuration (Enterprise only).

**Response:**
```json
{
  "color": "#6c63ff",
  "footer": "MyServer Network",
  "iconURL": "https://example.com/icon.png"
}
```

### PATCH /api/dashboard/guild/:id/branding
Update branding configuration.

---

## Moderation Endpoints

### GET /api/dashboard/guild/:id/moderation/actions
Get moderation actions (bans, kicks, timeouts).

**Query Parameters:**
- `type` - Filter by action type (ban, kick, timeout, warn)
- `limit` - Number of actions to return

**Response:**
```json
[
  {
    "id": 1,
    "actionType": "ban",
    "targetUserId": "987654321098765432",
    "targetUsername": "BannedUser",
    "moderatorId": "111111111111111111",
    "moderatorUsername": "AdminUser",
    "reason": "Repeated violations",
    "duration": null,
    "active": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### POST /api/dashboard/guild/:id/moderation/ban
Ban a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "username": "TargetUser",
  "reason": "Violation of rules",
  "duration": 10080
}
```

### POST /api/dashboard/guild/:id/moderation/kick
Kick a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "username": "TargetUser",
  "reason": "Inappropriate behavior"
}
```

### POST /api/dashboard/guild/:id/moderation/warn
Warn a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "username": "TargetUser",
  "reason": "Spam in chat",
  "severity": "medium",
  "expiresAt": "2024-02-15T00:00:00.000Z"
}
```

### POST /api/dashboard/guild/:id/moderation/mute
Timeout/mute a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "username": "TargetUser",
  "reason": "Cooling off period",
  "duration": 60
}
```

### POST /api/dashboard/guild/:id/moderation/unmute
Unmute a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "reason": "Timeout completed"
}
```

### POST /api/dashboard/guild/:id/moderation/unban
Unban a user.

**Request Body:**
```json
{
  "userId": "987654321098765432",
  "reason": "Appeal accepted"
}
```

### POST /api/dashboard/guild/:id/moderation/warnings/:id/revoke
Revoke a warning.

**Request Body:**
```json
{
  "reason": "Warning was issued in error"
}
```

### GET /api/dashboard/guild/:id/moderation/stats
Get moderation statistics.

**Response:**
```json
{
  "totalActions": 50,
  "warnings": 10,
  "byType": {
    "ban": 5,
    "kick": 10,
    "timeout": 20,
    "warn": 15
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied to this guild"
}
```

### 404 Not Found
```json
{
  "error": "Guild not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limits

- **Default**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315800
```

---

## WebSocket (Future)

Real-time updates will be available via WebSocket:

```javascript
const ws = new WebSocket('wss://api.example.com/ws?guild=123&token=xyz');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

Event types:
- `shift_start` - Staff member started shift
- `shift_end` - Staff member ended shift
- `warning_issued` - New warning added
- `promotion` - Staff promoted
- `staff_update` - Staff data changed

---

Built for [reynerabdon14](https://newworkspace-d8i3453.slack.com/archives/D0AHX76RKKR/p1772649696790889?thread_ts=1772579600.412499&cid=D0AHX76RKKR) by [Kilo for Slack](https://kilo.ai/features/slack-integration)
