# JNTUA Attendance

A React Native (Expo) mobile application that lets students of JNTUA CEA view and track their academic attendance from the **JNTUA-CEA Student Portal** (`classattendance.in`). The app embeds a WebView, authenticates against the portal, scrapes the subject-wise attendance data, and renders it as a clean, offline-free dashboard with per-subject breakdowns and warning indicators for attendance below the 75% threshold.

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
- [Troubleshooting](#troubleshooting)
- [OTA Updates (EAS Update)](#ota-updates-eas-update)
- [Future Work](#future-work)
- [License](#license)

---

## Project Idea

University portals are often slow, clunky, and not designed for mobile. Students frequently need to check whether their attendance is on track — especially the **75% minimum** required to sit for semester exams.

This app removes that friction by:

1. **Reusing the existing login session** — the student logs in through the official portal inside the app, so no credentials are stored locally.
2. **Automating the data retrieval** — the app drives the portal through a WebView and extracts attendance programmatically.
3. **Presenting a clear dashboard** — instead of a jumble of HTML tables, the student sees a summary card, per-subject progress bars, and immediate shortage warnings.

The core idea is a thin, well-structured wrapper around an existing web service that turns a mediocre web UX into a purpose-built mobile one — without duplicating any backend logic.

---

## How It Works

The app does **not** use a REST API or scrape from a server. Instead it runs everything client-side inside a hidden `react-native-webview`:

1. The WebView loads the portal's root URL.
2. The user logs in normally through the embedded portal pages.
3. Once on the student home page, the app injects JavaScript that:
   - reads the student's profile (name, admission number, class),
   - posts that data back to React Native via `postMessage`,
   - submits the "Subjects" form automatically.
4. The app cycles through each subject:
   - a script selects a subject row by index,
   - a script parses the detailed attendance table (date, time, status),
   - a script returns to the home page for the next subject.
5. When all subjects are collected, the WebView is hidden and the dashboard is rendered from the aggregated in-memory data.

All scraping logic lives in `utils/automationScripts.ts` as self-contained JavaScript string templates that are injected into the page.

---

## Architecture

The application is a single-screen Expo Router app with a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      app/index.tsx                          │
│  - UI (login, loader, dashboard, modal)                     │
│  - State management (useReducer)                            │
│  - WebView orchestration (navigation + message routing)     │
└───────────────────────┬─────────────────────────────────────┘
                        │ injectJavaScript / postMessage
┌───────────────────────▼─────────────────────────────────────┐
│                 utils/automationScripts.ts                  │
│  - Self-contained JS injection scripts                      │
│  - Shared TypeScript interfaces (StudentInfo,               │
│    SubjectAttendanceData, AttendanceRecord)                 │
└─────────────────────────────────────────────────────────────┘
```

### Key design decisions

- **`useReducer` for state** — all dashboard state (student info, subject list, progress, scraping status, selected subject) is consolidated in a single reducer. A `RESET` action restores the entire app to its initial state (and re-mounts the WebView via a keyed instance), which is the cleanest way to "log out" without storing credentials.
- **Memoized handlers** — the WebView's `onNavigationStateChange`, `onMessage`, and the reset handler are wrapped in `useCallback`, and read the latest state through a ref. This avoids stale-closure bugs and unnecessary re-renders.
- **Ref-based race guard** — the attendance aggregation is guarded against duplicate messages by checking the authoritative reducer state rather than a render-time snapshot.
- **Hidden WebView** — once the dashboard is shown, the WebView is shrunk to zero dimensions rather than unmounted, preserving the login session if the user resets.

---

## Project Structure

```
.
├── app/
│   ├── _layout.tsx            # Expo Router root layout (Stack, no headers)
│   └── index.tsx              # Main screen: WebView + dashboard + modal
├── utils/
│   ├── automationScripts.ts   # Injection scripts + shared TypeScript types
│   └── updateManager.ts       # OTA update hook + status types
├── assets/
│   └── images/                # App icons, splash, favicon
├── app.json                   # Expo app configuration
├── eas.json                   # EAS build profiles + channels
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config (strict)
├── eslint.config.js           # ESLint / Expo lint config
├── AGENTS.md                  # Project conventions & constraints
└── README.md                  # This file
```

### `app/index.tsx`

The entire user interface and orchestration logic. It contains:

- **State model** (`AppState`) and reducer (`appReducer`) with typed actions.
- **WebView setup** — a keyed `WebView` pointed at the portal root.
- **Navigation handler** — routes on the current portal page and injects the appropriate script.
- **Message handler** — parses `postMessage` payloads and dispatches reducer actions.
- **Dashboard UI** — profile banner, overall summary card, subject list, and the attendance-log modal.
- **Update banner** — a slim, non-blocking indicator while `expo-updates` checks/applies an OTA update.

### `utils/automationScripts.ts`

Contains the three injection scripts and the data contracts shared with the UI:

| Export | Role |
| -------- | ------ |
| `autoSubmitFirstSemesterScript` | Reads profile info, posts `STUDENT_INFO`, submits the subjects form. |
| `selectSubjectByIndexScript(index)` | Finds subject rows, posts `SUBJECT_COUNT`, clicks the row at the target index (or posts `SCRAPING_COMPLETE` when done). |
| `parseDetailedAttendanceAndGoHomeScript` | Parses the attendance table, posts `ATTENDANCE_ITEM`, then navigates back to the home page. |
| `StudentInfo` | `{ name, admissionNo, className }` |
| `SubjectAttendanceData` | Subject name, present/absent/total counts, percentage, and `records[]`. |
| `AttendanceRecord` | A single log entry: `{ date, time, status }` where status is `Present` / `Absent` / `Unknown`. |

### `utils/updateManager.ts`

Encapsulates all `expo-updates` logic in one typed module:

- `UpdateStatus` — union type mapping the OTA lifecycle (`checking`, `applying`, `ready`, `upToDate`, `error`, `unknown`).
- `UpdateManager` — typed interface `{ status, checkForUpdate, lastError }`.
- `shouldCheckOnMount()` — returns `false` in `__DEV__` and Expo Go, `true` in production builds.
- `useUpdateManager()` — hook wrapping `expo-updates`' `useUpdates()` into the `UpdateStatus` state machine.

---

## Tech Stack

| Layer | Technology |
| ------- | ----------- |
| Framework | Expo SDK 54 |
| Runtime | React Native 0.81.5 |
| Language | React 19.1 + TypeScript 5.9 (strict) |
| Routing | Expo Router 6 |
| WebView | `react-native-webview` 13.15 |
| OTA | `expo-updates` via EAS Update |
| Linting | ESLint 9 via `eslint-config-expo` |

No additional state-management or data-fetching libraries are used — the app relies on React's built-in `useReducer` and the WebView bridge.

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- An Expo-compatible device or emulator, or the Expo Go app
- A valid JNTUA-CEA student portal account

### Install

```
bash
# Clone the repository
git clone <repository-url>
cd JNTUA-Attendance

# Install dependencies
npm install
```

### Run

```
bash
# Start the Expo dev server
npm start
```

Then:

- Press `a` to open on an Android emulator/device.
- Press `i` to open on an iOS simulator.
- Press `w` to open in the web browser.
- Or scan the QR code with the Expo Go app on a physical device.

### Verify lint

```
bash
npm run lint
```

This is the project's mandatory quality gate — it must pass before any change is considered complete.

---

## Usage Guide

### 1. Log in

When the app launches, the embedded portal opens at the login page. Enter your portal credentials and sign in. The app does not store or transmit your password anywhere except to the official portal.

### 2. Automatic sync

After login, the app automatically:

- Detects that you are on the student home page.
- Collects your profile details.
- Walks through every subject, parsing its attendance log.

A progress screen shows `Processed X of Y subjects`.

### 3. Read the dashboard

Once syncing finishes, the dashboard appears with:

- **Student profile** — name, admission number, and class.
- **Overall percentage card** — combined attendance across all subjects, with total/attended/missed counts and a visual progress bar.
- **Subject cards** — each subject shows its name, percentage badge, a progress bar, and class counts.
- **Shortage warnings** — any subject (or the overall total) below the 75% threshold is highlighted in red with a warning label.

### 4. Inspect a subject log

Tap any subject card to open a modal listing every recorded attendance entry (date, time, status). Entries are tagged as **Present**, **Absent**, or **Unknown** (when the portal did not provide a clear status).

### 5. Reset the app

Use **Reset App** in the top bar to clear all local data and return to the login flow. This re-mounts the WebView from the portal root; the session is preserved in the hidden WebView until you actively log out.

---

## Data Pipeline

The end-to-end flow of a single scrape cycle:

```
Portal root
   │  (user logs in)
   ▼
studenthome.php
   │  inject autoSubmitFirstSemesterScript
   │  → STUDENT_INFO, then submit "subjects" form
   ▼
studentsubjects.php
   │  inject selectSubjectByIndexScript(currentIndex)
   │  → SUBJECT_COUNT, click row[i]
   ▼
studentsubatt.php
   │  inject parseDetailedAttendanceAndGoHomeScript
   │  → ATTENDANCE_ITEM, then navigate home
   ▼
studenthome.php  (repeat for i = 0..n-1)
   │  → SCRAPING_COMPLETE when all rows processed
   ▼
Dashboard rendered from aggregated subjectsData
```

The reducer handles each `ATTENDANCE_ITEM` by appending it to `subjectsData`, advancing `currentIndex`, and marking the scrape finished once `currentIndex` reaches `totalSubjects`.

---

## The 75% Rule Logic

The app evaluates attendance against the standard **75% minimum** using the derived flag:

```
overallPercentage = (totalPresent / totalClasses) * 100
isShortage = overallPercentage < 75
```

This single derived value drives all warning UI (card background, status chip, badge, and progress-bar color), keeping the logic in one place and consistent across the screen. The same threshold is applied per subject in the subject list.

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
| --------- | -------------- | ------------ |
| Stuck on "Authenticating session..." | Portal page structure changed or slow load | Wait a few seconds; if persistent, tap **Reset App** and retry. |
| No subjects appear after login | The portal's subject-row selector (`tr.clickable-row`) did not match | The portal DOM likely changed; update `selectSubjectByIndexScript`. |
| `Unknown` statuses in the log | Portal table lacked a status badge for some rows | Expected — the app marks unclear entries as `Unknown` rather than dropping them. |
| Lint fails | Code does not meet project quality gate | Run `npm run lint`, read the errors, and fix the root cause. |

---

## OTA Updates (EAS Update)

The app uses **pure EAS Update** to ship scraper-script fixes and minor UI tweaks over-the-air — no store reinstall or native rebuild required. The scraping logic lives in `utils/automationScripts.ts` and the UI in `app/index.tsx`, both pure JS/TS bundled into the JS runtime, making them ideal OTA targets.

### Channels

Two channels provide a safe rollout path:

| Channel | Build profile | Purpose |
| ------- | ------------- | ------- |
| `staging` | `preview` | Validate a new update before reaching users |
| `production` | `production` | Live updates delivered to all users |

The app checks for updates on launch (`checkAutomatically: "ON_LOAD"`) and on foreground, guarded by `shouldCheckOnMount()` in `utils/updateManager.ts` (skipped in `__DEV__` and Expo Go). A lightweight, non-blocking banner shows while checking/applying.

### Publishing Runbook

1. **Install tooling** (one-time):

```
bash
npm run eas:init          # generates/verifies eas.json
eas-cli login             # authenticate with your Expo account
```

1. **Create a staging build** (one-time, includes native config):

```
bash
npm run build:preview     # eas-cli build --profile preview --platform android
```

Install this build on a test device.

1. **Publish a staging update** (every time you change `automationScripts.ts` or `index.tsx`):

```bash
npm run update:staging    # eas-cli update --channel staging
```

Open the staging build and verify the new behavior.

1. **Promote to production** once validated:

```
bash
npm run promote:production  # eas-cli promote --channel staging --to production
```

Production users receive the update automatically on next launch. Alternatively, publish directly to production with `npm run update:production`.

> **Important:** `eas update` only ships changes to the JS bundle. Any change to native modules, `app.json` native config, or dependencies requires a new build (`npm run build:production`) rather than an update. The `runtimeVersion` uses the `appVersion` policy so a version bump in `app.json` forces a fresh build.

### Configuration

- The `updates` block and `runtimeVersion` live in `app.json`.
- The `eas.json` maps `preview` → `staging` and `production` → `production`.
- Replace `YOUR-PROJECT-ID` in `app.json` → `updates.url` with your actual EAS project ID (run `eas-cli project:info` to find it).

---

## Future Work

- **Offline caching** — persist the last scrape locally so the dashboard is available without re-syncing.
- **Multi-semester support** — handle portals that expose more than one semester form.
- **Background refresh** — re-scrape on a schedule or on app foreground.
- **Scheduled notifications** — alert the student when attendance approaches the 75% threshold.

---

## License

This project is provided for educational use. It is not affiliated with or endorsed by JNTUA or the classattendance.in portal. Use it responsibly and in accordance with your institution's policies.
