import { DEFAULT_OTA_CONFIG } from './otaDefaults';
import { OTACache, OTAConfig, OTAUpdate } from './otaTypes';

// ── Constants ──
const OTA_CACHE_KEY = 'ota_cache';
const OTA_LAST_FETCH_KEY = 'ota_last_fetch';
const FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ⚠️ Change this to your actual deployed API URL
const OTA_API_URL = 'https://jntua-attendance-app.vercel.app/api/ota/latest';

// ── Simple SHA256 for verification (optional) ──
async function sha256(text: string): Promise<string> {
  // React Native doesn't have crypto.subtle; skip verification on RN
  // If you need it, use react-native-quick-crypto or a polyfill
  return '';
}

/**
 * OTA Service — fetches, caches, and provides the active scraper script + config.
 *
 * Fallback chain: Remote API → AsyncStorage cache → Bundled defaults
 */
class OTAService {
  /**
   * Fetch the latest OTA update from the server.
   * Returns null if fetch fails (network error, non-200, etc.)
   */
  async fetchLatestUpdate(): Promise<OTAUpdate | null> {
    try {
      const response = await fetch(OTA_API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        // 10 second timeout via AbortController
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn('OTA: Server returned', response.status);
        return null;
      }

      const data: OTAUpdate = await response.json();

      // Basic validation
      if (!data.version || !data.scraperScript || !data.config) {
        console.warn('OTA: Invalid payload structure');
        return null;
      }

      console.log('OTA: Fetched update v' + data.version);
      return data;
    } catch (err: any) {
      console.warn('OTA: Fetch failed —', err.message);
      return null;
    }
  }

  /**
   * Save OTA update to AsyncStorage cache.
   */
  async saveToCache(update: OTAUpdate): Promise<void> {
    try {
      const cache: OTACache = {
        version: update.version,
        scraperScript: update.scraperScript,
        config: update.config,
        styleScript: update.styleScript,
        cachedAt: Date.now(),
      };

      const { storage } = require('./storage');
      await storage.setObject(OTA_CACHE_KEY, cache);
      await storage.set(OTA_LAST_FETCH_KEY, Date.now().toString());
      console.log('OTA: Cached update v' + update.version);
    } catch (err) {
      console.warn('OTA: Cache save failed —', err);
    }
  }

  /**
   * Read cached OTA update from AsyncStorage.
   */
  async readCache(): Promise<OTACache | null> {
    try {
      const { storage } = require('./storage');
      const cache = await storage.getObject<OTACache>(OTA_CACHE_KEY);
      return cache;
    } catch (err) {
      console.warn('OTA: Cache read failed —', err);
      return null;
    }
  }

  /**
   * Check if enough time has passed since last fetch.
   */
  async shouldFetch(): Promise<boolean> {
    try {
      const { storage } = require('./storage');
      const lastFetch = await storage.getString(OTA_LAST_FETCH_KEY);
      if (!lastFetch) return true;
      return Date.now() - parseInt(lastFetch, 10) > FETCH_INTERVAL_MS;
    } catch {
      return true;
    }
  }

  /**
   * Get the active scraper script.
   * Priority: remote → cache → bundled
   */
  async getActiveScript(bundledScript: string): Promise<string> {
    // Try fetching if interval has passed
    if (await this.shouldFetch()) {
      const update = await this.fetchLatestUpdate();
      if (update) {
        await this.saveToCache(update);
        return update.scraperScript;
      }
    }

    // Try cache
    const cache = await this.readCache();
    if (cache?.scraperScript) {
      return cache.scraperScript;
    }

    // Fallback to bundled
    console.log('OTA: Using bundled script (no remote, no cache)');
    return bundledScript;
  }

  /**
   * Get the active OTA config.
   * Priority: cache → bundled defaults
   * (Config comes together with script fetch, so cache is fine)
   */
  async getActiveConfig(): Promise<OTAConfig> {
    const cache = await this.readCache();
    if (cache?.config) {
      return { ...DEFAULT_OTA_CONFIG, ...cache.config };
    }
    return DEFAULT_OTA_CONFIG;
  }

  /**
   * Force-refresh: fetch from server regardless of interval.
   * Useful for a "Check for updates" button.
   */
  async forceRefresh(): Promise<{ script: string; config: OTAConfig } | null> {
    const update = await this.fetchLatestUpdate();
    if (update) {
      await this.saveToCache(update);
      return {
        script: update.scraperScript,
        config: { ...DEFAULT_OTA_CONFIG, ...update.config },
      };
    }

    // Fall back to cache
    const cache = await this.readCache();
    if (cache) {
      return {
        script: cache.scraperScript,
        config: { ...DEFAULT_OTA_CONFIG, ...cache.config },
      };
    }

    return null;
  }

  /**
   * Clear cached OTA data (e.g. on logout).
   */
  async clearCache(): Promise<void> {
    try {
      const { storage } = require('./storage');
      await storage.removeItem(OTA_CACHE_KEY);
      await storage.removeItem(OTA_LAST_FETCH_KEY);
      console.log('OTA: Cache cleared');
    } catch (err) {
      console.warn('OTA: Cache clear failed —', err);
    }
  }
}

// Singleton instance
export const otaService = new OTAService();
