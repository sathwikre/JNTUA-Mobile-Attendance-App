# AGENTS.md

## 1. Project Identity & Governance

This document governs all automated agents and software engineers working on **JNTUA Attendance**, a cross-platform mobile application powered by **Expo SDK 54** and **React Native**.

### Core Directives:
* **SDK 54 Compatibility:** Expo SDK 54 is strictly mandatory. All added packages and updates MUST be compatible with Expo SDK 54.
* **Code Minimalism:** Prefer direct, concise implementation over unnecessary abstractions. If a minimal 5-line implementation achieves the exact result of a complex pattern, use the 5-line implementation.
* **Strict Typing & Modularity:** TypeScript must be strictly enforced—never use explicit or implicit `any`. Enforce modular architecture with decoupled, single-responsibility modules and components.
* **Mandatory Lint Gate:** A task is **NEVER** complete until `npm run lint` executes and passes cleanly without errors.

---

## 2. Pinned Technical Stack (Expo SDK 54)

All work must strictly adhere to the project's installed core configuration:

| Domain | Dependency / Tool | Version Constraint |
| :--- | :--- | :--- |
| **Framework Base** | Expo SDK | `54` (`~54.0.35`) |
| **Core Runtimes** | React Native / React | `0.81.5` / `19.1.0` |
| **Routing** | Expo Router | `~6.0.24` |
| **Language & Tooling**| TypeScript / ESLint | `~5.9.2` / `^9.25.0` |
| **Native Packages** | Gesture Handler / Reanimated | `~2.28.0` / `~4.1.1` |
| **Layout Runtimes** | Safe Area Context / Screens | `~5.6.0` / `~4.16.0` |

*The `package.json` file is the source of truth. Do not upgrade core framework dependencies unless explicitly instructed.*

---

## 3. Mandatory Task Completion Gate

A task is officially **Incomplete** until the final lint check passes.

### Execution Protocol:
1. **Implement:** Write minimal, strictly-typed, and modular code.
2. **Execute Gate Command:**
   ```bash
   npm run lint
   ```
3. **Resolve Flags:**
   * **If Errors Occur:** Identify root causes, fix the underlying code, and re-run `npm run lint`.
   * **Prohibited:** Never disable ESLint rules, inject `@ts-ignore` / `@ts-expect-error`, or modify lint configuration merely to force a pass.
4. **Final Sign-off:** Declare completion only when `npm run lint` finishes with **0 errors**.

---

## 4. Package & Dependency Rules

### 1. Prohibition of `@latest`
Never install packages using `npm install <package>@latest`. Newer package versions frequently break runtime compatibility with Expo SDK 54.

### 2. Standard Installation Method
Always use Expo's resolution utility to install native or Expo-related packages:
```bash
npx expo install <package-name>
```

### 3. Dependency Pre-checks
Before introducing any new dependency:
* Verify compatibility with Expo SDK 54.
* Confirm whether the required logic can be implemented simply using standard TypeScript or existing packages.
* Avoid adding dependencies for trivial utility tasks.

---

## 5. Architectural & Code Quality Rules

### A. Modular Design & Strict Types
* **Strict Typing:** All props, parameters, return types, and hooks must be fully typed. Do not use `any` or unsafely cast types (`as unknown as T`).
* **Modular Single-Responsibility:** Keep logic, styling, state management, and UI rendering cleanly decoupled.
* **Derived State:** Do not duplicate or mirror state. Derive calculated values directly during render.

### B. Minimalist Code Principles
* **Avoid Over-Engineering:** Do not create wrapper components, custom hooks, or utility abstractions for single-use operations. Abstract only when logic is reused in 3 or more places.
* **No Speculative Code:** Implement strictly what is required. Do not leave commented-out code, unused utility functions, or "just in case" abstractions.
* **Avoid Unnecessary Effects:** Do not use `useEffect` for logic that can be handled inside event handlers or derived directly during render.

---

## 6. Execution Workflow

```
[1. Understand Context] ---> [2. Minimal Implementation] ---> [3. Enforce Strict Types] ---> [4. Execute Lint Gate] ---> [5. Complete]
```

1. **Inspect:** Read existing files and understand system context before editing.
2. **Minimal Change:** Apply the smallest safe change required to satisfy the feature.
3. **Verify:** Ensure strict typing, modular separation, and platform stability (iOS/Android/Web).
4. **Lint Check:** Run `npm run lint` and resolve any flagged errors.
