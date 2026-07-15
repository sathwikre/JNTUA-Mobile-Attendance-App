import { useContext } from 'react';
import { OTAContext } from '../context/OTAContext';

/**
 * Hook to access OTA config in any component.
 *
 * Usage:
 *   const { config } = useOTAConfig();
 *   const isSafe = percentage >= config.thresholds.minimum;
 */
export function useOTAConfig() {
  return useContext(OTAContext);
}
