import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupAccessWatcher, setupAuthGuard } from '@/router/guards'
import { routes } from '@/router/routes'
import { fetchCurrentAccess, login as loginRequest } from '@/services/authService'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { deleteUser, listUsers } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import type { CurrentAccess } from '@/types/auth'
import { JwtClaimNames } from '@/utils/jwt'
import UsersView from '@/views/UsersView.vue'

vi.mock('@/services/authService', () => ({
  login: vi.fn(),
  fetchCurrentAccess: vi.fn(),
}))

vi.mock('@/services/userService', () => ({
  listUsers: vi.fn(),
  deleteUser: vi.fn(),
  USERS_PAGE_SIZE: 10,
}))

vi.mock('@/services/accountService', () => ({
  getAccount: vi.fn().mockResolvedValue({ id: 1, roleId: 2 }),
}))

const ALL_USER_RIGHTS = ['User_View', 'User_Create', 'User_Edit', 'User_Delete']

function makeToken(permissions: string[]): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      [JwtClaimNames.nameIdentifier]: '1',
      [JwtClaimNames.name]: 'admin',
      [JwtClaimNames.role]: 'Admin',
      [JwtClaimNames.permission]: permissions,
      [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60 * 30,
    }),
  ).toString('base64url')
  return `${header}.${body}.sig`
}

function access(permissions: string[], accessVersion: string): CurrentAccess {
  return { id: 1, userName: 'admin', roleId: 2, roleName: 'Admin', permissions, accessVersion }
}

/** Simulates `POST /api/auth/login`: JWT plus the rights and version the backend returned. */
async function signIn(permissions: string[], accessVersion: string) {
  vi.mocked(loginRequest).mockResolvedValueOnce({
    id: 1,
    userName: 'admin',
    email: 'admin@example.com',
    roleId: 2,
    roleName: 'Admin',
    accessToken: makeToken(permissions),
    expiresAtUtc: new Date(Date.now() + 30 * 60_000).toISOString(),
    permissions,
    accessVersion,
  })
  const store = useAuthStore()
  await store.login({ username: 'admin', password: 'unused' })
  return store
}

function createTestRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  setupAuthGuard(router)
  return router
}

