import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/router/routes'
import { THEME_STORAGE_KEY } from '@/theme/theme'
import { useTheme } from '@/theme/useTheme'
import LoginView from '@/views/LoginView.vue'

const loginMock = vi.fn()

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: loginMock,
  }),
}))

async function mountLogin(redirect?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  await router.push(redirect == null ? { name: 'login' } : { name: 'login', query: { redirect } })
  await router.isReady()

  const wrapper = mount(LoginView, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    loginMock.mockReset()
    localStorage.clear()
    setActivePinia(createPinia())
    useTheme().setPreference('system')
  })

  afterEach(() => {
    useTheme().setPreference('system')
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
  })

  it('requires username and password before submitting', async () => {
    const { wrapper } = await mountLogin()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.html()).toContain('bg-page')
    expect(wrapper.html()).toContain('bg-accent-solid')
    expect(wrapper.html()).not.toContain('bg-slate-')
    expect(wrapper.text()).toContain('Username is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(wrapper.get('#username').classes()).toContain('border-danger')
    expect(wrapper.get('#password').classes()).toContain('border-danger')
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('places the shared theme toggle above the card and applies Light or Dark immediately', async () => {
    const { wrapper } = await mountLogin()

    const toggle = wrapper.get('[role="radiogroup"]')
    expect(toggle.attributes('aria-label')).toBe('Theme')
    expect(wrapper.get('[aria-label="System theme"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('div.justify-end').element.contains(toggle.element)).toBe(true)
    expect(wrapper.get('section').classes()).toContain('max-w-md')
    expect(wrapper.get('section').classes()).toContain('min-w-0')

    await wrapper.get('[aria-label="Dark theme"]').trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(wrapper.get('[aria-label="Dark theme"]').attributes('aria-checked')).toBe('true')

    await wrapper.get('[aria-label="Light theme"]').trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('shows and hides the password without submitting it', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.get('#password').attributes('type')).toBe('password')
    await wrapper.get('[aria-label="Show password"]').trigger('click')
    expect(wrapper.get('#password').attributes('type')).toBe('text')
    await wrapper.get('[aria-label="Hide password"]').trigger('click')
    expect(wrapper.get('#password').attributes('type')).toBe('password')
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('logs in successfully and redirects to a safe return URL', async () => {
    loginMock.mockResolvedValueOnce({
      id: 1,
      userName: 'tester',
      email: 'tester@example.com',
      roleId: 1,
      roleName: 'User',
      accessToken: 'token',
      expiresAtUtc: new Date().toISOString(),
    })

    const { wrapper, router } = await mountLogin('/users')

    await wrapper.find('#username').setValue('tester')
    await wrapper.find('#password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(loginMock).toHaveBeenCalledTimes(1)
    expect(loginMock).toHaveBeenCalledWith({
      username: 'tester',
      password: 'secret',
    })
    expect(router.currentRoute.value.fullPath).toBe('/users')
  })

  it('falls back to home when the redirect query is unsafe', async () => {
    loginMock.mockResolvedValueOnce({
      id: 1,
      userName: 'tester',
      email: 'tester@example.com',
      roleId: 1,
      roleName: 'User',
      accessToken: 'token',
      expiresAtUtc: new Date().toISOString(),
    })

    const { wrapper, router } = await mountLogin('//evil.example')

    await wrapper.find('#username').setValue('tester')
    await wrapper.find('#password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('shows an API error and stays on the login page when login fails', async () => {
    loginMock.mockRejectedValueOnce(new Error('Invalid username or password.'))

    const { wrapper, router } = await mountLogin('/users')

    await wrapper.find('#username').setValue('tester')
    await wrapper.find('#password').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid username or password.')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('prevents duplicate submissions while login is in progress', async () => {
    let resolveLogin: ((value: unknown) => void) | undefined
    loginMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
    )

    const { wrapper } = await mountLogin()

    await wrapper.find('#username').setValue('tester')
    await wrapper.find('#password').setValue('secret')

    const submitPromise = wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(loginMock).toHaveBeenCalledTimes(1)

    resolveLogin?.({
      id: 1,
      userName: 'tester',
      email: 'tester@example.com',
      roleId: 1,
      roleName: 'User',
      accessToken: 'token',
      expiresAtUtc: new Date().toISOString(),
    })
    await submitPromise
    await flushPromises()
  })
})
