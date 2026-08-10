# AGENTS.md

## 1. Project Identity & Governance

This document governs all automated agents and software engineers working on **JNTUA Attendance**, a cross-platform mobile application built with **Expo SDK 54** and **React Native 0.81.5**. The app is a single-screen, single-file Expo application (`App.tsx`) that embeds the JNTUA-CEA student portal in a `WebView`, scrapes attendance data via injected JavaScript, and renders a native dashboard.

There is no Expo Router, no `app/` directory, and no navigation library. The entry point is registered via `"main": "expo/AppEntry.js"` in `package.json`, and the single component in `App.tsx` manages all UI and state through `useReducer`.

### Core Directives

- **SDK 54 Compatibility:** Expo SDK 54 is strictly mandatory. All added packages must be compatible with Expo SDK 54 and installed via `npx expo install`.
- **Code Minimalism:** Prefer direct, concise implementation over abstractions. If a 5-line implementation achieves the exact result of a complex pattern, use the 5-line implementation.
- **Strict Typing & Modularity:** TypeScript strict mode is enabled. Never use explicit or implicit `any` or unsafe casts (`as unknown as T`). Logic, styling, state management, and UI rendering must be cleanly decoupled.
- **Mandatory Lint Gate:** A task is **never** complete until `npm run lint` passes with zero errors.

---

## 2. Pinned Technical Stack

All work must strictly adhere to the project's installed configuration. The `package.json` is the source of truth.

### Framework & Runtime

| Component | Package | Version |
|-----------|---------|---------|
| Expo SDK | `expo` | `~54.0.35` |
| React Native | `react-native` | `0.81.5` |
| React | `react` / `react-dom` | `19.1.0` |
| TypeScript | `typescript` | `~5.9.2` |
| ESLint | `eslint` + `eslint-config-expo` | `^9.25.0` / `~10.0.0` |

### Actively Used Libraries

| Library | Version | Usage |
|---------|---------|-------|
| `react-native-webview` | `13.15.0` | Embedded portal WebView for scraping |
| `expo-updates` | `~29.0.19` | Over-the-air update management |
| `expo-file-system` | `~19.0.23` | Local persistence of scraped attendance data |
| `expo-constants` | `~18.0.13` | Execution environment detection |


Do not remove these packages without team approval; they may be referenced by `eas.json` build profiles or `app.json` plugins during native builds.

### Native Build Configuration

- **Architecture:** `arm64-v8a` only (configured in `app.json` → `expo-build-properties` → `android.buildArchs`)
- **Minification:** Enabled in release builds (`enableMinifyInReleaseBuilds: true`)
- **Resource shrinking:** Enabled in release builds (`enableShrinkResourcesInReleaseBuilds: true`)
- **Android package:** `com.chanikya501.JNTUAAttendance`
- **Permissions:** `INTERNET` (required for WebView portal access)

---

## 3. Mandatory Lint Gate

A task is **incomplete** until the lint check passes.

### Execution Protocol

1. Write minimal, strictly-typed, modular code.
2. Run the gate command:
   ```bash
   npm run lint
   ```
3. If errors occur: identify root causes, fix the underlying code, and re-run.
4. **Prohibited:** Disabling ESLint rules, injecting `@ts-ignore` / `@ts-expect-error`, or modifying lint configuration to force a pass.
5. Optionally verify type correctness:
   ```bash
   npx tsc --noEmit
   ```
6. Start the app if no lint errors occur:
```bash
   npm run start
   ```


---

## 4. Package & Dependency Rules

### 1. Prohibition of `@latest`

Never install packages with `npm install <package>@latest`. Newer versions frequently break Expo SDK 54 compatibility.

### 2. Standard Installation Method

Always use Expo's resolution utility:
```bash
npx expo install <package-name>
```

### 3. Dependency Pre-checks

Before introducing any new dependency:

- Verify compatibility with Expo SDK 54.
- Confirm the required logic cannot be implemented with existing packages or standard TypeScript.
- Avoid adding dependencies for trivial utility tasks.

### 4. Native Dependency Impact

Any new native module (e.g., a native code dependency) requires a fresh EAS build and cannot be shipped via OTA update. `expo-file-system`. and all other Expo modules already present are bundled in the runtime and ship via standard OTA. Only changes that add new native code or modify native configs require `npm run build:preview` or `npm run build:production`.

---

## 5. Architectural & Code Quality Rules

### A. Modular Design & Strict Types

