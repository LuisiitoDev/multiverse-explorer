import { describe, expect, it } from 'vitest'
import type { FeatureFlagStrategy } from '../../types/featureFlag'
import { createCompositeFeatureFlagStrategy } from './compositeFeatureFlagStrategy'
import { createEnvironmentFeatureFlagStrategy } from './environmentFeatureFlagStrategy'
import { createStaticFeatureFlagStrategy } from './staticFeatureFlagStrategy'

describe('createStaticFeatureFlagStrategy', () => {
  it('returns the configured value and abstains for unconfigured flags', () => {
    expect(createStaticFeatureFlagStrategy({ characterModalV2: true }).evaluate('characterModalV2'))
      .toBe(true)
    expect(createStaticFeatureFlagStrategy({ characterModalV2: false }).evaluate('characterModalV2'))
      .toBe(false)
    expect(createStaticFeatureFlagStrategy({}).evaluate('characterModalV2')).toBeUndefined()
  })
})

describe('createEnvironmentFeatureFlagStrategy', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['ON', true],
    [' enabled ', true],
    ['false', false],
    ['0', false],
    ['off', false],
    ['DISABLED', false],
  ])('parses %s as %s', (raw, expected) => {
    const strategy = createEnvironmentFeatureFlagStrategy({
      VITE_FEATURE_CHARACTER_MODAL_V2: raw,
    })

    expect(strategy.evaluate('characterModalV2')).toBe(expected)
  })

  it.each([[undefined], [''], ['yes'], ['maybe']])(
    'abstains rather than disabling for %s',
    (raw) => {
      const strategy = createEnvironmentFeatureFlagStrategy({
        VITE_FEATURE_CHARACTER_MODAL_V2: raw,
      })

      expect(strategy.evaluate('characterModalV2')).toBeUndefined()
    },
  )
})

describe('createCompositeFeatureFlagStrategy', () => {
  const abstaining: FeatureFlagStrategy = { name: 'abstaining', evaluate: () => undefined }

  it('takes the first strategy that has an opinion', () => {
    const strategy = createCompositeFeatureFlagStrategy([
      abstaining,
      createStaticFeatureFlagStrategy({ characterModalV2: true }),
      createStaticFeatureFlagStrategy({ characterModalV2: false }),
    ])

    expect(strategy.evaluate('characterModalV2')).toBe(true)
  })

  it('treats an explicit false as an opinion, not an abstention', () => {
    const strategy = createCompositeFeatureFlagStrategy([
      createStaticFeatureFlagStrategy({ characterModalV2: false }),
      createStaticFeatureFlagStrategy({ characterModalV2: true }),
    ])

    expect(strategy.evaluate('characterModalV2')).toBe(false)
  })

  it('abstains when every strategy abstains', () => {
    expect(
      createCompositeFeatureFlagStrategy([abstaining, abstaining]).evaluate('characterModalV2'),
    ).toBeUndefined()
  })

  it('is itself composable', () => {
    const inner = createCompositeFeatureFlagStrategy([abstaining])
    const outer = createCompositeFeatureFlagStrategy([
      inner,
      createStaticFeatureFlagStrategy({ characterModalV2: true }),
    ])

    expect(outer.evaluate('characterModalV2')).toBe(true)
  })
})
