# NutriFlex Mobile App — Implementation Plan

> **Scheduled for execution after: April 25, 2026**

---

## Context

Convert the existing NutriFlex diet dashboard into a native iOS + Android app using the already-scaffolded Expo project in `mobile/`. The backend at `diet.swansi.site` remains unchanged — the mobile app consumes the same REST API as the web client.

**MVP Scope:** Daily Logger · Dashboard + Reports · Workout Tracker · Food Database + Weight Log

**Key discovery:** The `mobile/` scaffold already has login, register, auth context, API client with JWT refresh, and 5 tab screens partially implemented. Gaps: no charts on Dashboard, no AI features in Logger, no Workout screen, no Food Database screen, Settings needs merging into Profile.

---

## Phase 1 — Foundation Fixes (Day 1)

### 1. Create `mobile/app/(auth)/_layout.jsx` *(missing — causes Expo Router to crash)*
```jsx
import { Stack } from 'expo-router'
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

### 2. Fix `mobile/src/context/AuthContext.jsx`
- Change `require('../constants')` inside async function → static import at top
- Add `setSessionExpiredCallback(logout)` call on mount

### 3. Fix `mobile/src/api/client.js`
- Skip `Content-Type: application/json` when body is `FormData` (for photo upload)
- Export `setSessionExpiredCallback` + call it when refresh fails

### 4. Update `mobile/src/constants.js`
```js
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001'       // Android emulator; use LAN IP for physical device
  : 'https://diet.swansi.site'
```

### 5. Copy utils from web *(zero changes — pure JS)*
| From | To |
|------|----|
| `client/src/utils/dateUtils.js` | `mobile/src/utils/dateUtils.js` |
| `client/src/utils/nutritionCalc.js` | `mobile/src/utils/nutritionCalc.js` |
| `client/src/utils/constants.js` | `mobile/src/utils/constants.js` *(remove Lucide imports)* |

### 6. Create `mobile/src/context/LogContext.jsx`
Shared date state across Dashboard + Logger tabs:
```jsx
const LogContext = createContext(null)
export function LogProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(todayISO())
  return <LogContext.Provider value={{ selectedDate, setSelectedDate }}>{children}</LogContext.Provider>
}
export const useLogContext = () => useContext(LogContext)
```
Wrap root `_layout.jsx` in `<LogProvider>` alongside `<AuthProvider>`.

### 7. Install Dependencies
```bash
cd mobile
npx expo install victory-native react-native-svg @shopify/react-native-skia \
  expo-camera expo-haptics expo-linear-gradient \
  @react-native-community/datetimepicker
```

---

## Phase 2 — Tab Navigation Restructure

Replace `weight` + `settings` tabs with `workout` + `food`. Use `@expo/vector-icons` Ionicons.

| Tab | File | Icon | Features |
|-----|------|------|----------|
| Dashboard | `(tabs)/index.jsx` | `bar-chart` | Calorie ring, macro bars, weight mini-chart, Reports link |
| Logger | `(tabs)/logger.jsx` | `restaurant` | Meals, AI Quick Add, Photo Meal |
| Workout | `(tabs)/workout.jsx` | `barbell` | Session history, start/template, active tracker |
| Food & Weight | `(tabs)/food.jsx` | `nutrition` | Food database + weight log sub-tabs |
| Profile | `(tabs)/profile.jsx` | `person` | Profile form + AI Settings + Logout |

**New folder for active workout tracker (outside tabs — full-screen):**
```
mobile/app/workout/
  _layout.jsx          ← Stack, headerShown: false
  [sessionId].jsx      ← Active session tracker
