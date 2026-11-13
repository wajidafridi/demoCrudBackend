import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '@/router/routes'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import { JwtClaimNames } from '@/utils/jwt'
import DashboardView from '@/views/DashboardView.vue'

function makeToken(permissions: string[], roleName = 'User'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      [JwtClaimNames.nameIdentifier]: '7',
      [JwtClaimNames.name]: 'ada',
      [JwtClaimNames.role]: roleName,
      [JwtClaimNames.permission]: permissions,
      [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60 * 30,
    }),
  ).toString('base64url')
  return `${header}.${body}.sig`
}

async function mountDashboard(permissions: string[]): Promise<ReturnType<typeof mount>> {
  const pinia = createPinia()
  setActivePinia(pinia)
  setAccessToken(makeToken(permissions))
  useAuthStore().restoreSession()

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  await router.push({ name: 'home' })
  await router.isReady()

  return mount(DashboardView, {
    global: { plugins: [pinia, router] },
  })
}

describe('DashboardView', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    clearAccessToken()
  })

  it('welcomes the signed-in user and links every authorized area', async () => {
    const wrapper = await mountDashboard(['User_View', 'Role_View', 'Right_View'])

    expect(wrapper.get('h1').text()).toBe('Welcome back, ada')
    expect(wrapper.text()).toContain('You are signed in as User.')
    expect(wrapper.text()).not.toContain('Total users')
    expect(wrapper.text()).not.toContain('Recent activity')

    const titles = wrapper.findAll('h2').map((heading) => heading.text())
    expect(titles).toEqual(['Users', 'Roles', 'Rights Management', 'My Account'])
    expect(wrapper.get('a[href="/users"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/roles"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/rights"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/account"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('does not include Users, Roles, or Rights')
  })

  it('hides Users, Roles, and Rights when those permissions are missing', async () => {
    const wrapper = await mountDashboard([])

    expect(wrapper.find('a[href="/users"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/roles"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/rights"]').exists()).toBe(false)
    expect(wrapper.get('a[href="/account"]').text()).toContain('My Account')
    expect(wrapper.text()).toContain('does not include Users, Roles, or Rights')
  })

  it('shows Roles without Rights unless both rights permissions are present', async () => {
    const rolesOnly = await mountDashboard(['Role_View'])
    expect(rolesOnly.get('a[href="/roles"]').exists()).toBe(true)
    expect(rolesOnly.find('a[href="/rights"]').exists()).toBe(false)
    expect(rolesOnly.find('a[href="/users"]').exists()).toBe(false)

    const rightsOnly = await mountDashboard(['Right_View'])
    expect(rightsOnly.find('a[href="/rights"]').exists()).toBe(false)
    expect(rightsOnly.get('a[href="/account"]').exists()).toBe(true)
  })

  it('uses surface cards and a responsive grid without a solid accent banner', async () => {
    const wrapper = await mountDashboard(['User_View'])

    expect(wrapper.get('section').classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'max-w-6xl']),
    )
    const grid = wrapper.get('.grid')
    expect(grid.classes()).toContain('grid-cols-1')
    expect(grid.classes()).toContain('sm:grid-cols-2')
    expect(wrapper.get('a[href="/users"]').classes()).toContain('bg-surface')
    expect(wrapper.get('header').classes().join(' ')).not.toContain('bg-accent')
    expect(wrapper.html()).not.toContain('bg-slate-')
    expect(wrapper.html()).not.toContain('bg-white')
  })
})
