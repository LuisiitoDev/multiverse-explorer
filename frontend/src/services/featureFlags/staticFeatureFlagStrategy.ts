import type { FeatureFlagKey, FeatureFlagStrategy } from '../../types/featureFlag'

/**
 * Resolves flags from an in-memory map. Used as the last link in the chain to
 * supply defaults, and directly in tests to pin a flag to a known value.
 */
export function createStaticFeatureFlagStrategy(
  values: Partial<Record<FeatureFlagKey, boolean>>,
): FeatureFlagStrategy {
  return {
    name: 'static',
    evaluate: (flag) => values[flag],
  }
}
