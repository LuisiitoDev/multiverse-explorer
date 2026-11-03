import type { FeatureFlagKey, FeatureFlagStrategy } from '../../types/featureFlag'
import { parseDecision } from './environmentFeatureFlagStrategy'

const CONFIG_KEY_BY_FLAG: Record<FeatureFlagKey, string> = {
  characterModalV2: 'FEATURE_CHARACTER_MODAL_V2',
  myMultiverse: 'FEATURE_MY_MULTIVERSE',
  globe3d: 'FEATURE_GLOBE_3D',
}

const CONFIG_URL = '/config.json'
const CONFIG_TIMEOUT_MS = 3000

/**
 * Fetches the container's runtime config. Any failure (network, non-2xx,
 * malformed JSON, timeout) yields an empty config so flags fall through to
 * the defaults, which are off.
 */
export async function loadRuntimeFeatureConfig(
  fetchImpl: typeof fetch = globalThis.fetch,
  url: string = CONFIG_URL,
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS)

  try {
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal })

    if (!response.ok) {
      return {}
    }

    const body: unknown = await response.json()

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return {}
    }

    return body as Record<string, unknown>
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}

/** Resolves flags from the runtime `FEATURE_*` config; invalid values abstain. */
export function createRuntimeFeatureFlagStrategy(
  config: Record<string, unknown>,
): FeatureFlagStrategy {
  return {
    name: 'runtime',
    evaluate: (flag) => parseDecision(config[CONFIG_KEY_BY_FLAG[flag]]),
  }
}
