# Diet & Calorie Dashboard

A comprehensive, self-hosted nutrition tracking dashboard with AI-powered features.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts + @dnd-kit
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: Email/Password + JWT (httpOnly cookie refresh tokens)
- **AI**: Gemini, OpenAI GPT-4o, or Claude — configurable in-app, called server-side

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/diet_dashboard
JWT_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret-here
NODE_ENV=development
```

### 3. Create database and run migrations

```bash
# Create the database (run in psql or pgAdmin)
createdb diet_dashboard

# Run migrations
npm run migrate
```

### 4. Development

```bash
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:3001

### 5. Production build

```bash
npm run build   # builds React into server/public/
npm start       # serves everything from port 3001
```

## AI Features Setup

AI features are optional. Configure your API keys in the **Settings** page after logging in.

Supported providers:
| Provider | Model | Key name |
|----------|-------|----------|
| Gemini | gemini-2.5-flash-preview-05-20 | Google AI Studio key |
| OpenAI | gpt-4o | OpenAI Platform key |
| Claude | claude-sonnet-4-6 | Anthropic Console key |

All AI calls are made **server-side** — your API keys are never exposed to the browser.

## VPS Deployment with Nginx + PM2

```bash
# Install PM2 globally
npm install -g pm2

# Build and start
npm run build
pm2 start server/index.js --name diet-dashboard
pm2 save

# Nginx config
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /path/to/diet-dashboard/uploads/;
        expires 30d;
    }
}
```

## Features

- **Dashboard**: Calorie/macro/micro summaries, protein gauge, activity calendar, weight chart
- **Daily Logger**: Drag-and-drop meal management, consumed toggles, cheat day flagging
- **Food Database**: Full CRUD, CSV bulk import/export, AI nutritional enrichment
- **Reports**: Date range charts (calories, macros, micros), CSV & PDF export
- **Weight Log**: Daily weight tracking with trend chart
- **AI Quick Add**: Natural language meal logging
- **AI Photo Meal**: Photo-based meal analysis
- **AI Meal Planner**: Personalized next-day meal plans
- **Data Management**: Full JSON backup/restore
