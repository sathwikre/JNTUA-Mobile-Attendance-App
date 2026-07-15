# AGENTS.md — OTA System Deep Dive

This document explains how the Over-The-Air update system works internally, how each piece connects, and how to extend it. Written for developers who need to understand, modify, or debug the OTA pipeline.

---

## System Overview

The OTA system has four layers:

```
Layer 1: Server          Stores the latest scraper script + UI config
Layer 2: Service         Fetches from server, caches locally, handles fallbacks
Layer 3: Context         Distributes config + script to React components
Layer 4: Components      Read config via hook, render dynamic UI
```

---

## Layer 1 — Server

Two interchangeable backends serve the same purpose: return a JSON payload containing the scraper script and UI configuration.

### Flask Server (`server/app.py`)

**GET `/api/ota/latest`** — Called by the app every 4 hours.

Request:
```
GET /api/ota/latest?appVersion=1.0.0&platform=android
```

Response:
```json
{
  "version": 3,
  "scraperScript": "(function() { ... })();\ntrue;",
  "config": {
    "colors": { "safe": "#22C55E", "caution": "#EAB308", "warning": "#F59E0B", "danger": "#EF4444", "accent": "#7C3AED", "info": "#6366F1" },
    "labels": { "safe": "Safe", "caution": "Caution", "risk": "At Risk", "low": "Low" },
    "thresholds": { "safe": 77, "minimum": 75, "warning": 70 },
    "accentColor": "#7C3AED",
    "portalUrl": "https://jntuaceastudents.classattendance.in/",
    "showQuickTip": true,
    "quickTipText": "Maintain 75% attendance to stay eligible for exams."
  },
  "minAppVersion": "1.0.0",
  "changelog": "Fixed table selector",
  "updatedAt": "2026-07-16T10:30:00"
}
```

**POST `/api/ota/update`** — Push a new update. Version auto-increments.

Request:
```json
{
  "scraperScript": "(function(){ ... })();\ntrue;",
  "config": { "thresholds": { "minimum": 70 } },
  "changelog": "Lowered minimum to 70%"
}
```

Response:
```json
{
  "message": "OTA update v4 published successfully",
  "version": 4,
  "changelog": "Lowered minimum to 70%",
  "updatedAt": "2026-07-16T12:00:00"
}
```

Partial config updates are merged. You only need to send the fields you want to change.

**GET `/api/ota/status`** — View current version without the full script payload.

**POST `/api/ota/rollback`** — Revert to a previous version (requires `ota_history.json`).

### Vercel Serverless (`server/api/ota.js`)

A simpler alternative. The OTA data is hardcoded in `LATEST_OTA`. To push an update, edit the object and redeploy. Less flexible than Flask but zero infrastructure.

### Data Storage

The Flask server uses `ota_data.json` as a simple file-based store. For production, replace this with a database (SQLite, PostgreSQL, or even a hosted JSON blob). The load/save functions are the only touch points:

```python
def load_ota_data():    # Read from store
def save_ota_data(data): # Write to store
```

Swap these to use your database of choice without changing any route logic.

---

## Layer 2 — Service (`lib/otaService.ts`)

The `OTAService` class is a singleton that handles all network and cache operations.

### Key Methods

```
fetchLatestUpdate()    → GET /api/ota/latest, returns OTAUpdate | null
saveToCache(update)    → Write OTAUpdate to AsyncStorage
readCache()            → Read OTACache from AsyncStorage
shouldFetch()          → Check if 4+ hours since last fetch
getActiveScript(bundled) → Resolve: remote → cache → bundled
getActiveConfig()      → Resolve: cache → defaults
forceRefresh()         → Fetch regardless of interval
clearCache()           → Delete cached data (on logout, etc.)
```

### Fallback Chain for Scraper Script

