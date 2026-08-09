# AGENTS.md

## Project Identity

This is the **JNTUA Attendance** mobile application built with Expo / React Native.

The repository must remain compatible with the project's currently installed Expo stack.

## Non-Negotiable Completion Rule

A task is **NOT complete** until the final lint check passes.

At the end of every successful implementation:

```bash
npm run lint
```

### Completion gate

1. Implement the requested change.
2. Inspect the changed code for obvious mistakes.
3. Run:
   ```bash
   npm run lint
   ```
4. If lint fails:
   - Read the actual errors.
   - Fix the root cause.
   - Run `npm run lint` again.
5. Repeat until lint passes.
6. Only then report the task as completed.

Never say "completed", "done", or "finished" while `npm run lint` is failing.

Do not hide, suppress, disable, or weaken ESLint rules merely to make the check pass unless explicitly requested.

---

## Current Technology Constraints

The current project configuration is the source of truth.

### Runtime / framework

- Expo SDK: **54**
- Expo: `~54.0.35`
- React Native: `0.81.5`
- React: `19.1.0`
- React DOM: `19.1.0`
- Expo Router: `~6.0.24`
- TypeScript: `~5.9.2`
- ESLint: `^9.25.0`
- Expo ESLint config: `~10.0.0`

### Important Expo dependencies

- `expo-constants`: `~18.0.13`
- `expo-font`: `~14.0.12`
- `expo-haptics`: `~15.0.8`
- `expo-image`: `~3.0.11`
- `expo-linking`: `~8.0.12`
- `expo-splash-screen`: `~31.0.13`
- `expo-status-bar`: `~3.0.9`
- `expo-symbols`: `~1.0.8`
- `expo-system-ui`: `~6.0.9`
- `expo-web-browser`: `~15.0.11`

### React Native dependencies

- `react-native-gesture-handler`: `~2.28.0`
- `react-native-worklets`: `0.5.1`
- `react-native-reanimated`: `~4.1.1`
- `react-native-safe-area-context`: `~5.6.0`
- `react-native-screens`: `~4.16.0`
- `react-native-web`: `~0.21.0`

The project's `package.json` is authoritative for the exact installed dependency versions.

---

## Dependency Compatibility Rules

### 1. Never blindly install `latest`

Do NOT do this for Expo-related or React Native packages:

```bash
npm install <package>@latest
```

A package being the newest version does **not** mean it is compatible with Expo SDK 54.

### 2. Prefer Expo's compatibility resolver

For Expo / React Native packages, prefer:

```bash
npx expo install <package>
```

This lets Expo select a version compatible with the project's SDK.

For example:

```bash
npx expo install expo-camera
```

instead of:

```bash
npm install expo-camera@latest
```

### 3. Verify compatibility before adding a package

Before installing a package:

- Determine whether it supports Expo SDK 54.
- Check whether it requires a different React Native version.
- Check whether it requires native configuration unavailable in the current Expo workflow.
- Prefer packages already supported by Expo when an equivalent exists.
- Avoid adding a dependency when the functionality can be implemented simply with existing packages.

### 4. Do not casually upgrade the core stack

Do not independently upgrade:

- Expo
- React Native
- React
- Expo Router
- Reanimated
- Gesture Handler
- Navigation packages

unless the task explicitly requires it.

An upgrade is a **project-level change**, not a side effect of implementing a feature.

If an upgrade is genuinely required, inspect the Expo SDK compatibility matrix and update the dependency set coherently rather than upgrading one package in isolation.

### 5. Preserve the working dependency graph

Before changing dependencies, inspect:

```bash
cat package.json
```

After dependency changes, verify:

```bash
npm install
npm run lint
```

Do not use `npm audit fix --force` as a generic repair mechanism. It can introduce breaking dependency changes.

---

# Coding Philosophy

Follow a simple, engineering-first style inspired by the principles commonly associated with Andrej Karpathy's coding workflow.

## 1. Write less code

Prefer the smallest correct implementation.

Bad:

- unnecessary abstractions
- excessive helper functions
- wrapper components with no real value
- generic frameworks for one use case
- duplicated state
- speculative features

Good:

- direct code
- small functions
- clear data flow
- minimal dependencies
- obvious control flow

**Do not measure quality by lines of code. Minimize code that does not create value.**

## 2. Understand before changing

Before modifying code:

1. Find the relevant file.
2. Read the surrounding implementation.
3. Understand how data flows through it.
4. Identify the smallest safe change.
5. Change only what is necessary.

Do not rewrite an entire file just to change a few lines.

## 3. Prefer boring code

Prefer:

```text
simple > clever
explicit > magical
local > global
composition > unnecessary inheritance
existing utilities > new dependencies
```

If a straightforward solution works, use it.

