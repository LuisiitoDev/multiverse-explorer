import type { FeatureFlagStrategy } from '../../types/featureFlag'

/**
 * Composes strategies into one, delegating to each in order and taking the
 * first that has an opinion. Being a `FeatureFlagStrategy` itself, it can be
 * nested inside another composite without any caller noticing.
 */
export function createCompositeFeatureFlagStrategy(
  strategies: readonly FeatureFlagStrategy[],
): FeatureFlagStrategy {
  return {
    name: `composite(${strategies.map((strategy) => strategy.name).join(' > ')})`,
    evaluate: (flag) => {
      for (const strategy of strategies) {
        const decision = strategy.evaluate(flag)

        if (decision !== undefined) {
          return decision
        }
      }

      return undefined
    },
  }
}
