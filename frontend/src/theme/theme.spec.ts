import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  COLOR_SCHEME_QUERY,
  THEME_MODES,
  THEME_STORAGE_KEY,
  readThemePreference,
  resolveTheme,
} from '@/theme/theme'
import { createThemeController, type ThemeController } from '@/theme/useTheme'

function createStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      const value = values.get(key)
      return value === undefined ? null : value
    },
    key(index: number) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function createBrokenStorage(): Storage {
  const fail = (): never => {
    throw new Error('storage unavailable')
  }

  return {
    get length() {
      return fail()
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  }
}

function createSchemeMedia(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  let addCount = 0

  const media = {
    matches: initialMatches,
    media: COLOR_SCHEME_QUERY,
    onchange: null,
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      addCount += 1
      if (typeof listener === 'function') {
        listeners.add(listener as (event: MediaQueryListEvent) => void)
      }
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      if (typeof listener === 'function') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void)
      }
    },
  } as MediaQueryList

  return {
    media,
    matchMedia: () => media,
    addCount: () => addCount,
    listenerCount: () => listeners.size,
    setMatches(matches: boolean) {
      media.matches = matches
      const event = { matches, media: COLOR_SCHEME_QUERY } as MediaQueryListEvent
      for (const listener of [...listeners]) {
        listener(event)
      }
    },
  }
}

function readInitScript(): string {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  const match = html.match(/<script>([\s\S]*?)<\/script>/)
  const source = match?.[1]
  if (source == null) {
    throw new Error('Theme init script is missing from index.html')
  }

  return source
}

function runInitScript(): void {
  const run = new Function(readInitScript()) as () => void
  run()
}

describe('theme resolution', () => {
  it('uses system when storage is missing, null, or invalid', () => {
    expect(readThemePreference(null)).toBe('system')
    expect(readThemePreference(createStorage())).toBe('system')
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: 'auto' }))).toBe('system')
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: '' }))).toBe('system')
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: 'Light' }))).toBe('system')
    expect(readThemePreference(createBrokenStorage())).toBe('system')
  })

  it('restores a valid saved preference', () => {
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: 'light' }))).toBe('light')
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark')
    expect(readThemePreference(createStorage({ [THEME_STORAGE_KEY]: 'system' }))).toBe('system')
  })

  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)('resolves %s with OS dark=%s to %s', (preference, prefersDark, resolved) => {
    expect(resolveTheme(preference, prefersDark)).toBe(resolved)
  })

  it('exposes light, dark, and system', () => {
    expect(THEME_MODES).toEqual(['light', 'dark', 'system'])
  })
})

