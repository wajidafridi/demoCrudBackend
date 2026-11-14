import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ThemeSelector from '@/components/ThemeSelector.vue'
import { COLOR_SCHEME_QUERY, THEME_STORAGE_KEY } from '@/theme/theme'
import { useTheme } from '@/theme/useTheme'

function createSchemeMedia(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
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
    matchMedia: () => media,
    setMatches(matches: boolean) {
      media.matches = matches
      const event = { matches, media: COLOR_SCHEME_QUERY } as MediaQueryListEvent
      for (const listener of [...listeners]) {
        listener(event)
      }
    },
  }
}

const scheme = createSchemeMedia(false)

function checked(wrapper: ReturnType<typeof mount>, label: string): string | undefined {
  return wrapper.get(`[aria-label="${label}"]`).attributes('aria-checked')
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', scheme.matchMedia)
    localStorage.clear()
    scheme.setMatches(false)
    useTheme().setPreference('system')
  })

  afterEach(() => {
    useTheme().setPreference('system')
    scheme.setMatches(false)
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
    vi.unstubAllGlobals()
  })

  it('checks System for a fresh preference and leaves Light and Dark unchecked', () => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    const wrapper = mount(ThemeSelector)

    expect(useTheme().preference.value).toBe('system')
    expect(useTheme().resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(checked(wrapper, 'System theme')).toBe('true')
    expect(checked(wrapper, 'Light theme')).toBe('false')
    expect(checked(wrapper, 'Dark theme')).toBe('false')
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Theme')
  })

  it('keeps System checked when the OS is dark and still resolves to dark', async () => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    scheme.setMatches(true)
    await nextTick()
    const wrapper = mount(ThemeSelector)

    expect(useTheme().preference.value).toBe('system')
    expect(useTheme().resolvedTheme.value).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(checked(wrapper, 'System theme')).toBe('true')
    expect(checked(wrapper, 'Dark theme')).toBe('false')
    expect(checked(wrapper, 'Light theme')).toBe('false')
  })

  it('keeps System checked when the OS theme changes', async () => {
    const wrapper = mount(ThemeSelector)
    expect(checked(wrapper, 'System theme')).toBe('true')
    expect(useTheme().resolvedTheme.value).toBe('light')

    scheme.setMatches(true)
    await nextTick()

    expect(useTheme().preference.value).toBe('system')
    expect(useTheme().resolvedTheme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
    expect(checked(wrapper, 'System theme')).toBe('true')
    expect(checked(wrapper, 'Dark theme')).toBe('false')
    expect(checked(wrapper, 'Light theme')).toBe('false')
  })

  it('saves Light and keeps it when the OS later changes', async () => {
    const wrapper = mount(ThemeSelector)

    await wrapper.get('[aria-label="Light theme"]').trigger('click')

    expect(useTheme().preference.value).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(checked(wrapper, 'Light theme')).toBe('true')
    expect(checked(wrapper, 'System theme')).toBe('false')

    scheme.setMatches(true)
    await nextTick()

    expect(useTheme().preference.value).toBe('light')
    expect(useTheme().resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(checked(wrapper, 'Light theme')).toBe('true')
  })

  it('saves Dark and keeps it when the OS later changes', async () => {
    const wrapper = mount(ThemeSelector)

    await wrapper.get('[aria-label="Dark theme"]').trigger('click')

    expect(useTheme().preference.value).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(checked(wrapper, 'Dark theme')).toBe('true')

    scheme.setMatches(false)
    await nextTick()

    expect(useTheme().preference.value).toBe('dark')
    expect(checked(wrapper, 'Dark theme')).toBe('true')
    expect(checked(wrapper, 'Light theme')).toBe('false')
  })

  it('cycles System, Light, and Dark with the keyboard', async () => {
    const wrapper = mount(ThemeSelector)
    const group = wrapper.get('[role="radiogroup"]')

    await group.trigger('keydown', { key: 'ArrowRight' })
    expect(useTheme().preference.value).toBe('light')
    expect(checked(wrapper, 'Light theme')).toBe('true')

    await group.trigger('keydown', { key: 'ArrowRight' })
    expect(useTheme().preference.value).toBe('dark')
    expect(checked(wrapper, 'Dark theme')).toBe('true')

    await group.trigger('keydown', { key: 'ArrowRight' })
    expect(useTheme().preference.value).toBe('system')
    expect(checked(wrapper, 'System theme')).toBe('true')

    await group.trigger('keydown', { key: 'ArrowLeft' })
    expect(useTheme().preference.value).toBe('dark')
    expect(wrapper.get('[aria-label="System theme"]').attributes('title')).toBe('System theme')
    expect(wrapper.get('[aria-label="Light theme"]').attributes('title')).toBe('Light theme')
    expect(wrapper.get('[aria-label="Dark theme"]').attributes('title')).toBe('Dark theme')
  })
})
