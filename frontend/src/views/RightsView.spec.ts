import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { getAccount } from '@/services/accountService'
import { ApiClientError } from '@/services/apiError'
import {
  assignRoleRights,
  getRoleRights,
  listAllRoles,
  removeRoleRights,
} from '@/services/roleService'
import { listAllRights } from '@/services/rightService'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import type { RightResponse } from '@/types/right'
import type { RoleResponse } from '@/types/role'
import { JwtClaimNames } from '@/utils/jwt'
import RightsView from '@/views/RightsView.vue'

vi.mock('@/services/accountService', () => ({
  getAccount: vi.fn(),
}))

vi.mock('@/services/roleService', () => ({
  listAllRoles: vi.fn(),
  getRoleRights: vi.fn(),
  assignRoleRights: vi.fn(),
  removeRoleRights: vi.fn(),
}))

vi.mock('@/services/rightService', () => ({
  listAllRights: vi.fn(),
}))

const roles: RoleResponse[] = [
  { id: 3, name: 'Zed' },
  { id: 2, name: 'Alpha' },
]

const catalog: RightResponse[] = [
  { id: 1, name: 'User_View' },
  { id: 2, name: 'User_Create' },
  { id: 3, name: 'User_Delete' },
]

const assigned: RightResponse[] = [{ id: 1, name: 'User_View' }]

function makeToken(permissions: string[], roleName = 'Editors'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(
    JSON.stringify({
      [JwtClaimNames.nameIdentifier]: '1',
      [JwtClaimNames.name]: 'tester',
      [JwtClaimNames.role]: roleName,
      [JwtClaimNames.permission]: permissions,
      [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60 * 30,
    }),
  ).toString('base64url')
  return `${header}.${body}.sig`
}

function installSession(permissions: string[], roleName = 'Editors'): void {
  setAccessToken(makeToken(permissions, roleName))
  useAuthStore().restoreSession()
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function mountPage(path = '/rights') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/rights', name: 'rights', component: RightsView }],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(RightsView, {
    global: { plugins: [pinia, router] },
  })
  return { wrapper, router }
}

function panel(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], headingId: string) {
  return wrapper.get(`[aria-labelledby="${headingId}"]`)
}

