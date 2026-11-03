import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultFeatureFlagStrategy } from './index'
import {
  createRuntimeFeatureFlagStrategy,
  loadRuntimeFeatureConfig,
} from './runtimeFeatureFlagStrategy'

describe('createRuntimeFeatureFlagStrategy', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['off', false],
  ])('parses FEATURE_GLOBE_3D=%s', (raw, expected) => {
    expect(createRuntimeFeatureFlagStrategy({ FEATURE_GLOBE_3D: raw }).evaluate('globe3d')).toBe(
      expected,
    )
  })

  it.each([[undefined], [''], ['yes'], [42], [null]])('abstains for %s', (raw) => {
    expect(
      createRuntimeFeatureFlagStrategy({ FEATURE_GLOBE_3D: raw }).evaluate('globe3d'),
    ).toBeUndefined()
  })

  it('fails closed through the default chain for missing or invalid config', () => {
    expect(createDefaultFeatureFlagStrategy({}).evaluate('globe3d')).toBe(false)
    expect(createDefaultFeatureFlagStrategy({ FEATURE_GLOBE_3D: 'banana' }).evaluate('globe3d')).toBe(
      false,
    )
    expect(createDefaultFeatureFlagStrategy({ FEATURE_GLOBE_3D: 'true' }).evaluate('globe3d')).toBe(
      true,
    )
  })
})

describe('loadRuntimeFeatureConfig', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the parsed object on success and requests it uncached', async () => {
    const fetchMock = vi.fn(async () => new Response('{"FEATURE_GLOBE_3D":"true"}'))

    await expect(loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)).resolves.toEqual({
      FEATURE_GLOBE_3D: 'true',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/config.json',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('returns an empty config for a non-2xx response', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 404 }))

    await expect(loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)).resolves.toEqual({})
  })

  it('returns an empty config for malformed JSON', async () => {
    const fetchMock = vi.fn(async () => new Response('<html>'))

    await expect(loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)).resolves.toEqual({})
  })

  it.each([['[1,2]'], ['"text"'], ['null']])('returns an empty config for %s', async (body) => {
    const fetchMock = vi.fn(async () => new Response(body))

    await expect(loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)).resolves.toEqual({})
  })

  it('returns an empty config when the network fails', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('network')
    })

    await expect(loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)).resolves.toEqual({})
  })

  it('returns an empty config when the request times out', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
        }),
    )

    const pending = loadRuntimeFeatureConfig(fetchMock as unknown as typeof fetch)
    await vi.advanceTimersByTimeAsync(3500)

    await expect(pending).resolves.toEqual({})
  })
})
