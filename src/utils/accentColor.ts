const ACCENT_CLASSES = ['accent-green', 'accent-cyan', 'accent-purple', 'accent-amber']

export function getAccentClass(seed: string): string {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return ACCENT_CLASSES[hash % ACCENT_CLASSES.length]
}
