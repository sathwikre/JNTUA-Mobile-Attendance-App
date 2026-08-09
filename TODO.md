# EAS + OTA Update Infrastructure — Implementation TODO

- [x] 1. Install `expo-updates` via `npx expo install expo-updates`
- [x] 2. Create `utils/updateManager.ts` (UpdateStatus, UpdateManager, shouldCheckOnMount, useUpdateManager)
- [x] 3. Modify `app/index.tsx` to consume `useUpdateManager` + render update banner
- [x] 4. Update `app.json` (updates block + runtimeVersion) and `package.json` (npm scripts)
- [x] 5. Create `eas.json` (preview → staging, production → production) — manual, no EAS login/build
- [x] 6. Verify `.gitignore` (no secrets in eas.json)
- [x] 7. Run `npm run lint` (0 errors) + `npx tsc --noEmit`
- [x] 8. Update `README.md` with OTA publishing runbook
