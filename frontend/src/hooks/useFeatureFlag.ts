import { useContext } from 'react'
import { FeatureFlagsContext } from '../context/featureFlagsContext'
import type { FeatureFlagKey } from '../types/featureFlag'

/**
 * Resolves a flag to a definite boolean for rendering. A chain that reaches its
 * end without an opinion means "not enabled".
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const strategy = useContext(FeatureFlagsContext)

  return strategy.evaluate(flag) ?? false
}
