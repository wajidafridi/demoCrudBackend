import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'

import AppSidebar from '@/components/AppSidebar.vue'
import { routes } from '@/router/routes'
import { setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import { JwtClaimNames } from '@/utils/jwt'

function sessionToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      [JwtClaimNames.nameIdentifier]: '1',
      [JwtClaimNames.name]: 'tester',
      [JwtClaimNames.role]: 'User',
      [JwtClaimNames.permission]: ['User_View', 'Role_View'],
      [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60 * 30,
    }),
  ).toString('base64url')
  return `${header}.${body}.sig`
}

describe('AppSidebar mobile drawer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('closes on Escape, moves focus into the drawer, and restores the opener', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    setAccessToken(sessionToken())
    useAuthStore().restoreSession()

    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push({ name: 'home' })
    await router.isReady()

    const opener = document.createElement('button')
    opener.textContent = 'Open navigation'
    document.body.append(opener)
    opener.focus()

    const wrapper = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: false },
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    })

    await wrapper.setProps({ mobileOpen: true })
    await flushPromises()

    const close = wrapper.get('[aria-label="Close navigation"]')
    expect(document.activeElement).toBe(close.element)
    expect(wrapper.get('aside').attributes('role')).toBe('dialog')

    const links = wrapper.findAll('a')
    const last = links[links.length - 1]
    last?.element.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(close.element)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('closeMobile')).toHaveLength(1)

    await wrapper.setProps({ mobileOpen: false })
    await flushPromises()

    expect(document.activeElement).toBe(opener)
    expect(wrapper.get('aside').attributes('role')).toBeUndefined()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(opener)

    wrapper.unmount()
  })
})
