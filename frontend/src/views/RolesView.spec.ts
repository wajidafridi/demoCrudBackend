import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/router/routes'
import { ApiClientError } from '@/services/apiError'
import { deleteRole, listRoles } from '@/services/roleService'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { RoleListResult } from '@/services/roleService'
import type { RoleResponse } from '@/types/role'
import { JwtClaimNames } from '@/utils/jwt'
import RolesView from '@/views/RolesView.vue'

vi.mock('@/services/roleService', () => ({
  listRoles: vi.fn(),
  deleteRole: vi.fn(),
  ROLES_PAGE_SIZE: 10,
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

const admin: RoleResponse = { id: 2, name: 'Admin' }

function page(roles: RoleResponse[], pagination: Partial<PaginationMetadata> = {}): RoleListResult {
  return {
    roles,
    message: 'Roles fetched successfully.',
    pagination: {
      pageNumber: 1,
      pageSize: 10,
      totalCount: roles.length,
      totalPages: roles.length === 0 ? 0 : 1,
      hasPreviousPage: false,
      hasNextPage: false,
      ...pagination,
    },
  }
}

async function mountRoles(notice?: 'created' | 'updated') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  const pinia = createPinia()
  setActivePinia(pinia)

  await router.push(notice == null ? { name: 'roles' } : { name: 'roles', query: { notice } })
  await router.isReady()

  const wrapper = mount(RolesView, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, router }
}

function confirmDelete(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Delete role')
  if (button == null) {
    throw new Error('Delete confirmation button was not found.')
  }

  return button
}

describe('RolesView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
    installSession(['Role_View', 'Role_Create', 'Role_Edit', 'Role_Delete', 'RoleRight_Assign'])
    vi.mocked(listRoles).mockReset()
    vi.mocked(deleteRole).mockReset()
    vi.mocked(listRoles).mockResolvedValue(page([admin]))
  })

  it('shows a loading state and then the role list', async () => {
    let resolveList: ((value: RoleListResult) => void) | undefined
    vi.mocked(listRoles).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }),
    )

    const { wrapper } = await mountRoles()

    expect(wrapper.text()).toContain('Loading roles…')

    resolveList?.(page([admin]))
    await flushPromises()

    expect(wrapper.text()).toContain('Admin')
    expect(listRoles).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 })
  })

  it('shows an error state and retries the request', async () => {
    vi.mocked(listRoles).mockRejectedValueOnce(
      new ApiClientError('Could not load roles.', 500, null),
    )

    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load roles.')

    vi.mocked(listRoles).mockResolvedValueOnce(page([admin]))
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Admin')
  })

  it('shows an empty state when the page has no roles', async () => {
    vi.mocked(listRoles).mockResolvedValue(page([]))

    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.text()).toContain('No roles found')
  })

  it('requests the next page from the backend pagination metadata', async () => {
    vi.mocked(listRoles).mockImplementation(async (query) =>
      page([admin], {
        pageNumber: query.pageNumber,
        totalCount: 25,
        totalPages: 2,
        hasPreviousPage: query.pageNumber > 1,
        hasNextPage: query.pageNumber < 2,
      }),
    )

    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.text()).toContain('Page 1 of 2 · 25 roles')
    const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next page')
    await nextButton?.trigger('click')
    await flushPromises()

    expect(listRoles).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 10 })
  })

  it('reloads from page 1 when the rows-per-page value changes', async () => {
    vi.mocked(listRoles).mockImplementation(async (query) =>
      page([admin], {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        totalCount: 25,
        totalPages: Math.ceil(25 / query.pageSize),
        hasPreviousPage: query.pageNumber > 1,
        hasNextPage: query.pageNumber < Math.ceil(25 / query.pageSize),
      }),
    )

    const { wrapper } = await mountRoles()
    await flushPromises()

    const pageSizeSelect = wrapper.get('select[aria-label="Rows per page"]')
    await pageSizeSelect.setValue('50')
    await flushPromises()

    expect(listRoles).toHaveBeenLastCalledWith({ pageNumber: 1, pageSize: 50 })
    expect(pageSizeSelect.element).toMatchObject({ value: '50' })
  })

  it('shows a success notice after create and clears the query', async () => {
    const { wrapper, router } = await mountRoles('created')
    await flushPromises()

    expect(wrapper.text()).toContain('Role created successfully.')
    expect(router.currentRoute.value.query.notice).toBeUndefined()
  })

  it('shows only the role actions the current permissions allow', async () => {
    installSession(['Role_View', 'Role_Edit'])

    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.find('[aria-label="Edit Admin"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Delete Admin"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Manage rights for Admin"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/roles/create"]').exists()).toBe(false)
  })

  it('keeps the role list inside a scroll container', async () => {
    const { wrapper } = await mountRoles()
    await flushPromises()

    const table = wrapper.get('table')
    expect(wrapper.get('h1').text()).toBe('Roles')
    expect(wrapper.get('section').classes()).toContain('min-w-0')
    expect(table.classes()).toContain('min-w-[480px]')
    expect(table.element.parentElement?.className).toContain('overflow-auto')
    expect(wrapper.get('a[href="/roles/create"]').classes()).toContain('bg-accent')
  })

  it('hides create, edit, delete, and rights without those permissions', async () => {
    installSession(['Role_View'])

    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Create role')
    expect(wrapper.find('[aria-label="Edit Admin"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete Admin"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Manage rights for Admin"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Admin')
  })

  it('shows create, edit, rights, and delete when those permissions are present', async () => {
    const { wrapper } = await mountRoles()
    await flushPromises()

    expect(wrapper.get('a[href="/roles/create"]').text()).toContain('Create role')
    expect(wrapper.get('[aria-label="Edit Admin"]').attributes('href')).toBe('/roles/2/edit')
    expect(wrapper.get('[aria-label="Manage rights for Admin"]').attributes('href')).toBe(
      '/roles/2/rights',
    )
    expect(wrapper.get('[aria-label="Delete Admin"]').exists()).toBe(true)
  })

  it('asks for confirmation before deleting and refreshes the list', async () => {
    vi.mocked(deleteRole).mockResolvedValue('Role deleted successfully.')
    vi.mocked(listRoles)
      .mockResolvedValueOnce(page([admin]))
      .mockResolvedValueOnce(page([]))

    const { wrapper } = await mountRoles()
    await flushPromises()

    await wrapper.get('[aria-label="Delete Admin"]').trigger('click')
    expect(deleteRole).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('This will permanently delete Admin.')

    await confirmDelete(wrapper).trigger('click')
    await flushPromises()

    expect(deleteRole).toHaveBeenCalledWith(2)
    expect(listRoles).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Role deleted successfully.')
    expect(wrapper.text()).toContain('No roles found')
  })

  it('shows forbidden, not-found, and conflict messages from delete', async () => {
    vi.mocked(deleteRole).mockRejectedValueOnce(
      new ApiClientError('The system role cannot be changed.', 403, null),
    )

    const { wrapper } = await mountRoles()
    await flushPromises()

    await wrapper.get('[aria-label="Delete Admin"]').trigger('click')
    await confirmDelete(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('The system role cannot be changed.')

    vi.mocked(deleteRole).mockRejectedValueOnce(
      new ApiClientError('Role with id = 2 was not found.', 404, null),
    )
    await wrapper.get('[aria-label="Delete Admin"]').trigger('click')
    await confirmDelete(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Role with id = 2 was not found.')

    vi.mocked(deleteRole).mockRejectedValueOnce(
      new ApiClientError('This role cannot be deleted while users are assigned to it.', 409, null),
    )
    await wrapper.get('[aria-label="Delete Admin"]').trigger('click')
    await confirmDelete(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('This role cannot be deleted while users are assigned to it.')
  })
})
