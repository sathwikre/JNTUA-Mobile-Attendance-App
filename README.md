# Attendance Tracker

A React Native attendance tracker that scrapes a college attendance portal via WebView and displays a polished, zone-colored dashboard with OTA (Over-The-Air) update support.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  React Native App                                   │
│                                                     │
│  index.tsx                                          │
│  ├── WebView loads college portal                   │
│  ├── Injects scraper JS on login                    │
│  └── Displays AttendanceScreen on success           │
│                                                     │
│  OTAProvider (React Context)                        │
│  ├── Fetches config + script from remote API        │
│  ├── Caches to AsyncStorage (4-hour interval)       │
│  └── Falls back to bundled defaults                 │
│                                                     │
│  Components read from useOTAConfig()                │
│  ├── Colors, labels, thresholds → dynamic           │
│  └── Scraper script → injected into WebView         │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. App opens `WebView` pointing to the college portal URL
2. Student logs in with their credentials
3. On navigation to the home page, the scraper script is injected via `injectJavaScript()`
4. The scraper navigates through subject pages inside the WebView, parses HTML tables, and posts structured JSON back via `ReactNativeWebView.postMessage()`
5. React Native receives the data and renders the dashboard

---

## Project Structure

```
attendance-ui/
├── index.tsx                     App entry — WebView + scraper injection
├── components/
│   ├── AttendanceScreen.tsx      Main dashboard (FlatList of subjects)
│   ├── StatsHeader.tsx           Progress ring + overall stats
│   ├── GradientHeader.tsx        Student info header with accent color
│   ├── SubjectCard.tsx           Per-subject card with progress bar
│   ├── SubjectDetailModal.tsx    Full-screen modal for date-wise records
│   ├── QuickTip.tsx              Attendance rule info card
│   ├── SearchBar.tsx             Subject name search filter
│   └── ActionButtons.tsx         Quick-action row (Report/Refresh/Share/Settings)
├── context/
│   └── OTAContext.tsx            React Context for OTA config + script
├── hooks/
│   └── useOTAConfig.ts           Hook to access OTA context in components
├── lib/
│   ├── otaTypes.ts               TypeScript interfaces for OTA system
│   ├── otaDefaults.ts            Bundled fallback config
│   ├── otaService.ts             Fetch → cache → fallback service
│   ├── scraperScript.ts          Bundled scraper script (fallback)
│   └── tokens.ts                 Design tokens (typography, spacing, colors)
└── server/
    ├── api/ota.js                Vercel serverless endpoint
    ├── app.py                    Flask server with admin endpoints
    ├── requirements.txt          Python dependencies
    └── vercel.json               Vercel route config
```

---

## Setup

### Prerequisites

- React Native development environment (Expo or CLI)
- Node.js 18+
- Python 3.9+ (for Flask OTA server)

### App Configuration

Install dependencies:

```bash
npm install react-native-svg react-native-safe-area-context @react-native-async-storage/async-storage lucide-react-native
```

Set your OTA API URL in `lib/otaService.ts`:

```typescript
const OTA_API_URL = 'https://your-flask-server.com/api/ota/latest';
```

### Flask OTA Server

```bash
cd server
pip install -r requirements.txt
python app.py
```

The server starts on `http://0.0.0.0:5000` and creates `ota_data.json` on first run.

---

## OTA Update System

The OTA system allows updating the scraper script and UI configuration remotely without releasing a new app version.

### Three-Tier Fallback

```
Remote API (Flask server)
    ↓ failed / offline
AsyncStorage Cache (last successful fetch)
    ↓ no cache / first install
Bundled Defaults (shipped with the app binary)
```

The app never crashes due to OTA failure — it always falls back to a working state.

### What Can Be Changed Remotely

| Field | Effect | Example |
|---|---|---|
| `scraperScript` | Replaces the WebView scraper JS | College changed HTML structure |
| `config.colors` | Changes all zone colors in the UI | Rebrand from purple to blue |
| `config.thresholds` | Changes safe/caution/risk/danger boundaries | College lowered minimum to 70% |
| `config.labels` | Changes status badge text | "Safe" to "Good Standing" |
| `config.portalUrl` | Changes the WebView target URL | College migrated to new domain |
| `config.accentColor` | Changes the header brand color | Purple to blue |
| `config.showQuickTip` | Shows or hides the tip card | Disable tip after exam season |
| `config.quickTipText` | Custom tip text override | Update with new rules |
| `minAppVersion` | Forces a Play Store update | Critical security fix required |

### Flask API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/ota/latest` | App fetches current OTA data |
| `POST` | `/api/ota/update` | Push a new OTA update (auto-increments version) |
| `GET` | `/api/ota/status` | View current version and config summary |
| `POST` | `/api/ota/rollback` | Roll back to a previous version |

