/**
 * Theme preference is the user's choice: light, dark, or system.
 * Resolved theme is the appearance actually applied: light or dark.
 *
 * index.html runs the same rules before Vue loads. Keep the storage key,
 * the color-scheme query, and the data-theme / data-theme-preference
 * attributes in sync with that script.
 */

export const THEME_STORAGE_KEY = 'app-theme'

export const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

export const THEME_MODES = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof THEME_MODES)[number]

export type ResolvedTheme = 'light' | 'dark'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** Missing or invalid stored values fall back to system. */
export function readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  if (storage == null) {
    return 'system'
  }

  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Persists the preference only. The resolved theme is derived, not stored. */
export function writeThemePreference(
  storage: Pick<Storage, 'setItem'> | null,
  preference: ThemePreference,
): void {
  if (storage == null) {
    return
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be disabled or full. The in-memory preference still applies.
  }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return preference
}

export function prefersDarkScheme(matchMedia: (query: string) => MediaQueryList): boolean {
  try {
    return matchMedia(COLOR_SCHEME_QUERY).matches
  } catch {
    return false
  }
}

export function applyTheme(
  root: HTMLElement,
  preference: ThemePreference,
  resolved: ResolvedTheme,
): void {
  root.setAttribute('data-theme', resolved)
  root.setAttribute('data-theme-preference', preference)
}