describe('active-session permission refresh', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
    vi.mocked(fetchCurrentAccess).mockReset()
    vi.mocked(loginRequest).mockReset()
    vi.mocked(listUsers).mockReset()
  })

  afterEach(() => {
    sessionStorage.clear()
    clearAccessToken()
  })

  it('uses the rights from the login response', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')

    expect(store.permissions).toEqual(ALL_USER_RIGHTS)
    expect(store.accessVersion).toBe('v1')
  })

  it('denies the edit route immediately after User_Edit is revoked, then allows it after restore', async () => {
    await signIn(ALL_USER_RIGHTS, 'v1')
    const router = createTestRouter()

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View', 'User_Create'], 'v2'))
    await router.push({ name: 'users-edit', params: { id: '5' } })
    expect(router.currentRoute.value.name).toBe('access-denied')

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View', 'User_Create'], 'v2'))
    await router.push({ name: 'users-create' })
    expect(router.currentRoute.value.name).toBe('users-create')

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(ALL_USER_RIGHTS, 'v1'))
    await router.push({ name: 'users-edit', params: { id: '5' } })
    expect(router.currentRoute.value.name).toBe('users-edit')
  })

  it('denies the create route immediately after User_Create is revoked', async () => {
    await signIn(ALL_USER_RIGHTS, 'v1')
    const router = createTestRouter()

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(
      access(['User_View', 'User_Edit', 'User_Delete'], 'v3'),
    )
    await router.push({ name: 'users-create' })

    expect(router.currentRoute.value.name).toBe('access-denied')
  })

  it('opens a route after its right is granted during the session', async () => {
    await signIn(['User_View'], 'v1')
    const router = createTestRouter()

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View', 'Role_View'], 'v4'))
    await router.push({ name: 'roles' })

    expect(router.currentRoute.value.name).toBe('roles')
  })

  it('keeps the last known rights when the refresh fails for a non-401 reason', async () => {
    await signIn(['User_View'], 'v1')
    const router = createTestRouter()

    vi.mocked(fetchCurrentAccess).mockRejectedValueOnce(new Error('Network Error'))
    await router.push({ name: 'users' })
    expect(router.currentRoute.value.name).toBe('users')

    vi.mocked(fetchCurrentAccess).mockRejectedValueOnce(new Error('Network Error'))
    await router.push({ name: 'users-edit', params: { id: '5' } })
    expect(router.currentRoute.value.name).toBe('access-denied')
  })

  it('leaves the open edit page when a background refresh removes User_Edit', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')
    const router = createTestRouter()
    setupAccessWatcher(router)

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(ALL_USER_RIGHTS, 'v1'))
    await router.push({ name: 'users-edit', params: { id: '5' } })
    expect(router.currentRoute.value.name).toBe('users-edit')

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View'], 'v2'))
    store.handleAccessVersion('v2')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('access-denied')
  })

  it('ignores a matching version header and refreshes once for a new one', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')

    store.handleAccessVersion('v1')
    expect(fetchCurrentAccess).not.toHaveBeenCalled()

    let resolve: (value: CurrentAccess) => void = () => {}
    vi.mocked(fetchCurrentAccess).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    store.handleAccessVersion('v2')
    store.handleAccessVersion('v2')
    void store.refreshAccess()
    expect(fetchCurrentAccess).toHaveBeenCalledTimes(1)

    resolve(access(['User_View'], 'v2'))
    await flushPromises()
    expect(store.permissions).toEqual(['User_View'])
    expect(store.accessVersion).toBe('v2')
  })

  it('drops a refresh answer that arrives after the session ended', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')
    let resolve: (value: CurrentAccess) => void = () => {}
    vi.mocked(fetchCurrentAccess).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )

    const pending = store.refreshAccess()
    store.logout()
    resolve(access(ALL_USER_RIGHTS, 'v1'))
    await pending

    expect(store.isAuthenticated).toBe(false)
    expect(store.permissions).toEqual([])
  })

  it('hides Edit and Delete in the users table as soon as the rights are revoked', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')
    vi.mocked(listUsers).mockResolvedValue({
      users: [
        {
          id: 2,
          isSystem: false,
          firstName: 'Ada',
          lastName: 'Lovelace',
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          userName: 'ada',
          roleId: 3,
          roleName: 'User',
          address: null,
          phoneNumber: null,
          gender: null,
          dateOfBirth: null,
          imageUrl: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: null,
          age: null,
        },
      ],
      message: 'Users fetched successfully.',
      pagination: {
        pageNumber: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    })
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push({ name: 'users' })
    const wrapper = mount(UsersView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('[aria-label="Edit ada"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Delete ada"]').exists()).toBe(true)

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View', 'User_Create'], 'v2'))
    store.handleAccessVersion('v2')
    await flushPromises()

    expect(wrapper.find('[aria-label="Edit ada"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete ada"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Create user')

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(ALL_USER_RIGHTS, 'v1'))
    store.handleAccessVersion('v1')
    await flushPromises()

    expect(wrapper.find('[aria-label="Edit ada"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Delete ada"]').exists()).toBe(true)
  })

  it('explains a refused delete when User_Delete is revoked while the dialog is open', async () => {
    const store = await signIn(ALL_USER_RIGHTS, 'v1')
    vi.mocked(listUsers).mockResolvedValue({
      users: [
        {
          id: 2,
          isSystem: false,
          firstName: 'Ada',
          lastName: 'Lovelace',
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          userName: 'ada',
          roleId: 3,
          roleName: 'User',
          address: null,
          phoneNumber: null,
          gender: null,
          dateOfBirth: null,
          imageUrl: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: null,
          age: null,
        },
      ],
      message: 'Users fetched successfully.',
      pagination: {
        pageNumber: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    })
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push({ name: 'users' })
    const wrapper = mount(UsersView, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()

    await wrapper.get('[aria-label="Delete ada"]').trigger('click')
    await flushPromises()

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View'], 'v2'))
    store.handleAccessVersion('v2')
    await flushPromises()

    const confirm = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Delete user',
    )
    confirm?.click()
    await flushPromises()

    expect(vi.mocked(deleteUser)).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('You no longer have permission to delete users.')
    wrapper.unmount()
  })

  it('restores identity from the token after reload and replaces stale token rights on the first refresh', async () => {
    setAccessToken(makeToken(ALL_USER_RIGHTS))
    const store = useAuthStore()
    store.restoreSession()
    expect(store.accessVersion).toBeNull()

    vi.mocked(fetchCurrentAccess).mockResolvedValueOnce(access(['User_View'], 'v9'))
    await store.ensureFreshAccess()

    expect(store.permissions).toEqual(['User_View'])
    expect(store.hasPermission('User_Delete')).toBe(false)
  })
})
