import type { FeatureFlagKey, FeatureFlagStrategy } from '../../types/featureFlag'
import { createCompositeFeatureFlagStrategy } from './compositeFeatureFlagStrategy'
import { createEnvironmentFeatureFlagStrategy } from './environmentFeatureFlagStrategy'
import { createStaticFeatureFlagStrategy } from './staticFeatureFlagStrategy'

export { createCompositeFeatureFlagStrategy } from './compositeFeatureFlagStrategy'
export { createEnvironmentFeatureFlagStrategy } from './environmentFeatureFlagStrategy'
export { createStaticFeatureFlagStrategy } from './staticFeatureFlagStrategy'

/**
 * The value a flag takes when nothing else decides. New features start off.
 */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  characterModalV2: false,
  myMultiverse: true,
}

/**
 * The application's default chain: environment first, defaults last. This is
 * the single place that names concrete strategies — adding a remote source
 * later means editing this function and nothing downstream of it.
 */
export function createDefaultFeatureFlagStrategy(): FeatureFlagStrategy {
  return createCompositeFeatureFlagStrategy([
    createEnvironmentFeatureFlagStrategy(),
    createStaticFeatureFlagStrategy(DEFAULT_FEATURE_FLAGS),
  ])
}