Do not introduce advanced patterns merely because they are technically interesting.

## 4. Avoid premature abstraction

Do not create:

- a custom hook for one trivial operation
- a utility function used only once
- a generic component for one screen
- a state-management layer for local state
- a configuration system for one constant

Abstract only when repetition or complexity actually justifies it.

## 5. Keep functions small

A function should ideally do one understandable job.

If a function becomes difficult to understand:

- first simplify the logic,
- then extract a meaningful function if necessary.

Do not split code into dozens of tiny functions merely to make files look organized.

## 6. Avoid unnecessary state

Before adding React state, ask:

> Can this value be derived from existing state, props, or data?

If yes, derive it.

Do not store the same information in multiple places.

## 7. Avoid unnecessary effects

Before using `useEffect`, ask whether the operation can happen:

- directly during an event,
- during rendering as a derived value,
- through existing navigation/data-flow mechanisms.

Do not use `useEffect` as a default solution for ordinary application logic.

## 8. Do not over-engineer error handling

Handle errors that can realistically occur.

Use useful user-facing behavior and useful developer diagnostics.

Do not add huge error-handling frameworks for simple operations.

## 9. No speculative code

Do not implement features that were not requested.

Do not add:

- future-proof abstractions
- unused configuration
- unused types
- unused dependencies
- commented-out alternative implementations
- "just in case" code

Implement the current requirement cleanly.

## 10. Preserve existing behavior

When modifying an existing feature:

- do not break unrelated screens,
- do not change unrelated styling,
- do not rename public interfaces unnecessarily,
- do not modify working code without a reason.

The safest change is usually the smallest change that solves the actual problem.

---

# React Native / Expo Rules

## Navigation

Use the project's existing Expo Router architecture.

Do not introduce another navigation library unless explicitly required.

## Styling

Prefer the existing styling approach used by the project.

Do not introduce a new styling framework merely for convenience.

## Assets

Reuse existing assets when possible.

Do not add large assets unnecessarily.

## Native functionality

Before adding a native package, determine whether:

- Expo already provides the functionality,
- the package supports Expo SDK 54,
- it requires a development build,
- it requires native configuration.

Do not assume every React Native package works with Expo Go.

## Platform differences

When behavior differs between Android, iOS, and web, handle the difference explicitly and keep the platform-specific code small.

Do not introduce a cross-platform abstraction unless it actually reduces complexity.

---

# Dependency Installation Procedure

When a new package is genuinely necessary:

### Expo package

```bash
npx expo install <package>
```

### Non-Expo JavaScript package

Use npm only after confirming it does not conflict with the project's Expo / React Native versions:

```bash
npm install <package>
```

### After installation

Check:

```bash
npm run lint
```

If the package has native requirements, also verify its Expo SDK 54 compatibility and whether a development build is required.

Never install a package just because it is popular.

---

# Task Execution Workflow

For every task:

## Step 1 — Understand

Identify:

- exact requested behavior,
- affected screen/component,
- existing implementation,
- constraints.

## Step 2 — Inspect

Read the relevant files before editing.

Do not guess the architecture.

## Step 3 — Plan minimally

Choose the smallest implementation that satisfies the requirement.

## Step 4 — Implement

Change only relevant code.

Avoid unrelated refactoring.

## Step 5 — Self-review

Check:

- logic
- imports
- types
- navigation
- state
- platform behavior
- unused code
- accidental changes

## Step 6 — Lint

Always run:

```bash
npm run lint
```

## Step 7 — Fix

If lint fails, fix the actual errors and run it again.

```bash
npm run lint
```

Repeat until successful.

## Step 8 — Completion

Only after a successful final lint run may the task be reported as completed.

---

# What "Done" Means

A task is done only when:

- the requested behavior is implemented,
- no unnecessary code was introduced,
- dependency versions remain compatible with Expo SDK 54,
- the changed code has been reviewed,
- `npm run lint` passes,
- no known syntax/lint errors remain.

If any of these conditions is not satisfied, the task is **not complete**.

---

# Forbidden Shortcuts

Do not:

```bash
npm install <expo-package>@latest
```

without checking compatibility.

Do not:

```bash
npm audit fix --force
```

as a blind fix.

Do not disable ESLint rules to hide errors.

Do not remove type checking or lint configuration to make the project appear healthy.

Do not rewrite unrelated files.

Do not add dependencies for trivial functionality.

Do not claim success without running:

```bash
npm run lint
```

---

# Final Principle

> Make it work. Make it correct. Make it simple. Then stop.

Do not optimize code that does not need optimization.

Do not abstract code that does not need abstraction.

Do not add dependencies that do not need to exist.

Do not change working code without a concrete reason.

**Smallest correct change + verified lint = completed task.**