describe('createThemeController', () => {
  let active: ThemeController | undefined

  afterEach(() => {
    active?.dispose()
    active = undefined
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
  })

  function mountTheme(
    options: {
      stored?: string
      prefersDark?: boolean
      storage?: Storage
      useDocument?: boolean
    } = {},
  ) {
    const scheme = createSchemeMedia(options.prefersDark ?? false)
    const storage =
      options.storage !== undefined
        ? options.storage
        : createStorage(options.stored == null ? {} : { [THEME_STORAGE_KEY]: options.stored })
    const root = options.useDocument ? document.documentElement : document.createElement('html')
    const theme = createThemeController({
      storage,
      matchMedia: () => scheme.media,
      ...(options.useDocument ? {} : { root }),
    })
    active = theme
    return { theme, scheme, storage, root }
  }

  it('defaults to system when no saved preference exists', () => {
    const { theme, storage, root } = mountTheme()

    expect(theme.preference.value).toBe('system')
    expect(theme.resolvedTheme.value).toBe('light')
    expect(theme.modes).toEqual(['light', 'dark', 'system'])
    expect(root.getAttribute('data-theme')).toBe('light')
    expect(root.getAttribute('data-theme-preference')).toBe('system')
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('restores a saved light preference', () => {
    const { theme, root } = mountTheme({ stored: 'light', prefersDark: true })

    expect(theme.preference.value).toBe('light')
    expect(theme.resolvedTheme.value).toBe('light')
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  it('restores a saved dark preference', () => {
    const { theme, root } = mountTheme({ stored: 'dark', prefersDark: false })

    expect(theme.preference.value).toBe('dark')
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('falls back to system when the saved value is invalid', () => {
    const { theme } = mountTheme({ stored: 'sepia' })

    expect(theme.preference.value).toBe('system')
    expect(theme.resolvedTheme.value).toBe('light')
  })

  it('resolves light regardless of the OS preference', () => {
    const { theme } = mountTheme({ stored: 'light', prefersDark: true })

    expect(theme.resolvedTheme.value).toBe('light')
  })

  it('resolves dark regardless of the OS preference', () => {
    const { theme } = mountTheme({ stored: 'dark', prefersDark: false })

    expect(theme.resolvedTheme.value).toBe('dark')
  })

  it('resolves system to light when the OS preference is light', () => {
    const { theme } = mountTheme({ stored: 'system', prefersDark: false })

    expect(theme.resolvedTheme.value).toBe('light')
  })

  it('resolves system to dark when the OS preference is dark', () => {
    const { theme } = mountTheme({ stored: 'system', prefersDark: true })

    expect(theme.resolvedTheme.value).toBe('dark')
  })

  it('updates the resolved theme when the preference changes', () => {
    const { theme, root } = mountTheme({ prefersDark: false })

    theme.setPreference('dark')
    expect(theme.preference.value).toBe('dark')
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')

    theme.setPreference('light')
    expect(theme.resolvedTheme.value).toBe('light')
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  it('persists the selected preference and not the resolved theme', () => {
    const { theme, storage } = mountTheme({ prefersDark: true })

    theme.setPreference('light')
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light')

    theme.setPreference('system')
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('follows OS changes while the preference is system', () => {
    const { theme, scheme, storage, root } = mountTheme({ stored: 'system', prefersDark: false })

    scheme.setMatches(true)

    expect(theme.preference.value).toBe('system')
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(root.getAttribute('data-theme-preference')).toBe('system')
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('ignores OS changes while the preference is light or dark', () => {
    const { theme, scheme, root } = mountTheme({ stored: 'light', prefersDark: false })

    scheme.setMatches(true)
    expect(theme.resolvedTheme.value).toBe('light')
    expect(root.getAttribute('data-theme')).toBe('light')

    theme.setPreference('dark')
    scheme.setMatches(false)
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('uses the current OS preference when switching back to system', () => {
    const { theme, scheme, root } = mountTheme({ stored: 'light', prefersDark: false })

    scheme.setMatches(true)
    theme.setPreference('system')

    expect(theme.preference.value).toBe('system')
    expect(theme.resolvedTheme.value).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(root.getAttribute('data-theme-preference')).toBe('system')
  })

  it('sets data-theme and data-theme-preference on the document element', () => {
    const { theme } = mountTheme({ stored: 'dark', prefersDark: false, useDocument: true })

    expect(theme.resolvedTheme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('dark')
  })

  it('registers one OS listener and removes it on dispose', () => {
    const { theme, scheme } = mountTheme({ stored: 'system', prefersDark: false })

    expect(scheme.addCount()).toBe(1)
    expect(scheme.listenerCount()).toBe(1)

    theme.dispose()
    active = undefined
    scheme.setMatches(true)

    expect(scheme.listenerCount()).toBe(0)
    expect(theme.resolvedTheme.value).toBe('light')
  })

  it('keeps working when storage and matchMedia are unavailable', () => {
    const root = document.createElement('html')
    active = createThemeController({
      storage: createBrokenStorage(),
      matchMedia: () => {
        throw new Error('matchMedia unavailable')
      },
      root,
    })

    expect(active.preference.value).toBe('system')
    expect(active.resolvedTheme.value).toBe('light')
    expect(root.getAttribute('data-theme')).toBe('light')

    expect(() => active?.setPreference('dark')).not.toThrow()
    expect(active.preference.value).toBe('dark')
    expect(active.resolvedTheme.value).toBe('dark')
  })
})

describe('theme init script', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
  })

  it('matches the shared resolver for saved and system preferences', () => {
    const saved = [null, 'light', 'dark', 'system', 'nope'] as const

    for (const stored of saved) {
      for (const prefersDark of [false, true]) {
        localStorage.clear()
        if (stored != null) {
          localStorage.setItem(THEME_STORAGE_KEY, stored)
        }

        vi.stubGlobal('matchMedia', () => ({ matches: prefersDark }))
        runInitScript()

        const preference = readThemePreference(localStorage)
        expect(document.documentElement.getAttribute('data-theme-preference')).toBe(preference)
        expect(document.documentElement.getAttribute('data-theme')).toBe(
          resolveTheme(preference, prefersDark),
        )
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(stored)
      }
    }
  })

  it('falls back safely when localStorage and matchMedia throw', () => {
    vi.stubGlobal('localStorage', createBrokenStorage())
    vi.stubGlobal('matchMedia', () => {
      throw new Error('matchMedia unavailable')
    })

    expect(() => runInitScript()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

describe('theme tokens', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

  it('uses a blue accent and keeps the old purple values out of the palette', () => {
    expect(css).toContain('--accent: #1d4ed8;')
    expect(css).toContain('--accent-hover: #1e40af;')
    expect(css).toContain('--accent: #93c5fd;')
    expect(css).toContain('--accent-foreground: #0f172a;')
    expect(css).not.toMatch(/#(?:6d28d9|7c3aed|5b21b6|c4b5fd)/i)
    expect(css).not.toContain('violet')
  })
})
