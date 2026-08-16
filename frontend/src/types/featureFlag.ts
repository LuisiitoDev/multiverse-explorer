/**
 * Keys are declared here so a flag cannot be referenced without being defined.
 * Adding a flag is a one-line change; every strategy stays untouched.
 */
export type FeatureFlagKey = 'characterModalV2'

/**
 * `undefined` means "this strategy has no opinion", which is what lets
 * strategies be chained without any of them knowing about the others.
 */
export type FeatureFlagDecision = boolean | undefined

/**
 * The strategy contract. Consumers depend on this interface only — never on a
 * concrete source — so swapping env vars for a remote service is a change at
 * the composition root and nowhere else.
 */
export interface FeatureFlagStrategy {
  /** Identifies the strategy in diagnostics; not used for control flow. */
  readonly name: string
  evaluate(flag: FeatureFlagKey): FeatureFlagDecision
}
