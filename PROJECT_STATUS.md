# NutriFlex — Full Project Status & Documentation

**Last updated:** 2026-04-21  
**Live site:** https://diet.swansi.site  
**Server:** Hetzner VPS — 89.167.109.1 (SSH: `root@89.167.109.1`, key: `C:/Users/sudar/.ssh/hetzner_key`)  
**DB:** PostgreSQL via Supabase (project `bctjqarjqhjewvykyjqc`)  
**PM2 process:** `diet-dashboard`  
**Repo:** `/home/xadmin/web/diet.swansi.site/app/` on VPS  

---

## 1. Project Overview

NutriFlex is a self-hosted nutrition + fitness tracking platform. It consists of:

| Layer | Stack | Notes |
|-------|-------|-------|
| **Web frontend** | React 18 + Vite + Tailwind CSS | Compiled into `server/public/` |
| **Backend** | Node.js + Express (port 3001) | Serves both API and React SPA |
| **Database** | PostgreSQL (Supabase hosted) | 18 tables, RLS enabled |
| **Mobile** | Expo SDK 52 / React Native 0.76.9 | APK only (Android), crashes unresolved |
| **AI** | Gemini 2.5 Flash / GPT-4o / Claude Sonnet 4.6 | Per-user API keys in DB |

---

## 2. Architecture

```
diet-dashboard/
├── client/                  # React 18 frontend (Vite)
│   └── src/
│       ├── components/      # UI components by feature
│       │   ├── auth/        # Login, Register screens
│       │   ├── dashboard/   # DashboardView
│       │   ├── logger/      # Daily food logger (main feature)
│       │   ├── fooddb/      # Food database management
│       │   ├── weight/      # Weight log
│       │   ├── workout/     # Workout tracker
│       │   ├── planner/     # AI Meal Planner
│       │   ├── reports/     # Charts & analytics
│       │   ├── settings/    # AI provider settings
│       │   ├── profile/     # User profile
│       │   └── ui/          # Shared UI components
│       ├── hooks/           # Custom React hooks
│       ├── context/         # AuthContext, AppContext
│       ├── api/             # Axios client (client.js)
│       └── utils/           # nutritionCalc, dateUtils, constants
│
├── server/                  # Express backend
│   ├── routes/              # 18 route files
│   ├── middleware/          # auth.js, requireRole.js
│   ├── services/            # aiService.js + 3 AI adapters
│   ├── migrations/          # 005 SQL migrations
│   └── public/              # Built React app (git-ignored)
│
├── mobile/                  # Expo React Native app
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/          # Login, Register
│   │   └── (tabs)/          # 5 tab screens
│   └── src/                 # API client, AuthContext, constants
│
└── uploads/meals/           # AI photo meal image storage
```

---

## 3. Database Schema (18 tables, all RLS-enabled)

### Core tables
| Table | Purpose |
|-------|---------|
| `users` | Auth — email, password_hash (nullable for OAuth), name, role |
| `user_oauth` | Google/Apple OAuth rows (provider, provider_id) |
| `profiles` | Body stats — weight, height, waist, dob, name |
| `user_settings` | Per-user AI keys (masked), preferred_ai_provider |
| `daily_logs` | Food log entries — food_name, macros, meal_type, consumed, sort_order |
| `food_database` | Food items — macros per base_quantity, is_global flag |
| `weight_log` | Daily weight entries |
| `cheat_days` | Dates marked as cheat days |

### Workout tables
| Table | Purpose |
|-------|---------|
| `exercises` | Global + custom exercise library (300+ seeded) |
| `workout_templates` | Saved routines |
| `template_exercises` | Exercises within a template |
| `workout_sessions` | Logged workout sessions |
| `session_sets` | Individual sets (weight, reps, RPE) |
| `personal_records` | Auto-updated PR per exercise |
| `body_measurements` | Circumference measurements |

### Coach/Social tables
| Table | Purpose |
|-------|---------|
| `coach_clients` | Coach–member relationships |
| `assigned_programs` | Templates assigned to clients |
| `messages` | Coach–client DMs |
| `push_tokens` | FCM tokens for push notifications |

