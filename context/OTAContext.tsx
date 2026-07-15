import React, { createContext, useState, useEffect, useCallback } from 'react';
import { OTAConfig } from '../lib/otaTypes';
import { otaService } from '../lib/otaService';
import { DEFAULT_OTA_CONFIG } from '../lib/otaDefaults';

interface OTAContextValue {
  /** Current active config (merged defaults + OTA override) */
  config: OTAConfig;
  /** The active scraper script */
  script: string;
  /** Whether OTA is currently fetching */
  loading: boolean;
  /** OTA version number (0 = bundled only) */
  version: number;
  /** Force refresh from server */
  refresh: () => Promise<void>;
}

export const OTAContext = createContext<OTAContextValue>({
  config: DEFAULT_OTA_CONFIG,
  script: '',
  loading: false,
  version: 0,
  refresh: async () => {},
});

interface OTAProviderProps {
  /** The bundled scraper script to use as fallback */
  bundledScript: string;
  children: React.ReactNode;
}

export function OTAProvider({ bundledScript, children }: OTAProviderProps) {
  const [config, setConfig] = useState<OTAConfig>(DEFAULT_OTA_CONFIG);
  const [script, setScript] = useState<string>(bundledScript);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load active script + config (uses cache if within interval)
      const [activeScript, activeConfig] = await Promise.all([
        otaService.getActiveScript(bundledScript),
        otaService.getActiveConfig(),
      ]);

      setScript(activeScript);
      setConfig(activeConfig);

      // Read version from cache
      const cache = await otaService.readCache();
      if (cache) {
        setVersion(cache.version);
      }
    } catch (err) {
      console.warn('OTAProvider: Load failed, using defaults —', err);
      setScript(bundledScript);
      setConfig(DEFAULT_OTA_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [bundledScript]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    const result = await otaService.forceRefresh();
    if (result) {
      setScript(result.script);
      setConfig(result.config);
      const cache = await otaService.readCache();
      if (cache) setVersion(cache.version);
    }
  }, []);

  return (
    <OTAContext.Provider value={{ config, script, loading, version, refresh }}>
      {children}
    </OTAContext.Provider>
  );
}
