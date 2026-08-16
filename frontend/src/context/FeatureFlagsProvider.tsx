import type { ReactNode } from 'react'
import type { FeatureFlagStrategy } from '../types/featureFlag'
import { FeatureFlagsContext } from './featureFlagsContext'

type FeatureFlagsProviderProps = Readonly<{
  strategy: FeatureFlagStrategy
  children: ReactNode
}>

/**
 * Injects a strategy into the tree. The strategy is a prop rather than
 * constructed here, so the choice of source stays at the composition root.
 */
function FeatureFlagsProvider({ strategy, children }: FeatureFlagsProviderProps) {
  return <FeatureFlagsContext.Provider value={strategy}>{children}</FeatureFlagsContext.Provider>
}

export default FeatureFlagsProvider