```

---

## Phase 3 — Dashboard Upgrades (Day 2)

**File:** `mobile/app/(tabs)/index.jsx`

New components to create:

| Component | Path | Reference |
|-----------|------|-----------|
| `DateNavigator` | `src/components/ui/DateNavigator.jsx` | Shared with Logger via LogContext |
| `MacroRing` | `src/components/charts/MacroRing.jsx` | VictoryPie arc — calorie progress |
| `MacroBar` | `src/components/ui/MacroBar.jsx` | Protein/carbs/fat progress bars |
| `WeightLineChart` | `src/components/charts/WeightLineChart.jsx` | VictoryLine — last 14 days |

**Data:** `Promise.all([GET /api/daily-logs?date=TODAY, GET /api/weight-log?limit=14, GET /api/profile])` — no dedicated `/api/dashboard` endpoint exists.

Add **"View Reports →"** button → `router.push('/reports')`.

---

## Phase 4 — Logger Upgrades (Day 3)

**File:** `mobile/app/(tabs)/logger.jsx`

Extract to `src/components/logger/`:
- `FoodItem.jsx`, `MealSection.jsx`, `AddFoodModal.jsx`

Add new modals:
- **`AIQuickAddModal.jsx`** — text → `POST /api/ai/quick-add` → confirm list → log each item
  *(Reference: `client/src/components/logger/AIQuickAddModal.jsx`)*
- **`PhotoMealModal.jsx`** — `expo-image-picker` / `expo-camera` → multipart `POST /api/ai/photo-meal` via `client.upload()` → confirm list → log
  *(Reference: `client/src/components/logger/AIPhotoMealModal.jsx`)*

Add `DateNavigator` at top, synced via `LogContext.selectedDate`.

---

## Phase 5 — Food & Weight Tab (Day 4)

**File:** `mobile/app/(tabs)/food.jsx`

Internal chip toggle: **Foods** | **Weight**

**Foods sub-tab:**
- Debounced search bar → `GET /api/food-database?search=`
- `FlatList` of `FoodCard` (name, macros, swipe to delete, edit action)
- FAB "+" → `AddCustomFoodModal` form
- Reference: `client/src/components/fooddb/FoodDatabaseView.jsx`

**Weight sub-tab:**
- Move `weight.jsx` content → `src/components/WeightTab.jsx`
- Add `WeightLineChart` above the entry list
- Reference: `client/src/components/weight/WeightLogView.jsx`

---

## Phase 6 — Workout Screens (Days 5–6)

### `mobile/app/(tabs)/workout.jsx` *(new)*

Chip toggle: **Start** | **History**

- **Start:** Quick Start button + template list (`GET /api/workout-templates`) → "Start" → `POST /api/workout-sessions` → `router.push('/workout/' + sessionId)`
- **History:** `FlatList` of past sessions (`GET /api/workout-sessions?limit=20`) as `SessionCard` rows

### `mobile/app/workout/[sessionId].jsx` *(new — full-screen stack)*
Reference: `client/src/components/workout/WorkoutTracker.jsx`

- Header: title + live duration timer (counting up) + **"Finish"** button
- `FlatList` of `ExerciseBlock` components
- Each `ExerciseSet` row: set #, weight input, reps input, ✓ checkbox *(haptic on check)*
- "Add Set" per exercise + floating "Add Exercise" → `ExercisePickerModal`
- Finish: `PUT /api/workout-sessions/:id/finish` → `router.back()`

**Create `mobile/src/hooks/useWorkout.js`** — `startSession`, `finishSession`, `addExercise`, `addSet`, `updateSet`, `deleteSet`

---

## Phase 7 — Profile + Settings Merge (Day 7)

**File:** `mobile/app/(tabs)/profile.jsx`

Append below existing profile form:
- **"AI Settings"** card: provider chip selector + API key input → `PUT /api/settings`
  *(Reference: `client/src/components/settings/SettingsView.jsx`)*
- **"Account"** section: email display + **"Sign Out"** button

Remove `settings.jsx` from tab layout (no longer a tab).

---

## Phase 8 — Reports Screen (Day 8)

**File:** `mobile/app/reports.jsx` *(stack screen pushed from Dashboard)*

- Date range: preset chips ("Last 7", "Last 30", "Last 90") or custom date pickers
- Charts: `CalorieLineChart` (daily calories), `MacroPieChart` (aggregate split), `MacroBarChart` (daily macro breakdown)
- Average summary row: avg cal, protein, carbs, fat
- Aggregation: port from `client/src/components/reports/ReportsView.jsx` using copied `nutritionCalc.js`

---

## Phase 9 — Polish (Day 9)

- Skeleton loaders on all list + chart screens (replace spinners)
- `expo-haptics` feedback on: set complete ✓, food entry delete, weight log add
- `EmptyState` component for all empty lists
- Safe-area inset audit (iOS notch + Android status bar)
- Test on physical device (update `API_BASE_URL` to LAN IP in dev)

---

## EAS Build Setup

Create `mobile/eas.json`:
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" } },
    "preview":     { "distribution": "internal", "android": { "buildType": "apk" } },
    "production":  { "android": { "buildType": "app-bundle" } }
  }
}
```

Add to `mobile/app.json` plugins:
```json
["expo-camera",       { "cameraPermission": "Allow NutriFlex to access your camera for Photo Meal logging." }],
["expo-image-picker", { "photosPermission": "Allow NutriFlex to access your photos for meal logging." }]
```

Build commands:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview    # APK for physical device testing
eas build --platform all --profile production     # App Store / Play Store builds
```

---

## Critical Files Reference

| File | Action |
|------|--------|
| `mobile/app/(auth)/_layout.jsx` | **Create** (currently missing) |
| `mobile/app/(tabs)/_layout.jsx` | **Modify** — add workout + food, remove weight + settings tabs |
| `mobile/src/api/client.js` | **Modify** — FormData support + session-expired callback |
| `mobile/src/constants.js` | **Modify** — production API URL |
| `mobile/src/context/LogContext.jsx` | **Create** — shared date state |
| `mobile/app/(tabs)/workout.jsx` | **Create** — new screen |
| `mobile/app/workout/_layout.jsx` | **Create** — stack layout |
| `mobile/app/workout/[sessionId].jsx` | **Create** — active tracker |
| `mobile/app/(tabs)/food.jsx` | **Create** — food db + weight |
| `mobile/app/reports.jsx` | **Create** — reports screen |
| `mobile/app/(tabs)/profile.jsx` | **Modify** — merge settings in |

---

## Verification Checklist

- [ ] `cd mobile && npx expo start` — login flow works, all 5 tabs load
- [ ] Dashboard shows calorie ring + macro bars with real API data
- [ ] Logger → AI Quick Add → entries appear in meal list
- [ ] Logger → Photo Meal → photo uploaded, entries confirmed + logged
- [ ] Workout → Start → add exercise → log sets → Finish → appears in History
- [ ] Food tab → search returns results → add custom food persists
- [ ] Weight tab → add weight entry → chart updates
- [ ] Dashboard "View Reports" → charts render for Last 7 / Last 30 days
- [ ] Profile → change AI provider + key → confirmed working on web Settings page
- [ ] `eas build --platform android --profile preview` → APK installs and runs on device