describe('RightsView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
    installSession(['Role_View', 'Right_View', 'RoleRight_Assign'])
    vi.mocked(getAccount).mockReset()
    vi.mocked(listAllRoles).mockReset()
    vi.mocked(getRoleRights).mockReset()
    vi.mocked(listAllRights).mockReset()
    vi.mocked(assignRoleRights).mockReset()
    vi.mocked(removeRoleRights).mockReset()
    vi.mocked(getAccount).mockResolvedValue({ roleId: 50 } as Awaited<
      ReturnType<typeof getAccount>
    >)
    vi.mocked(listAllRoles).mockResolvedValue(roles)
    vi.mocked(getRoleRights).mockResolvedValue(assigned)
    vi.mocked(listAllRights).mockResolvedValue(catalog)
  })

  it('loads roles and selects the first role by name when the query is empty', async () => {
    const rolesRequest = deferred<RoleResponse[]>()
    vi.mocked(listAllRoles).mockReturnValue(rolesRequest.promise)

    const { wrapper, router } = await mountPage()
    expect(wrapper.text()).toContain('Loading roles…')
    expect(getRoleRights).not.toHaveBeenCalled()

    rolesRequest.resolve(roles)
    await flushPromises()

    expect(listAllRoles).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.query.roleId).toBe('2')
    expect((wrapper.get('[aria-label="Role"]').element as HTMLSelectElement).value).toBe('2')
    expect(getRoleRights).toHaveBeenCalledWith(2)
    expect(listAllRights).toHaveBeenCalledTimes(1)
  })

  it('selects the role from the query string and keeps the URL in sync', async () => {
    const { wrapper, router } = await mountPage('/rights?roleId=3')
    await flushPromises()

    expect(getRoleRights).toHaveBeenCalledWith(3)
    expect((wrapper.get('[aria-label="Role"]').element as HTMLSelectElement).value).toBe('3')
    expect(router.currentRoute.value.query.roleId).toBe('3')

    await wrapper.get('[aria-label="Role"]').setValue('2')
    await flushPromises()

    expect(router.currentRoute.value.query.roleId).toBe('2')
    expect(getRoleRights).toHaveBeenLastCalledWith(2)

    await router.push({ name: 'rights', query: { roleId: '3' } })
    await flushPromises()
    expect((wrapper.get('[aria-label="Role"]').element as HTMLSelectElement).value).toBe('3')
    expect(getRoleRights).toHaveBeenLastCalledWith(3)
  })

  it('replaces an invalid role id with the default role', async () => {
    const { router } = await mountPage('/rights?roleId=99')
    await flushPromises()

    expect(router.currentRoute.value.query.roleId).toBe('2')
    expect(getRoleRights).toHaveBeenCalledTimes(1)
    expect(getRoleRights).toHaveBeenCalledWith(2)
  })

  it('shows an empty state when no roles are available', async () => {
    vi.mocked(listAllRoles).mockResolvedValue([])
    const { wrapper } = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('No roles are available to manage.')
    expect(getRoleRights).not.toHaveBeenCalled()
    expect(listAllRights).not.toHaveBeenCalled()
  })

  it('shows a roles error and does not invent rights', async () => {
    vi.mocked(listAllRoles).mockRejectedValue(
      new ApiClientError('Roles are unavailable.', 500, null),
    )
    const { wrapper } = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Roles are unavailable.')
    expect(getRoleRights).not.toHaveBeenCalled()
  })

  it('shows loading, empty, and error states for the rights panels', async () => {
    const assignedRequest = deferred<RightResponse[]>()
    const catalogRequest = deferred<RightResponse[]>()
    vi.mocked(getRoleRights).mockReturnValue(assignedRequest.promise)
    vi.mocked(listAllRights).mockReturnValue(catalogRequest.promise)

    const { wrapper } = await mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Loading rights…')

    assignedRequest.resolve([])
    catalogRequest.resolve([{ id: 2, name: 'User_Create' }])
    await flushPromises()

    expect(panel(wrapper, 'assigned-rights-heading').text()).toContain(
      'No assigned rights are visible for this role.',
    )
    expect(panel(wrapper, 'available-rights-heading').text()).toContain('User_Create')

    vi.mocked(getRoleRights).mockResolvedValue(catalog)
    vi.mocked(listAllRights).mockResolvedValue(catalog)
    await wrapper.get('[aria-label="Role"]').setValue('3')
    await flushPromises()
    expect(panel(wrapper, 'available-rights-heading').text()).toContain(
      'Every right you can see is already assigned to this role.',
    )

    vi.mocked(getRoleRights).mockRejectedValue(
      new ApiClientError('Assigned rights are hidden.', 403, null),
    )
    vi.mocked(listAllRights).mockResolvedValue(catalog)
    await wrapper.get('[aria-label="Role"]').setValue('2')
    await flushPromises()
    expect(panel(wrapper, 'assigned-rights-heading').text()).toContain(
      'Assigned rights are hidden.',
    )
    expect(panel(wrapper, 'available-rights-heading').text()).toContain(
      'Assigned rights could not be loaded',
    )
    expect(panel(wrapper, 'available-rights-heading').text()).not.toContain('User_Create')
  })

  it('renders visible available and assigned rights', async () => {
    const { wrapper } = await mountPage()
    await flushPromises()

    const available = panel(wrapper, 'available-rights-heading')
    const assignedPanel = panel(wrapper, 'assigned-rights-heading')
    expect(available.text()).toContain('User_Create')
    expect(available.text()).toContain('User_Delete')
    expect(available.text()).not.toContain('User_View')
    expect(available.text()).toContain('2 shown · 2 total')
    expect(assignedPanel.text()).toContain('User_View')
    expect(assignedPanel.text()).toContain('1 shown · 1 total')
    expect(wrapper.text()).toContain('only rights in your current access')
    expect(wrapper.text()).toContain('Changes apply immediately')
  })

  it('filters each panel by right name without dropping hidden selections', async () => {
    const { wrapper } = await mountPage()
    await flushPromises()

    const available = panel(wrapper, 'available-rights-heading')
    await available.get('[aria-label="Search available rights"]').setValue('delete')
    expect(available.text()).toContain('User_Delete')
    expect(available.text()).not.toContain('User_Create')
    expect(available.text()).toContain('1 shown · 2 total')

    await available.get('[aria-label="Search available rights"]').setValue('zzz')
    expect(available.text()).toContain('No rights match this search.')

    const assignedPanel = panel(wrapper, 'assigned-rights-heading')
    await assignedPanel.get('[aria-label="Search assigned rights"]').setValue('view')
    expect(assignedPanel.text()).toContain('User_View')
    await assignedPanel.get('[aria-label="Search assigned rights"]').setValue('missing')
    expect(assignedPanel.text()).toContain('No rights match this search.')
  })

  it('selects individual rights and all of the filtered results', async () => {
    const { wrapper } = await mountPage()
    await flushPromises()
    const available = panel(wrapper, 'available-rights-heading')

    await available.get('[aria-label="Select User_Delete"]').setValue(true)
    await available.get('[aria-label="Search available rights"]').setValue('create')
    await available.get('[aria-label="Select all filtered available rights"]').setValue(true)
    await available.get('[aria-label="Search available rights"]').setValue('')

    expect(
      (available.get('[aria-label="Select User_Create"]').element as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (available.get('[aria-label="Select User_Delete"]').element as HTMLInputElement).checked,
    ).toBe(true)

    await available.get('[aria-label="Search available rights"]').setValue('create')
    await available.get('[aria-label="Select all filtered available rights"]').setValue(false)
    await available.get('[aria-label="Search available rights"]').setValue('')

    expect(
      (available.get('[aria-label="Select User_Create"]').element as HTMLInputElement).checked,
    ).toBe(false)
    expect(
      (available.get('[aria-label="Select User_Delete"]').element as HTMLInputElement).checked,
    ).toBe(true)
  })

  it('assigns the selected rights in one request and refreshes both panels', async () => {
    vi.mocked(getRoleRights)
      .mockResolvedValueOnce(assigned)
      .mockResolvedValueOnce([
        { id: 1, name: 'User_View' },
        { id: 2, name: 'User_Create' },
        { id: 3, name: 'User_Delete' },
      ])
    vi.mocked(assignRoleRights).mockResolvedValue([
      { id: 1, name: 'User_View' },
      { id: 2, name: 'User_Create' },
      { id: 3, name: 'User_Delete' },
    ])

    const { wrapper } = await mountPage()
    await flushPromises()
    const available = panel(wrapper, 'available-rights-heading')
    await available.get('[aria-label="Select all filtered available rights"]').setValue(true)
    await available.get('button').trigger('click')
    await flushPromises()

    expect(assignRoleRights).toHaveBeenCalledWith(2, { rightIds: [2, 3] })
    expect(getRoleRights).toHaveBeenCalledTimes(2)
    expect(listAllRights).toHaveBeenCalledTimes(2)
    expect(panel(wrapper, 'assigned-rights-heading').text()).toContain('User_Create')
    expect(panel(wrapper, 'available-rights-heading').text()).toContain(
      'Every right you can see is already assigned to this role.',
    )
    expect(wrapper.text()).toContain('Rights assigned.')
    expect(wrapper.text()).toContain('Changes apply immediately')
  })

  it('removes the selected rights in one request and refreshes from the server', async () => {
    vi.mocked(getRoleRights)
      .mockResolvedValueOnce([
        { id: 1, name: 'User_View' },
        { id: 2, name: 'User_Create' },
      ])
      .mockResolvedValueOnce([])
    vi.mocked(removeRoleRights).mockResolvedValue([])

    const { wrapper } = await mountPage()
    await flushPromises()
    const assignedPanel = panel(wrapper, 'assigned-rights-heading')
    await assignedPanel.get('[aria-label="Select all filtered assigned rights"]').setValue(true)
    await assignedPanel.get('button').trigger('click')
    await flushPromises()

    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [2, 1] })
    expect(getRoleRights).toHaveBeenCalledTimes(2)
    expect(panel(wrapper, 'assigned-rights-heading').text()).toContain(
      'No assigned rights are visible for this role.',
    )
    expect(wrapper.text()).toContain('Rights removed.')
  })

  it('ignores a second click while an assignment is in flight', async () => {
    const request = deferred<RightResponse[]>()
    vi.mocked(assignRoleRights).mockReturnValue(request.promise)

    const { wrapper } = await mountPage()
    await flushPromises()
    const available = panel(wrapper, 'available-rights-heading')
    await available.get('[aria-label="Select User_Create"]').setValue(true)
    const button = available.get('button')
    await button.trigger('click')
    await button.trigger('click')

    expect(assignRoleRights).toHaveBeenCalledTimes(1)
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    expect((wrapper.get('[aria-label="Role"]').element as HTMLSelectElement).disabled).toBe(true)

    request.resolve([
      { id: 1, name: 'User_View' },
      { id: 2, name: 'User_Create' },
    ])
    await flushPromises()
    expect(assignRoleRights).toHaveBeenCalledTimes(1)
  })

  it('keeps the selection and shows the API error when assignment fails', async () => {
    vi.mocked(assignRoleRights).mockRejectedValue(
      new ApiClientError('One or more rights are already assigned.', 409, null),
    )

    const { wrapper } = await mountPage()
    await flushPromises()
    const available = panel(wrapper, 'available-rights-heading')
    await available.get('[aria-label="Select User_Create"]').setValue(true)
    await available.get('button').trigger('click')
    await flushPromises()

    expect(getRoleRights).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('One or more rights are already assigned.')
    expect(
      (available.get('[aria-label="Select User_Create"]').element as HTMLInputElement).checked,
    ).toBe(true)
    expect(available.text()).toContain('User_Create')
  })

  it('loads the signed-in role id from the account API and confirms that role', async () => {
    vi.mocked(getAccount).mockResolvedValue({ roleId: 2 } as Awaited<ReturnType<typeof getAccount>>)
    vi.mocked(listAllRoles).mockResolvedValue([{ id: 2, name: 'Editors' }])
    vi.mocked(removeRoleRights).mockResolvedValue([])

    const { wrapper } = await mountPage('/rights?roleId=2')
    await flushPromises()
    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')

    expect(getAccount).toHaveBeenCalledTimes(1)
    expect(removeRoleRights).not.toHaveBeenCalled()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('your own role')

    const cancel = dialog.findAll('button').find((button) => button.text() === 'Cancel')
    expect(cancel).toBeDefined()
    await cancel?.trigger('click')
    expect(removeRoleRights).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('removes own-role rights only after confirmation', async () => {
    vi.mocked(getAccount).mockResolvedValue({ roleId: 8 } as Awaited<ReturnType<typeof getAccount>>)
    vi.mocked(listAllRoles).mockResolvedValue([{ id: 8, name: 'Auditors' }])
    vi.mocked(removeRoleRights).mockResolvedValue([])
    const { wrapper } = await mountPage('/rights?roleId=8')
    await flushPromises()
    expect(useAuthStore().user?.roleId).toBeNull()

    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')
    expect(removeRoleRights).not.toHaveBeenCalled()

    const confirm = wrapper
      .get('[role="dialog"]')
      .findAll('button')
      .find((button) => button.text() === 'Remove rights')
    expect(confirm).toBeDefined()
    await confirm?.trigger('click')
    await flushPromises()
    expect(removeRoleRights).toHaveBeenCalledWith(8, { rightIds: [1] })
  })

  it('removes rights from another role without confirmation', async () => {
    vi.mocked(removeRoleRights).mockResolvedValue([])
    const { wrapper } = await mountPage()
    await flushPromises()

    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [1] })
  })

  it('blocks removal while the account role is still loading', async () => {
    const account = deferred<Awaited<ReturnType<typeof getAccount>>>()
    vi.mocked(getAccount).mockReturnValue(account.promise)

    const { wrapper } = await mountPage()
    await flushPromises()
    const assignedPanel = panel(wrapper, 'assigned-rights-heading')
    await assignedPanel.get('[aria-label="Select User_View"]').setValue(true)
    const button = assignedPanel.get('button')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    await button.trigger('click')

    expect(removeRoleRights).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    account.resolve({ roleId: 50 } as Awaited<ReturnType<typeof getAccount>>)
    await flushPromises()
    expect((assignedPanel.get('button').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('asks for confirmation when the account API fails', async () => {
    vi.mocked(getAccount).mockRejectedValue(
      new ApiClientError('Could not load your account.', 500, null),
    )
    vi.mocked(removeRoleRights).mockResolvedValue([])

    const { wrapper } = await mountPage()
    await flushPromises()
    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')

    expect(removeRoleRights).not.toHaveBeenCalled()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('could not be verified')

    const confirm = dialog.findAll('button').find((button) => button.text() === 'Remove rights')
    await confirm?.trigger('click')
    await flushPromises()
    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [1] })
  })

  it('does not let a role change bypass an open removal confirmation', async () => {
    vi.mocked(getAccount).mockResolvedValue({ roleId: 2 } as Awaited<ReturnType<typeof getAccount>>)
    vi.mocked(removeRoleRights).mockResolvedValue([])

    const { wrapper, router } = await mountPage('/rights?roleId=2')
    await flushPromises()
    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('your own role')

    await router.push({ name: 'rights', query: { roleId: '3' } })
    await flushPromises()

    expect(removeRoleRights).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect((wrapper.get('[aria-label="Role"]').element as HTMLSelectElement).value).toBe('3')

    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(removeRoleRights).toHaveBeenCalledWith(3, { rightIds: [1] })
  })

  it('keeps an in-flight removal on the role that was confirmed', async () => {
    vi.mocked(getAccount).mockResolvedValue({ roleId: 2 } as Awaited<ReturnType<typeof getAccount>>)
    const request = deferred<RightResponse[]>()
    vi.mocked(removeRoleRights).mockReturnValue(request.promise)

    const { wrapper, router } = await mountPage('/rights?roleId=2')
    await flushPromises()
    await panel(wrapper, 'assigned-rights-heading')
      .get('[aria-label="Select User_View"]')
      .setValue(true)
    await panel(wrapper, 'assigned-rights-heading').get('button').trigger('click')
    const confirm = wrapper
      .get('[role="dialog"]')
      .findAll('button')
      .find((button) => button.text() === 'Remove rights')
    await confirm?.trigger('click')
    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [1] })

    await router.push({ name: 'rights', query: { roleId: '3' } })
    await flushPromises()
    request.resolve([])
    await flushPromises()

    expect(removeRoleRights).toHaveBeenCalledTimes(1)
    expect(removeRoleRights).toHaveBeenCalledWith(2, { rightIds: [1] })
  })

  it('hides assignment actions without RoleRight_Assign', async () => {
    clearAccessToken()
    installSession(['Role_View', 'Right_View'])
    const { wrapper } = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('RoleRight_Assign')
    expect(wrapper.find('[aria-label="Select User_Create"]').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