### Pushing an Update

```bash
curl -X POST https://your-server.com/api/ota/update \
  -H "Content-Type: application/json" \
  -d '{
    "scraperScript": "(function(){ ... new script ... })();\ntrue;",
    "config": {
      "thresholds": { "safe": 80, "minimum": 75, "warning": 70 }
    },
    "changelog": "Raised safe threshold to 80%"
  }'
```

The version number auto-increments. Apps fetch the update within 4 hours (or on next launch if the interval has passed).

### Partial Config Updates

You do not need to send the entire config object. The Flask server merges partial updates:

```bash
# Only change the accent color — everything else stays the same
curl -X POST https://your-server.com/api/ota/update \
  -H "Content-Type: application/json" \
  -d '{"config": {"accentColor": "#2563EB"}, "changelog": "Rebranded to blue"}'
```

---

## Design System

All components read from a centralized token system (`lib/tokens.ts`) for consistent typography, spacing, and colors.

### Typography Scale

| Token | Font Size | Weight | Usage |
|---|---|---|---|
| `hero` | 32 / 38px | 900 | Overall percentage in progress ring |
| `h1` | 18 / 20px | 800 | Subject percentage, section headings |
| `h2` | 16 / 18px | 700 | Subject names, status labels |
| `h3` | 15 / 17px | 700 | Pill values, card sub-headings |
| `body` | 14 / 15px | 600 | Stat values, body text |
| `caption` | 12 / 13px | 600 | Descriptions, meta text |
| `micro` | 10 / 11px | 700 | Badges, action labels |
| `nano` | 9 / 10px | 700 | Pill labels, tiny captions |

Sizes show small device (360px or less) / regular device values.

### Spacing Scale

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 6px |
| `md` | 8px |
| `lg` | 10px |
| `xl` | 12px |
| `xxl` | 14px |
| `xxxl` | 16px |

### Zone Colors

Attendance percentages are mapped to zones based on OTA-configurable thresholds:

| Zone | Default Threshold | Color | Label |
|---|---|---|---|
| Safe | >= 77% | `#22C55E` (green) | Safe |
| Caution | >= 75% | `#EAB308` (yellow) | Caution |
| Risk | >= 70% | `#F59E0B` (amber) | At Risk |
| Danger | < 70% | `#EF4444` (red) | Low |

---

## Component Guide

### StatsHeader

Circular progress ring (SVG + Animated) showing overall attendance percentage. Three stat pills display total subjects, classes attended, and classes conducted. Zone color and label come from OTA config.

### SubjectCard

Each subject gets a card with: name, code badge, progress bar, present/absent/total stats, and either a "Skip X" or "Need X" action pill based on the minimum threshold.

### SubjectDetailModal

Slide-up sheet showing all individual attendance records (date + Present/Absent status) for a selected subject. Includes a summary banner and skip/need calculation.

### GradientHeader

Colored header bar using the OTA accent color. Displays student avatar (first letter), name, student ID, and semester badge.

### QuickTip

Conditional info card explaining attendance rules. Shown/hidden and text content are both OTA-controllable.

### ActionButtons

Row of four action buttons: Report, Refresh, Share, Settings. Currently stubs — wire these to your own handlers.

---

## Deployment

### Flask Server (Recommended)

1. Deploy `server/app.py` to your hosting platform (Render, Railway, VPS, etc.)
2. Set environment variable `OTA_ADMIN_KEY` for securing the update endpoint
3. Place behind HTTPS (Nginx + Let's Encrypt, Cloudflare, or PaaS SSL)
4. Update `OTA_API_URL` in `lib/otaService.ts` to your server URL

### Vercel Serverless (Alternative)

1. Deploy the `server/` directory to Vercel
2. The `api/ota.js` function serves OTA data at `/api/ota/latest`
3. Update the `LATEST_OTA` object in `api/ota.js` and redeploy to push changes

### Security

- Keep `/api/ota/latest` public (the app needs unauthenticated access)
- Protect `/api/ota/update` with the `X-Admin-Key` header
- Always serve over HTTPS
- The `scraperScript` field controls JavaScript execution in the WebView — only trusted admins should have update access

---

## Dependencies

| Package | Purpose |
|---|---|
| `react-native-svg` | Circular progress ring (Svg, Circle, Animated) |
| `react-native-safe-area-context` | SafeAreaView for notch/gesture bar |
| `@react-native-async-storage/async-storage` | OTA config cache |
| `lucide-react-native` | Search icon in SearchBar |
| `react-native-webview` | College portal login + scraper execution |
| `flask` + `flask-cors` | OTA API server |