```
getActiveScript(bundledScript)
│
├── shouldFetch() returns true (4+ hours since last fetch)?
│   ├── YES → fetchLatestUpdate()
│   │   ├── SUCCESS → saveToCache(update), return update.scraperScript
│   │   └── FAILED (no internet, server down, timeout) → fall through
│   └── NO → fall through
│
├── readCache()
│   ├── HAS CACHE → return cache.scraperScript
│   └── NO CACHE → fall through
│
└── return bundledScript (shipped with the app binary)
```

### Fallback Chain for Config

```
getActiveConfig()
│
├── readCache()
│   ├── HAS CACHE → return { ...DEFAULT_OTA_CONFIG, ...cache.config }
│   └── NO CACHE → fall through
│
└── return DEFAULT_OTA_CONFIG (hardcoded in otaDefaults.ts)
```

The merge `{ ...DEFAULT_OTA_CONFIG, ...cache.config }` ensures that if the server only sends a partial config (e.g., only changed thresholds), the remaining fields still come from defaults instead of being undefined.

### Cache Structure (AsyncStorage)

Key: `ota_cache`
```json
{
  "version": 3,
  "scraperScript": "(function(){ ... })();\ntrue;",
  "config": { ... },
  "styleScript": "...",
  "cachedAt": 1721102400000
}
```

Key: `ota_last_fetch`
```
"1721102400000"
```

### Constants

| Constant | Value | Purpose |
|---|---|---|
| `OTA_CACHE_KEY` | `"ota_cache"` | AsyncStorage key for cached data |
| `OTA_LAST_FETCH_KEY` | `"ota_last_fetch"` | AsyncStorage key for timestamp |
| `FETCH_INTERVAL_MS` | `14400000` (4 hours) | Minimum time between fetches |
| `OTA_API_URL` | Configurable | Your Flask server URL |
| Timeout | 10000ms | Fetch aborts after 10 seconds |

---

## Layer 3 — Context (`context/OTAContext.tsx`)

`OTAProvider` wraps the app and distributes OTA data via React Context.

### Setup

```tsx
// index.tsx
<OTAProvider bundledScript={SCRAPER_SCRIPT}>
  <IndexInner />
</OTAProvider>
```

The `bundledScript` prop is the fallback used when no remote or cached script exists.

### Context Value

```typescript
interface OTAContextValue {
  config: OTAConfig;     // Active UI config (merged defaults + OTA)
  script: string;        // Active scraper script
  loading: boolean;      // True while OTA is fetching
  version: number;       // OTA version number (0 = bundled only)
  refresh: () => Promise<void>;  // Force refresh from server
}
```

### Initialization Flow

1. `OTAProvider` mounts, calls `load()`
2. `load()` runs in parallel: `getActiveScript()` + `getActiveConfig()`
3. Results are set into state: `setScript()`, `setConfig()`, `setVersion()`
4. If everything fails, falls back to `bundledScript` and `DEFAULT_OTA_CONFIG`
5. `loading` is set to `false`

### Force Refresh

The `refresh()` function calls `otaService.forceRefresh()`, which bypasses the 4-hour interval. Use this for a "Check for Updates" button:

```tsx
const { refresh } = useOTAConfig();

<TouchableOpacity onPress={refresh}>
  <Text>Check for Updates</Text>
</TouchableOpacity>
```

---

## Layer 4 — Components

All dynamic components read from `useOTAConfig()` instead of hardcoding values.

### How Components Use OTA Config

**StatsHeader:**
- `config.thresholds` → determines which zone the overall % falls into
- `config.colors[zone]` → ring color, glow color, text color
- `config.labels[zone]` → status label text ("Safe", "Caution", etc.)
- `config.colors.accent` / `config.colors.safe` / `config.colors.info` → pill colors

**SubjectCard:**
- `config.thresholds` → zone calculation per subject
- `config.colors[zone]` → progress bar, percentage text, badge colors
- `config.labels[zone]` → badge text
- `config.thresholds.minimum` → skip/need calculation

**GradientHeader:**
- `config.accentColor` → header gradient color

**SubjectDetailModal:**
- `config.thresholds` → zone calculation, skip/need math
- `config.colors[zone]` → modal accent colors

