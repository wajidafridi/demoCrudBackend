import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/router/routes'
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
    setActivePinia(createPinia())
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
