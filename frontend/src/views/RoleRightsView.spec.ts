import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '@/services/apiError'
import { assignRoleRights, getRole, getRoleRights, removeRoleRights } from '@/services/roleService'
import { listAllRights } from '@/services/rightService'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import { JwtClaimNames } from '@/utils/jwt'
import RoleRightsView from '@/views/RoleRightsView.vue'

vi.mock('@/services/roleService', () => ({
  getRole: vi.fn(),
  getRoleRights: vi.fn(),
  assignRoleRights: vi.fn(),
  removeRoleRights: vi.fn(),
}))

vi.mock('@/services/rightService', () => ({
  listAllRights: vi.fn(),
}))

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

async function mountRights(path = '/roles/2/rights') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/roles', name: 'roles', component: { template: '<div>Roles list</div>' } },
      { path: '/roles/:id/rights', name: 'roles-rights', component: RoleRightsView },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()

  const wrapper = mount(RoleRightsView, {
    global: {
      plugins: [pinia, router],
    },
  })

  return wrapper
}

describe('RoleRightsView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
    installSession(['Role_View', 'RoleRight_Assign', 'Right_View'])
    vi.mocked(getRole).mockReset()
    vi.mocked(getRoleRights).mockReset()
    vi.mocked(assignRoleRights).mockReset()
    vi.mocked(removeRoleRights).mockReset()
    vi.mocked(listAllRights).mockReset()
    vi.mocked(getRole).mockResolvedValue({ id: 2, name: 'Admin' })
    vi.mocked(getRoleRights).mockResolvedValue([{ id: 1, name: 'User_View' }])
    vi.mocked(listAllRights).mockResolvedValue([
      { id: 1, name: 'User_View' },
      { id: 2, name: 'User_Create' },
    ])
  })

  it('shows loading, then assigned and available rights from the API', async () => {
    let resolveRole: ((value: { id: number; name: string }) => void) | undefined
    vi.mocked(getRole).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRole = resolve
        }),
    )

    const wrapper = await mountRights()
    expect(wrapper.text()).toContain('Loading role rights…')

    resolveRole?.({ id: 2, name: 'Admin' })
    await flushPromises()

    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('User_View')
    expect(wrapper.text()).toContain('User_Create')
    expect(getRoleRights).toHaveBeenCalledWith(2)
    expect(listAllRights).toHaveBeenCalledTimes(1)
  })

  it('assigns a right and refreshes the assigned list', async () => {
    vi.mocked(assignRoleRights).mockResolvedValue([
      { id: 1, name: 'User_View' },
      { id: 2, name: 'User_Create' },
    ])

    const wrapper = await mountRights()
    await flushPromises()

    await wrapper.get('[aria-label="Assign User_Create"]').trigger('click')
    await flushPromises()

    expect(assignRoleRights).toHaveBeenCalledWith(2, { rightIds: [2] })
    expect(wrapper.text()).toContain('User_Create assigned.')
    expect(wrapper.find('[aria-label="Assign User_Create"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Remove User_Create"]').exists()).toBe(true)
  })

  it('removes a right and refreshes the assigned list', async () => {
    vi.mocked(removeRoleRights).mockResolvedValue([])

    const wrapper = await mountRights()
    await flushPromises()

    await wrapper.get('[aria-label="Remove User_View"]').trigger('click')
    await flushPromises()

    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [1] })
    expect(wrapper.text()).toContain('User_View removed.')
    expect(wrapper.text()).toContain('This role has no rights you can see.')
  })

  it('hides assignment controls without RoleRight_Assign', async () => {
    installSession(['Role_View', 'Right_View'])

    const wrapper = await mountRights()
    await flushPromises()

    expect(wrapper.text()).toContain('User_View')
    expect(wrapper.text()).toContain('User_Create')
    expect(wrapper.find('[aria-label="Assign User_Create"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Remove User_View"]').exists()).toBe(false)
  })

  it('does not request the catalog without Right_View', async () => {
    installSession(['Role_View', 'RoleRight_Assign'])

    const wrapper = await mountRights()
    await flushPromises()

    expect(listAllRights).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Right_View')
  })

  it('shows not-found and invalid-link errors', async () => {
    vi.mocked(getRole).mockRejectedValue(
      new ApiClientError('Role with id = 1 was not found.', 404, null),
    )

    const missing = await mountRights('/roles/1/rights')
    await flushPromises()

    expect(missing.text()).toContain('Role with id = 1 was not found.')
    expect(missing.text()).not.toContain('Assigned')

    const invalid = await mountRights('/roles/nope/rights')
    await flushPromises()
    expect(invalid.text()).toContain('This role link is invalid.')
  })

  it('shows an assignment error from the API', async () => {
    vi.mocked(assignRoleRights).mockRejectedValue(
      new ApiClientError('You can only change rights that are assigned to you.', 403, null),
    )

    const wrapper = await mountRights()
    await flushPromises()

    await wrapper.get('[aria-label="Assign User_Create"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You can only change rights that are assigned to you.')
    expect(wrapper.find('[aria-label="Assign User_Create"]').exists()).toBe(true)
  })
})
