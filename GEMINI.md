# NutriFlex Diet Dashboard — Gemini CLI Context

You are assisting with the **NutriFlex** diet and fitness tracking web application deployed on a Hetzner VPS.

---

## Server Layout

| What | Path |
|------|------|
| **Frontend source** | `/root/diet-app/` |
| **Frontend build output** | `/root/diet-app/dist/` |
| **Web root (served by nginx)** | `/home/xadmin/web/diet.swansi.site/public_html/` |
| **Full-stack backend** | `/home/xadmin/web/diet.swansi.site/app/` |
| **Backend API port** | `3001` (managed by PM2, process name: `diet-dashboard`) |
| **Live domain** | `https://diet.swansi.site` |

---

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide React icons
- **Backend**: Node.js + Express (ES modules)
- **Database**: PostgreSQL via Supabase (connection in `/home/xadmin/web/diet.swansi.site/app/.env`)
- **Process manager**: PM2
- **Web server**: nginx (via HestiaCP panel)
- **Auth**: JWT (access token in memory, refresh token in httpOnly cookie)
- **AI features**: Gemini / OpenAI / Claude (per-user API keys stored in DB)

---

## Frontend Update Workflow

When the user asks you to update or redeploy the frontend:

```bash
# 1. Go to the frontend source
cd /root/diet-app

# 2. Pull latest code (if linked to git)
git pull origin master

# 3. Install dependencies (only if package.json changed)
npm install

# 4. Build the React app
npm run build
# Output lands in: /root/diet-app/dist/

# 5. Deploy built files to the web root
cp -r /root/diet-app/dist/. /home/xadmin/web/diet.swansi.site/public_html/

# 6. Verify it's live
curl -s -o /dev/null -w "%{http_code}" https://diet.swansi.site
# Expected: 200
```

---

## Backend Update Workflow

When the user asks to update the backend (API / server):

```bash
# 1. Go to the full-stack app
cd /home/xadmin/web/diet.swansi.site/app

# 2. Pull latest code
git pull origin master

# 3. Install dependencies (if changed)
npm install

# 4. Run DB migrations (safe to re-run, idempotent)
npm run migrate

# 5. Rebuild frontend into server/public (served by backend static middleware)
npm run build

# 6. Restart the Node.js server
pm2 restart diet-dashboard

# 7. Check it's running
pm2 status
curl -s http://localhost:3001/api/auth/me
# Expected: {"error":"No token provided"}
```

---

## Key Source Files

```
/root/diet-app/
├── src/
│   ├── components/
│   │   ├── auth/         LoginScreen.jsx
│   │   ├── layout/       Shell.jsx, Sidebar.jsx, TopBar.jsx
│   │   ├── logger/       DailyLoggerView.jsx, AddFoodModal.jsx
│   │   ├── fooddb/       FoodDatabaseView.jsx, FoodFormModal.jsx
│   │   ├── dashboard/    DashboardView.jsx
│   │   ├── reports/      ReportsView.jsx
│   │   ├── weight/       WeightLogView.jsx
│   │   ├── workout/      WorkoutView.jsx, WorkoutTracker.jsx
│   │   ├── settings/     SettingsView.jsx
│   │   └── ui/           GlassCard, GradientButton, Modal, etc.
│   ├── context/          AuthContext.jsx, AppContext.jsx, ThemeContext.jsx
│   ├── hooks/            useDailyLog.js, useFoodDatabase.js, useWeightLog.js …
│   └── utils/            constants.js, dateUtils.js, nutritionCalc.js
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Navigation / Views

The app is a single-page app (SPA). Views are switched via `AppContext.activeView`:

| View key | Component | Description |
|----------|-----------|-------------|
| `dashboard` | DashboardView | Calorie summary, macro charts |
| `logger` | DailyLoggerView | Daily meal logging, AI Quick Add |
| `fooddb` | FoodDatabaseView | Food database (global + private) |
| `reports` | ReportsView | Historical charts, macro trends |
| `weight` | WeightLogView | Weight tracking + chart |
| `profile` | ProfileView | User profile (name, DOB, height) |
| `planner` | MealPlannerView | AI meal planner |
| `workout` | WorkoutView | Workout sessions + templates |
| `data` | DataManagementView | Export / Import backup |
| `settings` | SettingsView | AI provider & API key |

---

## API Base

All API calls from frontend go to `/api/` which nginx proxies to `http://127.0.0.1:3001`.

Backend routes:
- `POST /api/auth/login` `register` `logout` `refresh` `google`
- `GET/POST/PUT/DELETE /api/daily-logs`
- `GET/POST/PUT/DELETE /api/food-database`
- `GET/POST /api/weight-log`
- `GET/PUT /api/profile`
- `POST /api/ai/quick-add` `/ai/photo-meal`
- `GET/POST /api/workout-sessions` `/workout-templates` `/exercises`
- `GET/POST /api/data/export` `/data/import`
- `GET/PUT /api/settings`

---

## Nginx Config (summary)

```nginx
root /home/xadmin/web/diet.swansi.site/app/server/public;
error_page 404 /index.html;   # SPA fallback

location /api/ {
    proxy_pass http://127.0.0.1:3001;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
}
```

Config file: `/home/xadmin/conf/web/diet.swansi.site/nginx.conf_custom`

Reload nginx after config changes:
```bash
nginx -t && systemctl reload nginx
```

---

## Environment Variables

Backend `.env` at `/home/xadmin/web/diet.swansi.site/app/.env`:
```
DATABASE_URL=postgresql://...supabase...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
PORT=3001
```

Frontend `.env` (if applicable) at `/root/diet-app/.env`:
```
VITE_GOOGLE_CLIENT_ID=...
```

---

## Common Quick Commands

```bash
# Check backend is running
pm2 status

# View backend logs
pm2 logs diet-dashboard --lines 50

# Restart backend
pm2 restart diet-dashboard

# Check nginx
nginx -t && systemctl status nginx

# Full redeploy frontend only
cd /root/diet-app && git pull && npm run build && cp -r dist/. /home/xadmin/web/diet.swansi.site/public_html/

# Full redeploy everything
cd /home/xadmin/web/diet.swansi.site/app && git pull && npm install && npm run migrate && npm run build && pm2 restart diet-dashboard
```

---

## Important Notes

1. **Never commit `.env` files** — they contain secrets.
2. **Database migrations** are in `server/migrations/` and are idempotent (safe to re-run).
3. **Food database** — foods with `is_global = true` are visible to all users. Per-user foods have `user_id` set.
4. **AI keys** — stored per user in `user_settings` table, never in `.env`.
5. **Google Sign In** — requires `GOOGLE_CLIENT_ID` in both backend `.env` and frontend `.env`.
6. **PM2 process name** is `diet-dashboard` (ID 0).