### Migrations applied
- `001_init.sql` — core tables
- `002_workout_coach.sql` — workout + coach tables, exercises, 300 seeded exercises
- `003_oauth.sql` — user_oauth table, password_hash nullable, name column
- `004_exercise_constraints.sql` — unique constraint fixes on exercises
- `005_global_food.sql` — `is_global` column on food_database

---

## 4. API Routes (all under `/api/`)

| Route file | Endpoints |
|-----------|-----------|
| `auth.js` | POST /auth/register, /auth/login, /auth/refresh, /auth/logout |
| `socialAuth.js` | POST /auth/google (Google Sign-In via idToken) |
| `profile.js` | GET/PUT /profile |
| `settings.js` | GET/PUT /settings (AI keys, masked) |
| `dailyLogs.js` | GET/POST/PUT/DELETE /daily-logs |
| `foodDatabase.js` | GET/POST/PUT/DELETE /food-database (supports is_global) |
| `weightLog.js` | GET/POST/DELETE /weight-log |
| `cheatDays.js` | GET/POST/DELETE /cheat-days |
| `ai.js` | POST /ai/quick-add, /ai/photo-meal, /ai/meal-planner, /ai/enrich |
| `exercises.js` | GET/POST/PUT/DELETE /exercises |
| `workoutTemplates.js` | Full CRUD /workout-templates |
| `workoutSessions.js` | Full CRUD /workout-sessions, sets sub-routes |
| `personalRecords.js` | GET /personal-records |
| `bodyMeasurements.js` | GET/POST/DELETE /body-measurements |
| `coachClients.js` | Coach–client relationship management |
| `assignedPrograms.js` | Program assignment |
| `messages.js` | Coach–client messaging |
| `dataManagement.js` | CSV import/export |
| `pushTokens.js` | FCM token registration |

---

## 5. Web Frontend Features (COMPLETE ✅)

### Auth
- Email + password login/register with JWT (access + refresh token)
- Google Sign-In (GSI library, `POST /api/auth/google`)
- Token auto-refresh on 401 via Axios interceptor
- Logout clears all tokens

### Daily Logger
- Drag-and-drop food items between meal sections (DnD Kit)
- 6 meal types: Breakfast, Lunch, Dinner, Snacks, Pre-Workout, Post-Workout
- Consumed toggle per item
- Quantity edit modal (right-click → Edit) ← **fixed 2026-04-21**
- Add Food modal with quantity input ← **fixed 2026-04-21**
- Delete entries
- Bulk select + bulk delete
- Copy meals from another date (CopyMealModal)
- **AI Quick Add** — natural language → AI identifies foods → batch log
- **Photo Meal** — upload/capture image → AI identifies foods → log
- Date navigation (← Today →)

### Food Database
- Browse all foods (own + global foods)
- Search with `pg_trgm` fuzzy match (backend)
- Filter chips: All / My Foods / Global Foods
- Add custom food (full macro form)
- Edit / Delete own foods only
- "Share with all users" toggle (`is_global`)
- AI Enrich — auto-fill macros from AI
- CSV import/export
- Global badge on shared foods

### AddFoodModal (logger search)
- **Fuse.js client-side search** — loads all foods once, instant results
- `ignoreLocation: true` — mid-string matching ("paneer" finds "McSpicy Paneer Burger")
- `threshold: 0.4` — typo tolerance
- No API calls during typing

### Dashboard
- Calorie goal ring (consumed vs goal)
- Macro breakdown bars (protein, carbs, fat)
- Recent meals list
- Clickable meal boxes navigate to logger
- Date navigation

### Reports
- Line chart: daily calories over time
- Bar chart: macro breakdown per day
- Pie chart: macro split
- Date range presets (7 / 30 / 90 days) + custom range

### Weight Log
- Log daily weight (kg)
- Line chart — last 14 / 30 / 90 days
- History list with delete

