import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef, useState } from "react";

export type UpdateStatus =
  | "checking"
  | "applying"
  | "ready"
  | "upToDate"
  | "error"
  | "unknown";

export interface UpdateManager {
  status: UpdateStatus;
  checkForUpdate: () => Promise<void>;
  lastError: string | null;
}

const CHECK_TIMEOUT_MS = 30_000;

/**
 * Deterministic guard to avoid redundant update checks on every hot reload /
 * re-mount during development. Returns `false` in `__DEV__` and in Expo Go
 * (where `expo-updates` is unavailable), `true` in production builds.
 */
export function shouldCheckOnMount(): boolean {
  if (__DEV__) return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return true;
  }
  return false;
}

/**
 * React hook that wraps the `expo-updates` API into the typed `UpdateStatus`
 * state machine. Returns `{ status, checkForUpdate, lastError }`.
 */
export function useUpdateManager(): UpdateManager {
  const {
    isChecking,
    isDownloading,
    isRestarting,
    isUpdatePending,
    isUpdateAvailable,
    checkError,
    downloadError,
  } = Updates.useUpdates();

  const [manualStatus, setManualStatus] = useState<UpdateStatus | null>(null);
  const [checkingTimedOut, setCheckingTimedOut] = useState(false);
  const checkingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isChecking) {
      checkingStartTimeRef.current = Date.now();
      setCheckingTimedOut(false);
    } else {
      checkingStartTimeRef.current = null;
      setCheckingTimedOut(false);
    }
  }, [isChecking]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isChecking && checkingStartTimeRef.current && !checkingTimedOut) {
      interval = setInterval(() => {
        if (
          checkingStartTimeRef.current !== null &&
          Date.now() - checkingStartTimeRef.current > CHECK_TIMEOUT_MS
        ) {
          setCheckingTimedOut(true);
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isChecking, checkingTimedOut]);

  const status: UpdateStatus = (isChecking && !checkingTimedOut)
    ? "checking"
    : isDownloading || isRestarting
      ? "applying"
      : checkError || downloadError
        ? "error"
        : manualStatus ??
          (isUpdateAvailable || isUpdatePending ? "ready" : "unknown");

  const lastError: string | null =
    checkError?.message ?? downloadError?.message ?? null;

  const checkForUpdate = useCallback(async () => {
    if (!shouldCheckOnMount()) return;
    setManualStatus("checking");

    const timeoutId = setTimeout(() => {
      setManualStatus("unknown");
    }, CHECK_TIMEOUT_MS);

    try {
      const result = await Updates.checkForUpdateAsync();
      clearTimeout(timeoutId);
      if (result.isAvailable) {
        setManualStatus("applying");
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        setManualStatus("upToDate");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("Update check failed:", err);
      setManualStatus("error");
    }
  }, []);

  return { status, checkForUpdate, lastError };
}
