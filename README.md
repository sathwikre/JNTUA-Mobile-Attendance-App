# JNTUA Attendance

A React Native (Expo SDK 54) mobile application that lets students of JNTUACEA view and track their academic attendance from the JNTUA-CEA Student Portal (`jntuaceastudents.classattendance.in`). The app embeds a WebView, authenticates against the portal, scrapes subject-wise attendance data, and renders a native dashboard with per-subject breakdowns and shortage warnings for attendance below the 75% threshold.

---

## Table of Contents

- [Project Idea](#project-idea)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Data Pipeline](#data-pipeline)
- [The 75% Rule Logic](#the-75-rule-logic)
- [Previous Attendance Persistence](#previous-attendance-persistence)
- [OTA Updates (EAS Update)](#ota-updates-eas-update)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Project Idea

University portals are often slow, clunky, and not designed for mobile. Students frequently need to check whether their attendance is on track — especially the **75% minimum** required to sit for semester exams.

This app removes that friction by:

1. **Reusing the existing login session** — the student logs in through the official portal inside the app, so no credentials are stored locally.
2. **Automating the data retrieval** — the app drives the portal through a WebView and extracts attendance programmatically.
3. **Presenting a clear dashboard** — instead of a jumble of HTML tables, the student sees a summary card, per-subject cards with percentage badges, skip-capacity indicators, and immediate shortage warnings.

The core idea is a thin, well-structured wrapper around an existing web service that turns a mediocre web UX into a purpose-built mobile one — without duplicating any backend logic.

---

## How It Works

The app does **not** use a REST API or scrape from a server. Instead it runs everything client-side inside a `react-native-webview`:

1. The WebView loads the portal's root URL (`https://jntuaceastudents.classattendance.in/`).
2. The user logs in normally through the embedded portal pages.
3. Once on the student home page (`studenthome.php`), the app injects JavaScript that:
   - reads the student's profile (name, admission number, class),
   - posts that data back to React Native via `postMessage`,
   - submits the "Subjects" form automatically.
4. The app cycles through each subject:
   - a script selects a subject row by index,
   - a script parses the detailed attendance table (date, time, status),
   - a script returns to the home page for the next subject.
5. When all subjects are collected, the WebView is hidden and the dashboard is rendered from the aggregated in-memory data.

All scraping logic lives in `utils/automationScripts.ts` as self-contained JavaScript string templates that are injected into the page via `webViewRef.current.injectJavaScript()`.

---

## Architecture

The application is a single-file Expo app with a clear separation of concerns across three utility modules:

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  - UI (login overlay, loader, dashboard, modal)             │
│  - State management (useReducer)                            │
│  - WebView orchestration (navigation + message routing)     │
│  - Aggregation math (derived at render)                     │
│  - Persistence effects (load on mount, save on completion)  │
└───────────────────────┬─────────────────────────────────────┘
                         │ injectJavaScript / postMessage
┌───────────────────────┼─────────────────────────────────────┐
│                 utils/automationScripts.ts                  │
│  - Self-contained JS injection scripts                      │
│  - Shared TypeScript interfaces (StudentInfo,              │
│    SubjectAttendanceData, AttendanceRecord)                │
│  - Global Window type declaration for ReactNativeWebView   │
└───────────────────────┼─────────────────────────────────────┘
                         │ save / load JSON to documentDirectory
┌───────────────────────┼─────────────────────────────────────┐
│                   utils/storage.ts                          │
│  - savePreviousResult                                       │
│  - loadPreviousResult (shape-validated, null on error)      │
│  - clearPreviousResult                                      │
└───────────────────────┼─────────────────────────────────────┘
                         │ checkForUpdate, fetchUpdate, reload
┌───────────────────────┘
│                   utils/updateManager.ts                    │
│  - UpdateStatus union type                                  │
│  - UpdateManager interface                                  │
│  - shouldCheckOnMount() guard                               │
│  - useUpdateManager() hook wrapping expo-updates           │
└─────────────────────────────────────────────────────────────┘
```

### Key design decisions

- **`useReducer` for state** — all dashboard state (student info, subject list, progress, scraping status, selected subject, persisted result) is consolidated in a single reducer. A `RESET` action returns to `initialState` while preserving `hasPreviousResult` and `previousResult` (the persisted result is not cleared by Back), and bumps `webViewKey` to re-mount the WebView — the cleanest way to "log out" without storing credentials.
- **Memoized handlers** — the WebView's `onNavigationStateChange`, `onMessage`, and the reset/previous-result handlers are wrapped in `useCallback`, and read the latest state through a ref (`stateRef`) to avoid stale-closure bugs.
- **Derived state** — all aggregation values (`overallClasses`, `overallPresent`, `overallAbsent`, `overallPercentage`, `maxOverallSkippable`, `calculateCanSkip`) are computed during render from `subjectsData`. Nothing is duplicated in state.
- **Hidden WebView** — once the dashboard is shown, the WebView is shrunk to zero dimensions (`styles.hiddenWebView: { width: 0, height: 0 }`) rather than unmounted, preserving the login session if the user presses Back.
- **Signature-guarded persistence** — a `useRef` signature guard (`name|subjectsCount|totalClasses|present`) ensures each unique completed result is persisted exactly once, preventing duplicate writes on re-renders.
- **Hydration is atomic** — `HYDRATE_PREVIOUS_RESULT` is a single reducer action that sets `isLoggedIn`, `isScrapingFinished`, `studentInfo`, `subjectsData`, `currentIndex`, and `fetchedIndices` in one pass, so the dashboard renders immediately with no partial state.

---

## Project Structure

```
.
├── App.tsx                    # Main screen: WebView + dashboard + modal + state
├── app.json                   # Expo app configuration
├── eas.json                   # EAS build profiles + channels
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config (strict, paths: @/* → ./*)
├── eslint.config.js           # ESLint / Expo lint config
├── AGENTS.md                  # Project conventions & constraints
├── README.md                  # This file
├── utils/
│   ├── automationScripts.ts   # JS injection scripts + shared TypeScript types
│   ├── storage.ts             # Local persistence helpers (expo-file-system)
│   └── updateManager.ts       # OTA update hook + status types
└── assets/
    └── images/                # App icons, splash, favicon
```

### `App.tsx`

The entire user interface and orchestration logic. It contains:

- **State model** (`AppState`) and reducer (`appReducer`) with typed discriminated-union actions.
- **WebView setup** — a keyed `WebView` pointed at the portal root URL. The `key` prop (`webViewKey`) is bumped by `RESET` to force re-mount.
- **Navigation handler** (`handleNavigationStateChange`) — routes on the current portal page URL and injects the appropriate script when `!loading && !scrapingFinished`.
- **Message handler** (`handleMessage`) — parses `postMessage` payloads (JSON) and dispatches reducer actions via a `MessagePayload` discriminated union.
- **Dashboard UI** — profile banner, overall summary card, subject list (`FlatList`), and the attendance-log modal.
- **Update banner** — a slim, non-blocking indicator at the top while `expo-updates` checks or applies an OTA update.

### `utils/automationScripts.ts`

Contains the three injection scripts and the data contracts shared with the UI:

| Export | Role |
|--------|------|
| `autoSubmitFirstSemesterScript` | Reads profile info from `.list-group-item` elements, posts `STUDENT_INFO`, submits the form whose `action` is `studentsubjects.php`. |
| `selectSubjectByIndexScript(index)` | Polls for `tr.clickable-row` rows (up to 20 attempts, 200ms interval), posts `SUBJECT_COUNT`, clicks the row at the target index, or posts `SCRAPING_COMPLETE` when the index exceeds the row count. |
| `parseDetailedAttendanceAndGoHomeScript` | Parses attendance log rows from `table.table-bordered.table-striped tbody tr` (3 cells: date, time, status badge), posts `ATTENDANCE_ITEM`, then clicks the `a[href="studenthome.php"]` link after a 300ms delay. |
| `StudentInfo` | `{ name, admissionNo, className }` |
| `SubjectAttendanceData` | `{ subjectName, present, absent, total, percentage, records: AttendanceRecord[] }` |
| `AttendanceRecord` | `{ date, time, status: 'Present' | 'Absent' | 'Unknown' }` |

### `utils/storage.ts`

Local persistence of the last scraped result using `expo-file-system`:

| Export | Role |
|--------|------|
| `PreviousAttendanceResult` | `{ studentInfo: StudentInfo, subjectsData: SubjectAttendanceData[] }` |
| `savePreviousResult(result)` | Writes JSON to `{documentDirectory}/previous_attendance_result.json` |
| `loadPreviousResult()` | Reads and shape-validates the JSON file. Returns `null` on missing/corrupt data — never throws. |
| `clearPreviousResult()` | Deletes the stored file (available for future reset flows). |

Validation is performed by the type guard `isPreviousAttendanceResult()`, which checks that `studentInfo` has string fields and that `subjectsData` is an array where every element has the correct types.

### `utils/updateManager.ts`

Encapsulates all `expo-updates` logic in one typed module:

| Export | Role |
|--------|------|
| `UpdateStatus` | Union: `"checking" \| "applying" \| "ready" \| "upToDate" \| "error" \| "unknown"` |
| `UpdateManager` | Interface: `{ status, checkForUpdate, lastError }` |
| `shouldCheckOnMount()` | Returns `false` in `__DEV__` and in Expo Go (`StoreClient`); returns `true` in production/staging builds. |
| `useUpdateManager()` | Hook wrapping `Updates.useUpdates()` into the `UpdateStatus` state machine with a 30-second timeout guard. |

The `checkForUpdate()` method follows the standard EAS Update flow: `checkForUpdateAsync()` → if available, `fetchUpdateAsync()` → `reloadAsync()`. Failures are caught and surfaced via `lastError` without crashing the app.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo SDK | `~54.0.35` |
| Runtime | React Native | `0.81.5` |
| Language | React + TypeScript | `19.1.0` / `~5.9.2` (strict) |
| WebView | react-native-webview | `13.15.0` |
| Storage | expo-file-system | `~19.0.23` |
| OTA | expo-updates | `~29.0.19` |
| Constants | expo-constants | `~18.0.13` |
| Build config | expo-build-properties | `~1.0.10` |
| Linting | ESLint + eslint-config-expo | `^9.25.0` / `~10.0.0` |

No external state-management or data-fetching libraries are used — the app relies on React's built-in `useReducer` and the WebView bridge. No Expo Router or navigation library is in use despite some packages remaining in `package.json` as dormant dependencies.

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- An Expo-compatible device or emulator, or the Expo Go app
- A valid JNTUA-CEA student portal account

### Install

```bash
git clone <repository-url>
cd JNTUA-Attendance
npm install
```

### Run

```bash
npm run start
```

Then:

- Press `a` to open on an Android emulator/device.
- Press `i` to open on an iOS simulator.
- Press `w` to open in the web browser.
- Or scan the QR code with the Expo Go app on a physical device.

### Verify lint

```bash
npm run lint
```

This is the project's mandatory quality gate — it must pass before any change is considered complete. Optionally verify types:

```bash
npx tsc --noEmit
```

---

## Usage Guide

### 1. Log in

When the app launches, the embedded portal opens at the login page. Enter your portal credentials and sign in. The app does not store or transmit your password anywhere except to the official portal.

### 2. Automatic sync

After login, the app automatically:

- Detects that you are on the student home page (`studenthome.php`).
- Collects your profile details (name, admission number, class).
- Walks through every subject, parsing its attendance log.

A progress screen shows `Processed X of Y subjects` with a completion percentage.

### 3. Read the dashboard

Once syncing finishes, the dashboard appears with:

- **Student profile** — name, admission number, and class in a dark banner.
- **Overall summary card** — combined attendance across all subjects with total/attended/missed counts and an overall "can skip" capacity pill.
- **Subject cards** — each subject shows its name, percentage badge, total/attended/missed mini-stats, and a per-subject "can skip" indicator. Cards below 75% are highlighted in red.
- **Shortage warnings** — any subject (or the overall total) below the 75% threshold is highlighted in red with a "Shortage Warning" label.

### 4. Inspect a subject log

Tap any subject card to open a modal listing every recorded attendance entry (date, time, status). Entries are tagged as **Present**, **Absent**, or **Unknown** (when the portal did not provide a clear status badge).

### 5. View previous attendance

When the app starts on the login screen and a previous result is stored locally, a **Previous Attendance** button appears. Tapping it restores the last scraped dashboard instantly — no re-login or re-scrape required. The stored result is loaded from `expo-file-system` on mount.

### 6. Reset the app

Use the **Back** button in the top-right corner of the dashboard to return to the login flow. This dispatches `RESET`, which restores the initial reducer state (clearing all runtime scrape data and `selectedSubject`) while preserving the stored previous result. It also increments `webViewKey` to re-mount the WebView fresh from the portal root. The login session is preserved in the hidden WebView until you actively log out of the portal.

---

## Data Pipeline

The end-to-end flow of a single scrape cycle:

```
Portal root
   │  (user logs in through the embedded WebView)
   ▼
studenthome.php
   │  inject autoSubmitFirstSemesterScript
   │  → STUDENT_INFO postMessage, then submit "subjects" form
   ▼
studentsubjects.php
   │  inject selectSubjectByIndexScript(currentIndex)
   │  → SUBJECT_COUNT postMessage, click row[currentIndex]
   ▼
studentsubatt.php
   │  inject parseDetailedAttendanceAndGoHomeScript
   │  → ATTENDANCE_ITEM postMessage, then navigate home
   ▼
studenthome.php  (repeat for currentIndex = 0..totalSubjects-1)
   │  → SCRAPING_COMPLETE postMessage when currentIndex >= rows.length
   ▼
Dashboard rendered from aggregated subjectsData
   │  (data persisted to previous_attendance_result.json via expo-file-system)
```

The messaging protocol between the injected JavaScript and React Native:

| postMessage type | Payload | Triggered by |
|-----------------|---------|-------------|
| `STUDENT_INFO` | `{ type, data: StudentInfo }` | `autoSubmitFirstSemesterScript` on `studenthome.php` |
| `SUBJECT_COUNT` | `{ type, count: number }` | `selectSubjectByIndexScript` on `studentsubjects.php` |
| `ATTENDANCE_ITEM` | `{ type, data: SubjectAttendanceData }` | `parseDetailedAttendanceAndGoHomeScript` on `studentsubatt.php` |
| `SCRAPING_COMPLETE` | `{ type }` | `selectSubjectByIndexScript` when target index exceeds row count |

The reducer handles each `ATTENDANCE_ITEM` by:
1. Checking if `currentIndex` was already fetched (dedup guard via `fetchedIndices`).
2. Appending the item to `subjectsData` and recording the index in `fetchedIndices`.
3. Advancing `currentIndex` unless the next index would exceed `totalSubjects`, in which case `isScrapingFinished` is set to `true`.

---

## The 75% Rule Logic

The app evaluates attendance against the standard **75% minimum** required to sit for semester exams:

```
overallPercentage = (totalPresent / totalClasses) * 100
isShortage = overallPercentage < 75
```

This single derived value drives all overall-level warning UI (card background color, status chip label, score color). The same threshold is applied per subject in the subject list via:

```
subjectPercentage = (subjectPresent / subjectTotal) * 100
isLow = subjectPercentage < 75
```

Subject cards below 75% use a red background (`cardLowBg`); those at or above use a white background (`cardNormalBg`).

### Skip Capacity Calculation

The app also computes how many future classes a student can miss while staying above 75%, using a dual-constraint approach:

```
maxOverallSkippable = max(0, floor((4 * overallPresent - 3 * overallClasses) / 3))
canSkip(subject) = min(
  max(0, floor((4 * subjectPresent - 3 * subjectTotal) / 3)),
  maxOverallSkippable
)
```

The overall constraint ensures the per-subject skip count cannot push the aggregate below 75%, even if an individual subject has surplus attendance. This value is displayed per subject as `can skip : N` and overall in the summary card.

---

## Previous Attendance Persistence

The app persists the most recently scraped result so it survives app restarts. This feature is implemented in `utils/storage.ts` and integrated into `App.tsx`:

**Storage backend:** `expo-file-system` writes a JSON file (`previous_attendance_result.json`) to `FileSystem.documentDirectory`.

**What is persisted:** Only `studentInfo` and `subjectsData` — all aggregates are derived at render time, so nothing is duplicated in storage.

**When it is saved:** Once, immediately when a scrape completes and the data is fully in memory, guarded by a `useRef` signature (`name|subjectsCount|totalClasses|present`) to ensure idempotent, single-write per unique result.

**When it is loaded:** On app mount via a `useEffect` that calls `loadPreviousResult()` and dispatches `SET_PREVIOUS_RESULT`. The loader validates the persisted shape and returns `null` on corruption — it never throws.

**How it is restored:** When `hasPreviousResult` is true and the user is on the login screen (`!isLoggedIn`), a **Previous Attendance** button is rendered overlaying the WebView. Tapping it dispatches `HYDRATE_PREVIOUS_RESULT`, which atomically sets `isLoggedIn`, `isScrapingFinished`, `studentInfo`, and `subjectsData`, causing the existing dashboard to render immediately with zero re-scraping and no WebView re-authentication.

**Back button behavior:** The `RESET` action (triggered by the Back button) returns to `initialState` while preserving `hasPreviousResult` and `previousResult`, so the button reappears after resetting.

---

## OTA Updates (EAS Update)

The app uses **pure EAS Update** to ship scraper-script fixes and minor UI tweaks over-the-air — no store reinstall or native rebuild required. The scraping logic lives in `utils/automationScripts.ts` and the UI in `App.tsx`, both pure JavaScript/TypeScript bundled into the JS runtime, making them ideal OTA targets.

### Channels

Two channels provide a safe rollout path:

| Channel | Build profile | Purpose |
|---------|--------------|---------|
| `staging` | `preview` (APK) | Validate a new update before reaching users |
| `production` | `production` (APK, version auto-incremented) | Live updates delivered to all users |

The app checks for updates on launch (`app.json` → `updates.checkAutomatically: "ON_LOAD"`), guarded by `shouldCheckOnMount()` in `utils/updateManager.ts` (skipped in `__DEV__` and Expo Go). A lightweight, non-blocking banner at the top of the screen shows "Checking for updates…" or "Applying update…" while the lifecycle runs.

### Publishing Runbook

```bash
# 1. Authenticate with Expo (one-time)
eas-cli login

# 2. Create a staging build (one-time — includes native config)
npm run build:preview

# 3. Publish a JS-only update to staging (every time automationScripts.ts or App.tsx changes)
npm run update:staging

# 4. Validate on the staging build, then promote to production
npm run promote:production

# Or publish directly to production
npm run update:production
```

### Native Build Runbook

```bash
# Staging (APK, staging channel)
npm run build:preview

# Production (APK, production channel, version auto-incremented)
npm run build:production
```

**Important:** `eas update` only ships changes to the JS bundle. Any change to native modules, `app.json` native config, or new native dependencies requires a fresh build (`npm run build:production`) rather than an update. The `runtimeVersion` uses the `appVersion` policy (`app.json`), so bumping the `version` field forces a fresh native build.

### Configuration

- **Update URL:** `https://u.expo.dev/214d3218-11c5-4156-8a95-12843b24cd74` (set in `app.json` → `updates.url`)
- **EAS Project ID:** `554d405b-1ed9-4bb5-bd9f-f8af967a3634` (set in `app.json` → `extra.eas.projectId`)
- **Runtime version policy:** `appVersion` — the `version` field in `app.json` determines update compatibility.
- **Channel mapping:** defined in `eas.json` — `preview` profile → `staging` channel, `production` profile → `production` channel.

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Stuck on "Authenticating session..." | Portal page structure changed, or the home page loaded before DOM was ready | Wait a few seconds for the injected script to retry; if persistent, tap **Back** and retry the login. |
| "Processed 0 of 0 subjects" or no progress | The portal's subject-row selector (`tr.clickable-row`) did not match any rows | The portal DOM likely changed; update `selectSubjectByIndexScript` in `utils/automationScripts.ts`. |
| No subjects appear after login | `autoSubmitFirstSemesterScript` failed to find the subjects form (`form[action="studentsubjects.php"]`) | Portal structure changed; review and update the form selector. |
| `Unknown` statuses in the log | Portal table lacked a status badge (`span.badge`) for some rows | Expected — the app marks unclear entries as `Unknown` rather than dropping them. |
| Previous Attendance button missing after restart | No previous result was persisted, or the stored JSON is corrupt | Complete a full scrape once to create a valid stored result; the loader validates shape and returns `null` on corruption. |
| Dashboard shows partial subject data | Scraping was interrupted mid-way | Tap **Back** and re-authenticate to restart the full scrape. |
| Lint fails | Code does not meet the project quality gate | Run `npm run lint`, read the errors, and fix the root cause — never disable rules or inject `@ts-ignore`. |

---

## License

This project is provided for educational use. It is not affiliated with or endorsed by JNTUA or the classattendance.in portal. Use it responsibly and in accordance with your institution's policies.
