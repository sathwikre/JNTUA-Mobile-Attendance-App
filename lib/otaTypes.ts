/* ─────────────────────────────────────────────
   OTA Update Types
   ───────────────────────────────────────────── */

/** Color rules for attendance zones */
export interface OTAColors {
  safe: string;        // e.g. '#22C55E'
  caution: string;     // e.g. '#EAB308'
  warning: string;     // e.g. '#F59E0B'
  danger: string;      // e.g. '#EF4444'
  accent: string;      // primary brand e.g. '#7C3AED'
  info: string;        // e.g. '#6366F1'
}

/** Labels shown in status badges */
export interface OTALabels {
  safe: string;        // e.g. '✅ Safe'
  caution: string;     // e.g. '⚠️ Caution'
  risk: string;        // e.g. '⚠️ Risk'
  low: string;         // e.g. '❌ Low'
}

/** Thresholds that control which zone a % falls into */
export interface OTAThresholds {
  safe: number;        // ≥ this = safe zone (default 77)
  minimum: number;     // ≥ this = passing (default 75)
  warning: number;     // ≥ this but < minimum = risk (default 70)
  // below warning = low/danger
}

/** Full OTA config delivered to the app */
export interface OTAConfig {
  colors: OTAColors;
  labels: OTALabels;
  thresholds: OTAThresholds;
  /** Accent color for the header / brand elements */
  accentColor: string;
  /** College portal URL (in case it changes) */
  portalUrl: string;
  /** Whether quick tip is shown */
  showQuickTip: boolean;
  /** Custom tip text (overrides default) */
  quickTipText?: string;
}

/** The full OTA update payload from the server */
export interface OTAUpdate {
  /** Incremented version number */
  version: number;
  /** The scraper JS to inject into WebView */
  scraperScript: string;
  /** Optional CSS/JS to inject for style overrides */
  styleScript?: string;
  /** Config that drives UI components */
  config: OTAConfig;
  /** Minimum app version required (force update if lower) */
  minAppVersion?: string;
  /** Human-readable changelog */
  changelog?: string;
  /** SHA256 hash of scraperScript for verification */
  scriptHash?: string;
}

/** Cached OTA data stored in AsyncStorage */
export interface OTACache {
  version: number;
  scraperScript: string;
  config: OTAConfig;
  styleScript?: string;
  cachedAt: number;  // timestamp
}
