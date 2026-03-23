# Strata Unified Dashboard Specification

════════════════════════════════════════════════════════════════
 SYSTEM IDENTITY
════════════════════════════════════════════════════════════════

You are a senior full-stack product architect and UI/UX
designer building the COMPLETE web dashboard for "Strata"
— a staff management Discord bot SaaS platform.

This document specifies EVERY page, panel, widget, modal,
table, chart, form, and interaction in the dashboard.

NOTHING is conceptual. EVERYTHING is functional.
EVERY command maps to a real dashboard element.

════════════════════════════════════════════════════════════════
 TECH STACK (SPECIFIED)
════════════════════════════════════════════════════════════════

Frontend:    Next.js 14 (App Router) + TypeScript
Styling:     Tailwind CSS + shadcn/ui components
Charts:      Recharts (bar, line, pie, heatmap, area)
Tables:      TanStack Table (sorting, filtering, pagination)
Forms:       React Hook Form + Zod validation
State:       Zustand (client) + TanStack Query (server)
Auth:        Discord OAuth2 (next-auth)
Backend:     Next.js API Routes + Prisma ORM
Database:    PostgreSQL (Supabase)
Realtime:    Socket.io (live shift tracking, alerts)
Payments:    Stripe (subscriptions)
Hosting:     Vercel
CDN:         Cloudflare

════════════════════════════════════════════════════════════════
 BRAND DESIGN SYSTEM
════════════════════════════════════════════════════════════════

COLOR PALETTE:
| Token | Hex | Usage |
| :--- | :--- | :--- |
| --bg-primary | #0F1117 | Main background (dark) |
| --bg-secondary | #1A1D27 | Card/panel background |
| --bg-tertiary | #242836 | Hover states, inputs |
| --bg-elevated | #2D3241 | Dropdowns, tooltips |
| --border | #333845 | Borders, dividers |
| --text-primary | #F0F0F3 | Primary text |
| --text-secondary | #8B8FA3 | Secondary/muted text |
| --text-tertiary | #5C6070 | Placeholder, disabled |
| --accent | #5865F2 | Blurple (Discord brand) |
| --accent-hover | #4752C4 | Accent hover state |
| --success | #57F287 | Green (positive actions) |
| --warning | #FEE75C | Yellow (warnings) |
| --error | #ED4245 | Red (errors, destructive) |
| --premium | #F47FFF | Premium badge/features |
| --enterprise | #FFD700 | Enterprise badge/features |
| --info | #5BC0EB | Info badges, tooltips |

TYPOGRAPHY:
- Font Family: Inter (sans-serif)
- Heading 1: 28px / 700 weight / #F0F0F3
- Heading 2: 22px / 600 weight / #F0F0F3
- Heading 3: 18px / 600 weight / #F0F0F3
- Body: 14px / 400 weight / #F0F0F3
- Small: 12px / 400 weight / #8B8FA3
- Caption: 11px / 500 weight / #5C6070

BORDER RADIUS:
- Cards: 12px
- Buttons: 8px
- Inputs: 8px
- Badges: 6px
- Avatars: 50% (circle)
- Modals: 16px

SHADOWS:
- Card: 0 4px 6px -1px rgba(0,0,0,0.3)
- Dropdown: 0 10px 15px -3px rgba(0,0,0,0.4)
- Modal: 0 25px 50px -12px rgba(0,0,0,0.5)

SPACING SCALE:
xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px

ANIMATIONS:
- Transitions: 150ms ease-in-out (all interactive elements)
- Page loads: Fade-in 200ms
- Charts: Animate on mount (500ms spring)
- Skeleton: Pulse animation for loading states
- Toast: Slide-in from top-right (300ms)

════════════════════════════════════════════════════════════════
 GLOBAL DASHBOARD LAYOUT
════════════════════════════════════════════════════════════════

TOP NAVBAR (fixed, 64px height, full width)
SIDEBAR (240px fixed)
MAIN CONTENT AREA (flex-1, scrollable)

... (Full details from prompt) ...

════════════════════════════════════════════════════════════════
 PAGE 1: OVERVIEW / DASHBOARD HOME
 Route: /dashboard/[serverId]
 Tier: 🟢 Free
 Maps to commands: dashboard, server_overview, daily_summary
════════════════════════════════════════════════════════════════

STAT CARDS ROW (4 cards, equal width, grid: 4 cols)
- TOTAL STAFF
- ACTIVE SHIFTS
- OPEN TICKETS
- WARNINGS

ACTIVITY CHART + QUICK ACTIONS (grid: 8/4 split)
RECENT ACTIVITY FEED + ACTIVE SHIFTS (grid: 6/6 split)
TOP PERFORMERS + POINT LEADERBOARD (grid: 6/6 split)
ANNOUNCEMENTS + UPGRADE BANNER (conditional)

════════════════════════════════════════════════════════════════
 PAGE 2: STAFF MANAGEMENT
 Route: /dashboard/[serverId]/staff
 Tier: 🟢 Free (base) + 🔵 Premium + 🟣 Enterprise sub-pages
════════════════════════════════════════════════════════════════

SUB-PAGE 2A: STAFF DIRECTORY
SUB-PAGE 2B: STAFF PROFILE (Full Page)
SUB-PAGE 2C: PROMOTIONS & DEMOTIONS
PAGE 2D: AUTO PROMOTION 🔵 PREMIUM

════════════════════════════════════════════════════════════════
 PAGE 3: SHIFTS & TASKS
 Route: /dashboard/[serverId]/shifts
 Tier: 🟢 Free (base) + 🔵 Premium + 🟣 Enterprise sub-pages
════════════════════════════════════════════════════════════════

SUB-PAGE 3A: ACTIVE SHIFTS
SUB-PAGE 3B: TASK BOARD
SUB-PAGE 3C: SHIFT SCHEDULE 🔵 PREMIUM

════════════════════════════════════════════════════════════════
 PAGE 4: POINTS & REPUTATION
 Route: /dashboard/[serverId]/points
 Tier: 🟢 Free (base) + 🔵 Premium + 🟣 Enterprise
════════════════════════════════════════════════════════════════

SUB-PAGE 4A: POINT BALANCES
SUB-PAGE 4B: LEADERBOARD

════════════════════════════════════════════════════════════════
 PAGE 5: TICKETS & APPLICATIONS
 Route: /dashboard/[serverId]/tickets
 Tier: 🟢 Free (base) + 🔵 Premium + 🟣 Enterprise
════════════════════════════════════════════════════════════════
...
