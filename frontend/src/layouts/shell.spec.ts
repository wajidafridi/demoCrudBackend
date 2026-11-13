import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { setupAuthGuard } from '@/router/guards'
import { routes } from '@/router/routes'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import { THEME_STORAGE_KEY } from '@/theme/theme'
import { useTheme } from '@/theme/useTheme'
import { JwtClaimNames } from '@/utils/jwt'

/** Theme-specific palette utilities that the shell should no longer use. */
const HARD_CODED_THEME_COLOR =
  /\b(?:bg|text|border|outline|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|violet|sky|white|black)(?:-\d+)?(?:\/\d+)?\b/

function makeToken(permissions: string[]): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      [JwtClaimNames.nameIdentifier]: '1',
      [JwtClaimNames.name]: 'tester',
      [JwtClaimNames.role]: 'User',
      [JwtClaimNames.permission]: permissions,
      [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60 * 30,
    }),
  ).toString('base64url')
  return `${header}.${body}.sig`
}

function installSession(permissions: string[]): void {
  setAccessToken(makeToken(permissions))
  useAuthStore().restoreSession()
}

async function createAppRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  setupAuthGuard(router)
  await router.push({ name: 'home' })
  await router.isReady()
  return router
}

describe('application shell', () => {
  let pinia: Pinia

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useTheme().setPreference('system')
  })

  afterEach(() => {
    useTheme().setPreference('system')
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preference')
    clearAccessToken()
  })

  it('uses semantic token classes on the layout, header, and sidebar', async () => {
    installSession(['User_View', 'Role_View'])
    const router = await createAppRouter()
    const layout = mount(AppLayout, {
      global: {
        plugins: [pinia, router],
        stubs: { AppHeader: true, AppSidebar: true, RouterView: true },
      },
    })
    const header = mount(AppHeader, {
      props: { pageTitle: 'Users' },
      global: { plugins: [pinia, router] },
    })
    const sidebar = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: true },
      global: { plugins: [pinia, router] },
    })

    expect(layout.html()).toContain('bg-page')
    expect(header.html()).toContain('bg-surface')
    expect(header.html()).toContain('text-foreground')
    expect(header.html()).toContain('border-border')
    expect(header.html()).toContain('outline-focus')
    expect(sidebar.html()).toContain('bg-surface')
    expect(sidebar.html()).toContain('bg-overlay')
    expect(sidebar.html()).toContain('outline-focus')

    expect(layout.html()).not.toMatch(HARD_CODED_THEME_COLOR)
    expect(header.html()).not.toMatch(HARD_CODED_THEME_COLOR)
    expect(sidebar.html()).not.toMatch(HARD_CODED_THEME_COLOR)

    layout.unmount()
    header.unmount()
    sidebar.unmount()
  })

  it('keeps permission-based navigation and the active route cue', async () => {
    installSession(['User_View'])
    const router = await createAppRouter()
    const wrapper = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: false },
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.findAll('a').map((link) => link.attributes('aria-label'))).toEqual([
      'Dashboard',
      'Users',
      'Account',
    ])

    await router.push({ name: 'users' })
    await flushPromises()

    const usersLink = wrapper.get('a[aria-label="Users"]')
    expect(usersLink.attributes('aria-current')).toBe('page')
    expect(usersLink.classes().join(' ')).toContain('bg-accent-solid')
    expect(usersLink.classes().join(' ')).toContain('font-semibold')

    useAuthStore().clearSession()
    await flushPromises()
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('shows role navigation only when the user has Role_View', async () => {
    installSession(['User_View', 'Role_View'])
    const router = await createAppRouter()
    const wrapper = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: false },
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.findAll('a').map((link) => link.attributes('aria-label'))).toEqual([
      'Dashboard',
      'Users',
      'Roles',
      'Account',
    ])
  })

  it('preserves collapse, mobile drawer, and logout behavior', async () => {
    installSession(['User_View'])
    const router = await createAppRouter()
    const sidebar = mount(AppSidebar, {
      props: { collapsed: true, mobileOpen: false },
      global: { plugins: [pinia, router] },
    })

    expect(sidebar.text()).not.toContain('Dashboard')
    expect(sidebar.get('a[aria-label="Dashboard"]').exists()).toBe(true)

    await sidebar.setProps({ mobileOpen: true })
    expect(sidebar.text()).toContain('Dashboard')
    expect(sidebar.html()).toContain('bg-overlay')
    expect(sidebar.html()).toContain('max-lg:translate-x-0')

    await sidebar.get('[aria-label="Close navigation"]').trigger('click')
    expect(sidebar.emitted('closeMobile')).toHaveLength(1)

    await sidebar.get('[aria-label="Expand sidebar"]').trigger('click')
    expect(sidebar.emitted('toggleCollapse')).toHaveLength(1)

    const header = mount(AppHeader, {
      props: { pageTitle: 'Dashboard' },
      global: { plugins: [pinia, router] },
    })
    const notifications = header.get('[aria-label="Notifications"]')
    expect(notifications.attributes('disabled')).toBeDefined()
    expect(notifications.classes()).toContain('disabled:opacity-50')

    await header.get('[aria-label="Open navigation"]').trigger('click')
    expect(header.emitted('openMobile')).toHaveLength(1)

    const logout = header.findAll('button').find((button) => button.text().includes('Log out'))
    expect(logout).toBeDefined()
    await logout?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('shows Rights Management only when the user can view roles and rights', async () => {
    installSession(['Role_View', 'Right_View'])
    const router = await createAppRouter()
    const wrapper = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: false },
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.findAll('a').map((link) => link.attributes('aria-label'))).toEqual([
      'Dashboard',
      'Roles',
      'Rights Management',
      'Account',
    ])

    clearAccessToken()
    installSession(['Right_View'])
    await flushPromises()
    expect(wrapper.findAll('a').map((link) => link.attributes('aria-label'))).not.toContain(
      'Rights Management',
    )

    clearAccessToken()
    installSession(['Role_View'])
    await flushPromises()
    expect(wrapper.findAll('a').map((link) => link.attributes('aria-label'))).toEqual([
      'Dashboard',
      'Roles',
      'Account',
    ])
  })

  it('highlights only the navigation section that owns the current route', async () => {
    installSession([
      'User_View',
      'User_Create',
      'User_Edit',
      'Role_View',
      'Role_Create',
      'Role_Edit',
      'Right_View',
    ])
    const router = await createAppRouter()
    const wrapper = mount(AppSidebar, {
      props: { collapsed: false, mobileOpen: false },
      global: { plugins: [pinia, router] },
    })

    async function expectActive(
      location: Parameters<Router['push']>[0],
      label: string,
    ): Promise<void> {
      await router.push(location)
      await flushPromises()
      expect(
        wrapper.findAll('a[aria-current="page"]').map((link) => link.attributes('aria-label')),
      ).toEqual([label])
    }

    await expectActive({ name: 'home' }, 'Dashboard')
    await expectActive({ name: 'users' }, 'Users')
    await expectActive({ name: 'users-create' }, 'Users')
    await expectActive({ name: 'users-edit', params: { id: '4' } }, 'Users')
    await expectActive({ name: 'roles' }, 'Roles')
    await expectActive({ name: 'roles-create' }, 'Roles')
    await expectActive({ name: 'roles-edit', params: { id: '4' } }, 'Roles')
    await expectActive({ name: 'rights' }, 'Rights Management')
    await expectActive({ name: 'account' }, 'Account')
  })
})