**QuickTip:**
- `config.showQuickTip` → whether the card renders at all
- `config.quickTipText` → custom override text
- `config.thresholds.minimum` → default tip text references the minimum %

**ActionButtons:**
- `config.accentColor` → button icon background (if wired)

### Zone Calculation Logic

Every component that shows zone-based colors uses the same logic:

```typescript
let zone: 'safe' | 'caution' | 'risk' | 'danger' = 'danger';
if (percentage >= thresholds.safe)     zone = 'safe';
else if (percentage >= thresholds.minimum) zone = 'caution';
else if (percentage >= thresholds.warning) zone = 'risk';
// else: danger
```

The zone is then used to look up:
- `colors[zone]` → the hex color
- `labels[zone]` → the display text
- Background tints derived from the zone (hardcoded light versions)

### Skip/Need Calculation

```typescript
const minPct = thresholds.minimum / 100;
let canSkip = 0, needAttend = 0;

if (percentage >= thresholds.minimum) {
  // How many classes can be missed while staying above minimum?
  canSkip = Math.floor((present / minPct) - total);
  if (canSkip < 0) canSkip = 0;
} else {
  // How many consecutive classes must be attended to reach minimum?
  needAttend = Math.ceil((minPct * total - present) / (1 - minPct));
  if (needAttend < 0) needAttend = 0;
}
```

---

## TypeScript Interfaces (`lib/otaTypes.ts`)

### OTAUpdate — Server Response

```typescript
interface OTAUpdate {
  version: number;           // Incremented version number
  scraperScript: string;     // JS to inject into WebView
  styleScript?: string;      // Optional CSS/JS style overrides
  config: OTAConfig;         // UI configuration
  minAppVersion?: string;    // Force Play Store update if app is older
  changelog?: string;        // Human-readable change description
  scriptHash?: string;       // SHA256 of scraperScript (verification)
}
```

### OTAConfig — UI Configuration

```typescript
interface OTAConfig {
  colors: OTAColors;         // Zone and brand colors
  labels: OTALabels;         // Status badge text
  thresholds: OTAThresholds; // Zone boundary percentages
  accentColor: string;       // Header / brand color
  portalUrl: string;         // College portal URL
  showQuickTip: boolean;     // Show/hide tip card
  quickTipText?: string;     // Custom tip text
}
```

### OTACache — AsyncStorage Structure

```typescript
interface OTACache {
  version: number;
  scraperScript: string;
  config: OTAConfig;
  styleScript?: string;
  cachedAt: number;          // Unix timestamp
}
```

### Sub-interfaces

```typescript
interface OTAColors {
  safe: string;      // '#22C55E'
  caution: string;   // '#EAB308'
  warning: string;   // '#F59E0B'
  danger: string;    // '#EF4444'
  accent: string;    // '#7C3AED'
  info: string;      // '#6366F1'
}

interface OTALabels {
  safe: string;      // 'Safe'
  caution: string;   // 'Caution'
  risk: string;      // 'At Risk'
  low: string;       // 'Low'
}

interface OTAThresholds {
  safe: number;      // 77 — above this = safe zone
  minimum: number;   // 75 — above this = passing (caution zone)
  warning: number;   // 70 — above this but below minimum = risk zone
  // Below warning = danger zone
}
```

---

## How to Extend

### Adding a New OTA-Controllable Field

1. Add the field to `OTAConfig` in `lib/otaTypes.ts`
2. Add a default value in `lib/otaDefaults.ts`
3. Read it in the component via `useOTAConfig()`
4. Add it to the Flask server's default data in `server/app.py`
5. Push it via `POST /api/ota/update`

Example — adding a `maxSubjects` field that limits how many subjects are shown:

```typescript
// otaTypes.ts — add to OTAConfig
maxSubjects?: number;  // 0 = show all

// otaDefaults.ts — add default
maxSubjects: 0,

// AttendanceScreen.tsx — read it
const { config } = useOTAConfig();
const displayedSubjects = config.maxSubjects
  ? subjects.slice(0, config.maxSubjects)
  : subjects;
```

