import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ThemeSelector from '@/components/ThemeSelector.vue'
import { THEME_STORAGE_KEY } from '@/theme/theme'
import { useTheme } from '@/theme/useTheme'
import type { ThemePreference } from '@/theme/theme'

function selectValue(wrapper: ReturnType<typeof mount>): string {
  const element = wrapper.get('select').element
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error('Theme control is not a select.')
  }

  return element.value
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear()
    useTheme().setPreference('system')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useTheme().setPreference('system')
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
  })

  it('displays the current preference', () => {
    useTheme().setPreference('dark')
    const wrapper = mount(ThemeSelector)

    expect(wrapper.get('label').text()).toContain('Theme')
    expect(wrapper.get('select').text()).toContain('Light')
    expect(wrapper.get('select').text()).toContain('Dark')
    expect(wrapper.get('select').text()).toContain('System')
    expect(selectValue(wrapper)).toBe('dark')
  })

  it('selecting Light calls the theme controller and shows Light', async () => {
    const theme = useTheme()
    const setPreference = vi.spyOn(theme, 'setPreference')
    const wrapper = mount(ThemeSelector)

    await wrapper.get('select').setValue('light')

    expect(setPreference).toHaveBeenCalledWith('light')
    expect(theme.preference.value).toBe('light')
    expect(selectValue(wrapper)).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('selecting Dark calls the theme controller and shows Dark', async () => {
    const theme = useTheme()
    const setPreference = vi.spyOn(theme, 'setPreference')
    const wrapper = mount(ThemeSelector)

    await wrapper.get('select').setValue('dark')

    expect(setPreference).toHaveBeenCalledWith('dark')
    expect(theme.preference.value).toBe('dark')
    expect(selectValue(wrapper)).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('selecting System calls the theme controller and shows System', async () => {
    const theme = useTheme()
    theme.setPreference('light')
    const setPreference = vi.spyOn(theme, 'setPreference')
    const wrapper = mount(ThemeSelector)

    await wrapper.get('select').setValue('system')

    expect(setPreference).toHaveBeenCalledWith('system')
    expect(theme.preference.value).toBe('system')
    expect(selectValue(wrapper)).toBe('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('reflects the preference after each selection', async () => {
    const wrapper = mount(ThemeSelector)

    await wrapper.get('select').setValue('light')
    expect(selectValue(wrapper)).toBe('light')

    await wrapper.get('select').setValue('dark')
    expect(selectValue(wrapper)).toBe('dark')

    await wrapper.get('select').setValue('system')
    expect(selectValue(wrapper)).toBe('system')
  })

  it('stays synchronized when the preference changes outside the selector', async () => {
    const wrapper = mount(ThemeSelector)
    const preferences: ThemePreference[] = ['light', 'dark', 'system']

    for (const preference of preferences) {
      useTheme().setPreference(preference)
      await nextTick()
      expect(selectValue(wrapper)).toBe(preference)
    }
  })
})