- All props, parameters, return types, and hook signatures must be fully typed.
- Keep logic, styling, state management, and UI rendering cleanly decoupled across modules:
  - `App.tsx` — UI rendering and WebView orchestration only.
  - `utils/automationScripts.ts` — scraping scripts and shared TypeScript interfaces.
  - `utils/storage.ts` — local persistence helpers.
  - `utils/updateManager.ts` — OTA update lifecycle management.
- Do not duplicate or mirror state. Derive calculated values directly during render (e.g., `overallPercentage`, `calculateCanSkip`).

### B. Minimalist Code Principles

- Do not create wrapper components, custom hooks, or utility abstractions for single-use operations.
- Implement strictly what is required. No commented-out code, no unused utilities, no speculative abstractions.
- Avoid `useEffect` for logic that can be handled in event handlers or derived during render.

### C. WebView Scraping Architecture

The app drives the JNTUA-CEA portal through a `WebView` and extracts data via `window.ReactNativeWebView.postMessage`. The scraping flow is URL-driven:

1. **`studenthome.php`** — `autoSubmitFirstSemesterScript` extracts student info (`STUDENT_INFO`), submits the subjects form.
2. **`studentsubjects.php`** — `selectSubjectByIndexScript(index)` finds subject rows, reports `SUBJECT_COUNT`, clicks the row at `currentIndex`. Posts `SCRAPING_COMPLETE` when `currentIndex` exceeds the row count.
3. **`studentsubatt.php`** — `parseDetailedAttendanceAndGoHomeScript` parses the attendance table, posts `ATTENDANCE_ITEM`, then navigates back to the home page.

JavaScript is injected via `webViewRef.current?.injectJavaScript()` inside the `onNavigationStateChange` callback. Scripts must always end with `true;` to keep the WebView bridge alive.

### D. State Management

- All dashboard state lives in a single `useReducer` with a typed `AppState` and discriminated-union `AppAction`.
- `RESET` returns to `initialState` while preserving `hasPreviousResult` and `previousResult` (so the "Previous Attendance" button persists after Back is pressed).
- `HYDRATE_PREVIOUS_RESULT` is a single atomic dispatch that restores the dashboard with zero re-scraping and no WebView re-authentication.

### E. Persistence Model

- Storage backend: `expo-file-system` (`FileSystem.documentDirectory`).
- Data format: JSON file at `previous_attendance_result.json`.
- Only `studentInfo` and `subjectsData` are persisted; all aggregates are derived at render.
- Persist once per unique result using a `useRef` signature guard (`name|subjectsCount|totalClasses|present`).
- `loadPreviousResult()` validates the persisted shape and returns `null` on corruption — never throws.

---

## 6. OTA Update Workflow

### Channels

| Channel | EAS Build Profile | Purpose |
|---------|-------------------|---------|
| `staging` | `preview` | Validate updates before reaching end users |
| `production` | `production` | Live updates for all users |

### Update Behaviour

- `app.json` → `updates.checkAutomatically: "ON_LOAD"` — the app checks for updates on launch.
- `runtimeVersion.policy: "appVersion"` — the `version` field in `app.json` determines update compatibility. Bumping the version forces a fresh native build.
- `shouldCheckOnMount()` in `utils/updateManager.ts` returns `false` in `__DEV__` and Expo Go; updates only apply to production/staging builds.
- A non-blocking banner displays "Checking for updates…" or "Applying update…" while the update lifecycle runs.

### Publishing Runbook

```bash
# 1. Authenticate with Expo (one-time)
eas-cli login

# 2. Publish a JS-only update to staging
npm run update:staging

# 3. Validate on a staging build, then promote to production
npm run promote:production

# Or publish directly to production
npm run update:production
```

### Native Build Runbook

```bash
# Staging (APK, staging channel)
npm run build:preview

# Production (APK, production channel, auto-incremented version)
npm run build:production
```

Any change to native code, `app.json` native config, or new native dependencies requires a fresh build. JS-only changes to `App.tsx`, `utils/*.ts` ship via `eas update`.

---

## 7. Execution Workflow

```
[1. Understand Context] → [2. Minimal Implementation] → [3. Enforce Strict Types]
   → [4. Execute Lint Gate] → [5. Complete]
```

1. **Inspect** existing files and system context before editing.
2. **Minimal Change** — apply the smallest safe change required.
3. **Verify** strict typing, modular separation, and platform stability (Android).
4. **Lint Check** — run `npm run lint` and resolve all flagged errors.
5. **App Start** - run `npm run start` and check for any runtime errors by running app and resolve if anny errors occur.
