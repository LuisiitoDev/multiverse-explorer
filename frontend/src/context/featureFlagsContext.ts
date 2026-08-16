import { createContext } from 'react'
import { createDefaultFeatureFlagStrategy } from '../services/featureFlags'
import type { FeatureFlagStrategy } from '../types/featureFlag'

/**
 * Carries the active strategy to consumers. The default keeps components
 * usable in isolation (tests, stories) without a surrounding provider.
 */
export const FeatureFlagsContext = createContext<FeatureFlagStrategy>(
  createDefaultFeatureFlagStrategy(),
)