### Workout Tracker
- Browse 300+ exercise library (search + filter by muscle/equipment)
- Create custom exercises
- Build workout templates (drag-reorderable exercise list)
- Log workout sessions — sets, reps, weight, RPE
- Rest timer
- Personal records auto-detected
- Session history

### Meal Planner (AI)
- Generate weekly meal plan via AI
- Specify calories, macros, preferences, restrictions

### Settings
- Provider selection: Gemini / OpenAI / Claude
- API key input per provider (masked, stored per-user in DB)
- Shows provider table: model name, key source URL

### Profile
- Name, DOB, weight, height, waist
- Email display

### AI Setup Banner
- Shown above all AI features when no key is configured
- "Go to Settings →" link

### Security (Supabase RLS)
- All 18 tables have RLS enabled
- `deny_direct_api_access` policy on all tables — PostgREST blocked
- Express backend uses `service_role` — bypasses RLS, unaffected

---

## 6. Completed Edits (Chronological)

| Commit | Description |
|--------|-------------|
| `d6cf488` | Initial production deploy to diet.swansi.site |
| `eab1aa9` | Settings page — AI provider table with model names + key source links |
| `02f196b` | Google Sign-In — OAuth flow, user_oauth table, per-user isolation |
| `024a441` | Fix production login bug — API guard in Express, response validation in AuthContext |
| `33e277f` | Complete UI rebuild, dark/light mode, rename to NutriFlex, icons |
| `8641576` | Workout feature — sessions, sets, templates, exercises, PRs |
| `20008d7` | Dashboard protein gauge and macro legend font size improvements |
| `9df6144` | Shared global food database — `is_global` column, filter chips, global badge |
| `4260809` | Fuzzy food search — `pg_trgm` word_similarity on backend |
| `761bf97` | Specific login error messages + clickable dashboard meal boxes |
| `2622891` | **Fuse.js** client-side fuzzy search in AddFoodModal — instant, no API calls during typing |
| `d6ffc83` | Mobile: fix all API endpoints + field names, AI Quick Add in logger |
| `828640f` | Mobile: add missing expo-asset dependency + EAS project ID |
| `fd7bad5` | Mobile: fix RN + safe-area versions for Expo 52 |
| `9ba3a5e` | Mobile: rename app to NutriFlex in app.json |
| `86ed36d` | Mobile: disable new architecture (`newArchEnabled: false`) |
| `095f89b` | Mobile: 1024×1024 PNG assets, root ErrorBoundary, SecureStore guard |
| `6ee7384` | Mobile: diagnostic build — stripped to bare minimum to isolate crash |
| `b8e429b` | **Fix quantity inputs snapping to 0** in AddFoodModal + FoodLogItem edit modal |

---

## 7. Pending Issues

### 🔴 CRITICAL — Mobile App Crashes on Android

**Status:** Under active diagnosis  
**Symptom:** App crashes 1–2 seconds after launch on Android (immediate exit, no error screen)  
**Device:** User's personal Android phone  

**Attempted fixes:**
1. ✅ `newArchEnabled: false` — built, installed, still crashes
2. ✅ 1024×1024 PNG assets (was 4×4 pixels) — built, installed, still crashes
3. ✅ Root ErrorBoundary — still crashes (crash is native, before JS mounts)
4. ✅ Removed `react-native-reanimated/plugin` from babel.config.js
5. ✅ Removed `GestureHandlerRootView` from root layout
6. ✅ Stripped all screens to bare `<View><Text>` (no imports from native modules)
7. 🔄 **Diagnostic APK in progress** — bare-minimum build to determine if crash is in Expo itself or app code

**Latest diagnostic APK:**  
`https://expo.dev/artifacts/eas/tnetN1ByEZMQzCcQGBtaGy.apk`  
(Build ID: `dd9dab7a`, commit `6ee7384`)