### Adding a New OTA-Driven Component

1. Create the component file in `components/`
2. Import and call `useOTAConfig()` at the top
3. Read whatever config fields you need
4. Add the component to `AttendanceScreen.tsx`

The context is already provided at the app root — no additional setup needed.

### Switching from Flask to Another Backend

The app only cares about the response shape from `GET /api/ota/latest`. It does not care what server produces it. You can swap Flask for:

- Express.js / Fastify (Node.js)
- FastAPI / Django (Python)
- Cloudflare Workers
- Firebase Remote Config
- AWS Lambda + API Gateway

As long as the endpoint returns a JSON object matching the `OTAUpdate` interface, the app will work.

### Adding Version History / Rollback on Flask

The Flask server includes a `POST /api/ota/rollback` endpoint that reads from `ota_history.json`. To enable history tracking, modify `save_ota_data()` to also append to the history file:

```python
def save_ota_data(data):
    # Save current to history before overwriting
    if os.path.exists(OTA_DATA_FILE):
        with open(OTA_DATA_FILE, 'r') as f:
            old = json.load(f)
        history_file = 'ota_history.json'
        history = []
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                history = json.load(f)
        history.append(old)
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)

    data['updatedAt'] = datetime.now().isoformat()
    with open(OTA_DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
```

---

## Debugging

### Check OTA Status from the App

```typescript
const { version, loading, config } = useOTAConfig();
console.log('OTA Version:', version);          // 0 = bundled only
console.log('Loading:', loading);              // true during fetch
console.log('Thresholds:', config.thresholds); // Current active thresholds
```

### Check OTA Status from the Server

```bash
curl https://your-server.com/api/ota/status
```

### Force Refresh from the App

```typescript
const { refresh } = useOTAConfig();
await refresh();  // Bypasses 4-hour interval
```

### Clear OTA Cache

```typescript
import { otaService } from '../lib/otaService';
await otaService.clearCache();  // Deletes cached data, reverts to defaults
```

### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| App always uses bundled script | `OTA_API_URL` is wrong or server is down | Check URL, verify server responds to curl |
| Config changes not appearing | Less than 4 hours since last fetch | Call `refresh()` or wait |
| App crashes after OTA update | Invalid scraper script was pushed | Roll back via `/api/ota/rollback` |
| Old config after server update | Browser/CDN caching | Add `Cache-Control: no-cache` headers (Flask already does this) |
| AsyncStorage read fails | Storage module not linked | Verify `@react-native-async-storage/async-storage` is installed and linked |

---

## Security Model

### Threat: Malicious Script Injection

If an attacker gains access to `/api/ota/update`, they can inject arbitrary JavaScript into every user's WebView. Mitigations:

1. **Protect the update endpoint** with `X-Admin-Key` header (already implemented in Flask)
2. **Use HTTPS** so the script cannot be tampered with in transit
3. **Set `minAppVersion`** if a critical vulnerability is discovered — forces users to update from the Play Store where the fix is in the binary
4. **Optional: Script hashing** — set `scriptHash` to the SHA256 of `scraperScript`, verify on the client before execution

### Threat: Server Compromise

If the Flask server is compromised, the attacker controls all OTA data. Mitigations:

1. **Rate limit** the `/api/ota/latest` endpoint to prevent abuse
2. **Log all updates** with timestamps and source IP
3. **Use a read-only replica** for the `/api/ota/latest` endpoint (the app-facing route) and a separate admin route with authentication
4. **Monitor version changes** — set up an alert when version increments unexpectedly

### Public vs Admin Endpoints

| Endpoint | Auth Required | Reason |
|---|---|---|
| `GET /api/ota/latest` | No | The app needs unauthenticated access |
| `POST /api/ota/update` | Yes (`X-Admin-Key`) | Controls what code runs on user devices |
| `GET /api/ota/status` | Optional | Low risk, but consider adding auth |
| `POST /api/ota/rollback` | Yes (`X-Admin-Key`) | Same sensitivity as update |
