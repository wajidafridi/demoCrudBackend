import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupAuthGuard } from '@/router/guards'
import { routes } from '@/router/routes'
import { useAuthStore } from '@/stores/authStore'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { JwtClaimNames } from '@/utils/jwt'

// These cases test the guard against the session's known rights. A failed refresh keeps them.
// Live refresh behavior is covered in permissionRefresh.spec.ts.
vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  fetchCurrentAccess: vi.fn().mockRejectedValue(new Error('offline')),
}))

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

function installSession(options: {
  userName?: string
  permissions?: string[]
  expSecondsFromNow?: number
}): void {
  const token = makeToken({
    [JwtClaimNames.nameIdentifier]: '1',
    [JwtClaimNames.name]: options.userName ?? 'tester',
    [JwtClaimNames.role]: 'User',
    [JwtClaimNames.permission]: options.permissions ?? [],
    [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + (options.expSecondsFromNow ?? 60 * 30),
  })
  setAccessToken(token)
  useAuthStore().restoreSession()
}

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  setupAuthGuard(router)
  return router
}

describe('auth navigation guard', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    sessionStorage.clear()
    clearAccessToken()
  })

  it('allows a public route without authentication', async () => {
    const router = createTestRouter()
    await router.push({ name: 'login' })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects unauthenticated users from the dashboard to login', async () => {
    const router = createTestRouter()
    await router.push({ name: 'home' })
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })

  it('redirects unauthenticated users from a protected route to login', async () => {
    const router = createTestRouter()
    await router.push({ name: 'users' })
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('preserves the original destination in the redirect query', async () => {
    const router = createTestRouter()
    await router.push('/users/create')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/users/create')
  })

  it('allows an authenticated user with the required permission', async () => {
    installSession({ permissions: ['User_View'] })
    const router = createTestRouter()
    await router.push({ name: 'users' })
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('redirects an authenticated user without the required permission to access denied', async () => {
    installSession({ permissions: ['User_View'] })
    const router = createTestRouter()
    await router.push({ name: 'users-create' })
    expect(router.currentRoute.value.name).toBe('access-denied')
  })

  it('requires User_Edit to open the edit user route', async () => {
    installSession({ permissions: ['User_View'] })
    const router = createTestRouter()
    await router.push({ name: 'users-edit', params: { id: '2' } })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['User_Edit'] })
    await router.push({ name: 'users-edit', params: { id: '2' } })
    expect(router.currentRoute.value.name).toBe('users-edit')
  })

  it('requires Role_Edit to open the edit role route', async () => {
    installSession({ permissions: ['Role_View'] })
    const router = createTestRouter()
    await router.push({ name: 'roles-edit', params: { id: '2' } })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['Role_Edit'] })
    await router.push({ name: 'roles-edit', params: { id: '2' } })
    expect(router.currentRoute.value.name).toBe('roles-edit')
  })

  it('requires Role_View and Right_View to open rights management', async () => {
    installSession({ permissions: ['Role_View'] })
    const router = createTestRouter()
    await router.push({ name: 'rights' })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['RoleRight_Assign'] })
    await router.push({ name: 'rights' })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['Role_View', 'Right_View'] })
    await router.push({ name: 'rights' })
    expect(router.currentRoute.value.name).toBe('rights')
  })

  it('redirects the legacy role rights route to the selected role', async () => {
    installSession({ permissions: ['Role_View', 'RoleRight_Assign'] })
    const router = createTestRouter()
    await router.push({ name: 'roles-rights', params: { id: '4' } })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['Role_View', 'Right_View'] })
    await router.push({ name: 'roles-rights', params: { id: '4' } })
    expect(router.currentRoute.value.name).toBe('rights')
    expect(router.currentRoute.value.query.roleId).toBe('4')
  })

  it('allows auth-only routes when authenticated even without permission metadata', async () => {
    installSession({ permissions: [] })
    const router = createTestRouter()
    await router.push({ name: 'account' })
    expect(router.currentRoute.value.name).toBe('account')
  })

  it('shows the not-found page for an unknown path without signing in', async () => {
    const router = createTestRouter()
    await router.push('/no-such-page')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('keeps a signed-in user on the not-found page', async () => {
    installSession({ permissions: ['User_View'] })
    const router = createTestRouter()
    await router.push('/no-such-page')
    expect(router.currentRoute.value.name).toBe('not-found')

    await router.push({ name: 'users' })
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('does not loop between login and access-denied routes', async () => {
    const router = createTestRouter()

    await router.push({ name: 'login' })
    expect(router.currentRoute.value.name).toBe('login')

    await router.push({ name: 'access-denied' })
    expect(router.currentRoute.value.name).toBe('access-denied')

    installSession({ permissions: ['User_View'] })
    await router.push({ name: 'login', query: { redirect: '/users' } })
    expect(router.currentRoute.value.name).toBe('users')

    await router.push({ name: 'access-denied' })
    expect(router.currentRoute.value.name).toBe('access-denied')
  })
})
