import { computed, readonly, ref, watchEffect, type Ref } from 'vue'

import {
  COLOR_SCHEME_QUERY,
  THEME_MODES,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  prefersDarkScheme,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/theme/theme'

export interface ThemeController {
  readonly preference: Readonly<Ref<ThemePreference>>
  readonly resolvedTheme: Readonly<Ref<ResolvedTheme>>
  readonly modes: readonly ThemePreference[]
  setPreference: (preference: ThemePreference) => void
  dispose: () => void
}

export interface ThemeControllerOptions {
  /** `null` skips persistence. Omit to use localStorage when it is available. */
  storage?: Storage | null
  matchMedia?: (query: string) => MediaQueryList
  root?: HTMLElement
}

/**
 * One shared controller for the page. Component calls must not add another
 * operating-system listener, and unmounting a component must not remove it.
 * `dispose()` is for tests and Vite hot reload.
 */
let controller: ThemeController | null = null

export function createThemeController(options: ThemeControllerOptions = {}): ThemeController {
  const storage = options.storage === undefined ? safeLocalStorage() : options.storage
  const matchMedia = options.matchMedia ?? ((query: string) => window.matchMedia(query))
  const root = options.root ?? document.documentElement

  const preference = ref<ThemePreference>(readThemePreference(storage))
  const prefersDark = ref(prefersDarkScheme(matchMedia))
  const resolvedTheme = computed(() => resolveTheme(preference.value, prefersDark.value))

  const stop = watchEffect(
    () => {
      applyTheme(root, preference.value, resolvedTheme.value)
    },
    { flush: 'sync' },
  )

  let media: MediaQueryList | null = null
  const onSchemeChange = (event: MediaQueryListEvent): void => {
    prefersDark.value = event.matches
  }

  try {
    media = matchMedia(COLOR_SCHEME_QUERY)
    media.addEventListener('change', onSchemeChange)
  } catch {
    media = null
  }

  function setPreference(next: ThemePreference): void {
    if (!isThemePreference(next)) {
      return
    }

    // Refresh the OS scheme before the preference changes so System applies once.
    prefersDark.value = prefersDarkScheme(matchMedia)
    preference.value = next
    writeThemePreference(storage, next)
  }

  function dispose(): void {
    stop()
    media?.removeEventListener('change', onSchemeChange)
    media = null
  }

  return {
    preference: readonly(preference),
    resolvedTheme,
    modes: THEME_MODES,
    setPreference,
    dispose,
  }
}

export function useTheme(): ThemeController {
  controller ??= createThemeController()
  return controller
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    controller?.dispose()
    controller = null
  })
}

function safeLocalStorage(): Storage | null {
  try {
    const storage = window.localStorage
    storage.getItem(THEME_STORAGE_KEY)
    return storage
  } catch {
    return null
  }
}