**What the diagnostic build contains:**
- Root layout: just `<Slot />` from expo-router (no GestureHandlerRootView, no AuthProvider)
- All 5 tab screens: plain `<View><Text>Label</Text></View>` only
- All auth screens: plain `<View><Text>` only
- No imports from: safe-area-context, reanimated, API client, SecureStore
- No babel reanimated plugin
- `newArchEnabled: false` preserved

**Expected outcomes:**
- If diagnostic APK **opens** → crash was in our app code. Restore full screens one by one.
- If diagnostic APK **still crashes** → crash is in Expo Router or core React Native itself on this device. Next step: check Android version, try `eas build --profile development` with dev client for crash logs.

**EAS Build history:**
| Build ID | APK | What was tested | Result |
|----------|-----|-----------------|--------|
| `d90f059` | (expired) | First build, default config | Crashed |
| `007ecda3` | `4xL15JRDXboA9tWYzQZv8.apk` | newArchEnabled: false | Crashed |
| `bb0b2d27` | (older) | Proper assets + ErrorBoundary | Crashed |
| `dd9dab7a` | `tnetN1ByEZMQzCcQGBtaGy.apk` | **Bare minimum** (no native modules) | ⏳ User testing |

**Mobile app current state (diagnostic stripped version):**
- All screens are stubs — no real functionality
- Auth removed from root layout
- Once crash is fixed, all real screens need to be restored from git history (commit `086ed36d` has the real screens)

---

### 🟡 MEDIUM — Mobile App Feature Gaps (once crash fixed)

The mobile app needs these screens restored and completed:

| Screen | Status | Notes |
|--------|--------|-------|
| Login / Register | ⚠️ Stubbed | Was working before diagnostic strip — restore from `86ed36d` |
| Dashboard | ⚠️ Stubbed | Real version in git — had API calls, macro display |
| Food Logger | ⚠️ Stubbed | Real version had meal sections, AI Quick Add |
| Weight Log | ⚠️ Stubbed | Real version had list + input form |
| Profile | ⚠️ Stubbed | Real version had form + logout |
| Settings | ⚠️ Stubbed | Real version had AI provider + key input |
| Workout tab | ❌ Not built | Planned in original spec |
| Food Database tab | ❌ Not built | Planned in original spec |
| Reports screen | ❌ Not built | Planned in original spec |

**Missing dependencies (not yet installed in mobile/):**
- `victory-native` + `react-native-svg` + `@shopify/react-native-skia` — for charts
- `expo-camera` — for photo meal feature
- `expo-haptics` — for haptic feedback
- `expo-linear-gradient` — for gradient buttons
- `@react-native-community/datetimepicker` — for date pickers

---

### 🟡 MEDIUM — Mobile Auth Not Integrated

When the crash is fixed and real screens are restored, the root layout needs `AuthProvider` and nav guards re-added:

```jsx
// Restore in mobile/app/_layout.jsx:
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
// ... RootLayoutNav with useEffect for auth routing
```

---

### 🟡 MEDIUM — LogContext Not Created

The plan calls for a shared `LogContext` so the Dashboard and Logger tabs share `selectedDate`. Currently each screen would manage its own date. File to create: `mobile/src/context/LogContext.jsx`.

---

### 🟢 LOW — Supabase `rls_enabled_no_policy` Advisory

After applying `005_rls_policies` migration, the `rls_enabled_no_policy` INFO-level advisory from Supabase may still show (these are informational, not security issues). The app is unaffected — Express uses `service_role` which bypasses RLS. This can be ignored or verified via Supabase dashboard.

---

### 🟢 LOW — Server `.env` Has Unused `GEMINI_API_KEY`

The production `.env` on the VPS has a `GEMINI_API_KEY` env var. The app never reads it (aiService.js reads per-user keys from DB only). It's misleading but harmless. Can be removed manually:
```bash
ssh root@89.167.109.1
sed -i '/^GEMINI_API_KEY=/d' /home/xadmin/web/diet.swansi.site/app/.env
pm2 restart diet-dashboard
```

---

### 🟢 LOW — Large JS Bundle Chunks

