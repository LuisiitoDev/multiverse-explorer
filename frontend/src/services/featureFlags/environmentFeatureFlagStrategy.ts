import type { FeatureFlagKey, FeatureFlagStrategy } from '../../types/featureFlag'

const ENV_VAR_BY_FLAG: Record<FeatureFlagKey, string> = {
  characterModalV2: 'VITE_FEATURE_CHARACTER_MODAL_V2',
}

const TRUTHY = new Set(['true', '1', 'on', 'enabled'])
const FALSY = new Set(['false', '0', 'off', 'disabled'])

/**
 * An unset or unparseable value yields `undefined` rather than `false`, so a
 * typo in the environment falls through to the defaults instead of silently
 * disabling a feature that was meant to be on.
 */
function parseDecision(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }

  const normalized = String(raw).trim().toLowerCase()

  if (TRUTHY.has(normalized)) {
    return true
  }

  if (FALSY.has(normalized)) {
    return false
  }

  return undefined
}

/**
 * Resolves flags from Vite's build-time environment. The source is injected so
 * the strategy can be tested without touching the real `import.meta.env`.
 */
export function createEnvironmentFeatureFlagStrategy(
  env: Record<string, unknown> = import.meta.env,
): FeatureFlagStrategy {
  return {
    name: 'environment',
    evaluate: (flag) => parseDecision(env[ENV_VAR_BY_FLAG[flag]]),
  }
}