Build warning: `recharts-B7nHnZKD.js` (553 KB) and `firebase-BU3AsMrv.js` (600 KB) exceed 500 KB. These can be code-split with dynamic imports in the future. App works fine — this is a performance optimization only.

---

## 8. Deployment Process

### Web (diet.swansi.site)
```bash
# Local
npm run build          # builds React → server/public/
git add -A && git commit -m "..."
git push origin master

# Server (auto via git pull)
ssh root@89.167.109.1
cd /home/xadmin/web/diet.swansi.site/app
git pull origin master
npm run build
pm2 restart diet-dashboard
```

### Mobile (Android APK)
```bash
cd mobile
eas build --platform android --profile preview --non-interactive
# Download APK from expo.dev after ~15 min
# Install on device (allow unknown sources)
```

### Database Migrations
```bash
# Local dev
npm run migrate    # runs all pending migrations via migrate.js

# Production
ssh root@89.167.109.1
cd /home/xadmin/web/diet.swansi.site/app
npm run migrate
```

---

## 9. Environment Variables

### Server `.env` (on VPS at `/home/xadmin/web/diet.swansi.site/app/.env`)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...@db.bctjqarjqhjewvykyjqc.supabase.co:5432/postgres
JWT_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>
GOOGLE_CLIENT_ID=<google oauth client id>
# Note: AI keys are NOT here — stored per-user in user_settings table
```

### Mobile `src/constants.js`
```js
export const API_BASE_URL = 'https://diet.swansi.site'
```

---

## 10. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Fuse.js in AddFoodModal (not backend search) | Zero network calls during typing; 142 foods easily fits in memory; `ignoreLocation: true` gives better mid-string matches than pg_trgm |
| pg_trgm stays in FoodDatabaseView | Full-text browse page; server-side search is appropriate there |
| Per-user AI keys in DB (not .env) | Multi-user isolation; no key shared between users |
| express serves React SPA | Single process, simpler deployment; no separate nginx routing to Node needed |
| Supabase deny-all RLS policies | App uses service_role (bypasses RLS); blocking PostgREST direct access adds security without breaking anything |
| newArchEnabled: false for mobile | Fabric architecture causes native crashes with current dependency set |

---

## 11. Fuse.js Config (AddFoodModal)

```js
{
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'brand_name', weight: 0.3 },
  ],
  threshold: 0.4,       // tolerates typos
  ignoreLocation: true, // matches anywhere in string (critical for "paneer" → "McSpicy Paneer Burger")
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
}
```

---

## 12. Known Working Features (Verified on diet.swansi.site)

- ✅ Email register + login
- ✅ Google Sign-In
- ✅ Daily food logging (all meal types)
- ✅ Fuse.js food search (instant, typo-tolerant, mid-string)
- ✅ Quantity edit — add modal and edit modal (fixed 2026-04-21)
- ✅ AI Quick Add (natural language food logging)
- ✅ AI Photo Meal (image upload → food identification)
- ✅ AI Meal Planner
- ✅ Global food database with sharing
- ✅ Workout tracker (sessions, sets, PRs)
- ✅ Weight log + charts
- ✅ Reports (calorie + macro charts)
- ✅ Settings — per-user AI key storage (Gemini / OpenAI / Claude)
- ✅ AI setup warning banner when no key configured
- ✅ CSV import/export
- ✅ Dark mode UI
- ✅ Drag-and-drop meal reordering

---

## 13. Next Steps (Priority Order)

1. **[URGENT] Test diagnostic mobile APK** — install `tnetN1ByEZMQzCcQGBtaGy.apk`, report if it opens or still crashes
2. **[If opens] Restore real mobile screens** — add back auth, real tab screens, API integration
3. **[If still crashes] Escalate mobile crash** — try `eas build --profile development` for full native crash logs, check Android OS version
4. **Mobile feature completion** — workout tab, food database tab, charts, reports
5. **Bundle size optimization** — code-split recharts + firebase chunks
6. **Push notifications** — FCM via expo-notifications (backend route exists, frontend missing)
7. **Google Play Store listing** — once mobile is stable
