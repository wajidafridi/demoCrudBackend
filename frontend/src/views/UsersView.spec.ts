import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/router/routes'
import { ApiClientError } from '@/services/apiError'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import { deleteUser, listUsers } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { UserListResult } from '@/services/userService'
import type { UserResponse } from '@/types/user'
import { JwtClaimNames } from '@/utils/jwt'
import UsersView from '@/views/UsersView.vue'

vi.mock('@/services/userService', () => ({
  listUsers: vi.fn(),
  deleteUser: vi.fn(),
  USERS_PAGE_SIZE: 10,
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

const ada: UserResponse = {
  id: 2,
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  roleId: 2,
  roleName: 'Admin',
  address: null,
  phoneNumber: '555',
  gender: null,
  dateOfBirth: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  age: null,
}

function page(users: UserResponse[], pagination: Partial<PaginationMetadata> = {}): UserListResult {
  return {
    users,
    message: 'Users fetched successfully.',
    pagination: {
      pageNumber: 1,
      pageSize: 10,
      totalCount: users.length,
      totalPages: users.length === 0 ? 0 : 1,
      hasPreviousPage: false,
      hasNextPage: false,
      ...pagination,
    },
  }
}

function confirmDelete(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Delete user')
  if (button == null) {
    throw new Error('Delete confirmation button was not found.')
  }

  return button
}

async function mountUsers(notice?: 'created' | 'updated') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  const pinia = createPinia()
  setActivePinia(pinia)

  await router.push(notice == null ? { name: 'users' } : { name: 'users', query: { notice } })
  await router.isReady()

  const wrapper = mount(UsersView, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, router }
}

describe('UsersView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    setActivePinia(createPinia())
    installSession(['User_View', 'User_Create', 'User_Edit', 'User_Delete'])
    vi.mocked(listUsers).mockReset()
    vi.mocked(deleteUser).mockReset()
    vi.mocked(listUsers).mockResolvedValue(page([ada]))
  })

  it('shows a loading state and then the user list', async () => {
    let resolveList: ((value: UserListResult) => void) | undefined
    vi.mocked(listUsers).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }),
    )

    const { wrapper } = await mountUsers()

    expect(wrapper.text()).toContain('Loading users…')
    expect(wrapper.text()).not.toContain('ada@example.com')

    resolveList?.(page([ada]))
    await flushPromises()

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('555')
    expect(listUsers).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 })
  })

  it('shows an error state and retries the request', async () => {
    vi.mocked(listUsers).mockRejectedValueOnce(
      new ApiClientError('Could not load users.', 500, null),
    )

    const { wrapper } = await mountUsers()
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load users.')
    expect(wrapper.text()).not.toContain('ada@example.com')

    vi.mocked(listUsers).mockResolvedValueOnce(page([ada]))
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('shows an empty state when the page has no users', async () => {
    vi.mocked(listUsers).mockResolvedValue(page([]))

    const { wrapper } = await mountUsers()
    await flushPromises()

    expect(wrapper.text()).toContain('No users found')
  })

  it('requests the next page from the backend pagination metadata', async () => {
    vi.mocked(listUsers).mockImplementation(async (query) =>
      page([ada], {
        pageNumber: query.pageNumber,
        totalCount: 45,
        totalPages: 3,
        hasPreviousPage: query.pageNumber > 1,
        hasNextPage: query.pageNumber < 3,
      }),
    )

    const { wrapper } = await mountUsers()
    await flushPromises()

    expect(wrapper.text()).toContain('Page 1 of 3 · 45 users')
    const buttons = wrapper.findAll('button')
    const previousButton = buttons.find((button) => button.text() === 'Previous page')
    const nextButton = buttons.find((button) => button.text() === 'Next page')

    expect(previousButton?.attributes('disabled')).toBeDefined()
    expect(nextButton?.attributes('disabled')).toBeUndefined()

    await nextButton?.trigger('click')
    await flushPromises()

    expect(listUsers).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 10 })
    expect(wrapper.text()).toContain('Page 2 of 3 · 45 users')
  })

  it('reloads from page 1 when the rows-per-page value changes', async () => {
    vi.mocked(listUsers).mockImplementation(async (query) =>
      page([ada], {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        totalCount: 45,
        totalPages: Math.ceil(45 / query.pageSize),
        hasPreviousPage: query.pageNumber > 1,
        hasNextPage: query.pageNumber < Math.ceil(45 / query.pageSize),
      }),
    )

    const { wrapper } = await mountUsers()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next page')
    await nextButton?.trigger('click')
    await flushPromises()
    expect(listUsers).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 10 })

    const pageSizeSelect = wrapper.get('select[aria-label="Rows per page"]')
    await pageSizeSelect.setValue('25')
    await flushPromises()

    expect(listUsers).toHaveBeenLastCalledWith({ pageNumber: 1, pageSize: 25 })
    expect(pageSizeSelect.element).toMatchObject({ value: '25' })
  })

  it('shows a success notice after create and clears the query', async () => {
    const { wrapper, router } = await mountUsers('created')
    await flushPromises()

    expect(wrapper.text()).toContain('User created successfully.')
    expect(router.currentRoute.value.query.notice).toBeUndefined()
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('hides create, edit, and delete without those permissions', async () => {
    installSession(['User_View'])

    const { wrapper } = await mountUsers()
    await flushPromises()

    expect(wrapper.find('[aria-label="Create user"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Create user')
    expect(wrapper.find('[aria-label="Edit ada"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete ada"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('shows create, edit, and delete when those permissions are present', async () => {
    const { wrapper } = await mountUsers()
    await flushPromises()

    expect(wrapper.get('a[href="/users/create"]').text()).toContain('Create user')
    expect(wrapper.get('[aria-label="Edit ada"]').attributes('href')).toBe('/users/2/edit')
    expect(wrapper.get('[aria-label="Delete ada"]').exists()).toBe(true)
  })

  it('asks for confirmation before deleting and refreshes the list', async () => {
    vi.mocked(deleteUser).mockResolvedValue('User deleted successfully.')
    vi.mocked(listUsers)
      .mockResolvedValueOnce(page([ada]))
      .mockResolvedValueOnce(page([]))

    const { wrapper } = await mountUsers()
    await flushPromises()

    await wrapper.get('[aria-label="Delete ada"]').trigger('click')
    expect(deleteUser).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('This will permanently delete ada (Ada Lovelace).')

    await confirmDelete(wrapper).trigger('click')
    await flushPromises()

    expect(deleteUser).toHaveBeenCalledWith(2)
    expect(listUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('User deleted successfully.')
    expect(wrapper.text()).toContain('No users found')
  })

  it('leaves the user in place when delete is cancelled', async () => {
    const { wrapper } = await mountUsers()
    await flushPromises()

    await wrapper.get('[aria-label="Delete ada"]').trigger('click')
    const cancel = wrapper.findAll('button').find((button) => button.text() === 'Cancel')
    await cancel?.trigger('click')

    expect(deleteUser).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('shows forbidden and not-found messages from delete', async () => {
    vi.mocked(deleteUser).mockRejectedValueOnce(
      new ApiClientError('The system user cannot be deleted.', 403, null),
    )

    const { wrapper } = await mountUsers()
    await flushPromises()

    await wrapper.get('[aria-label="Delete ada"]').trigger('click')
    await confirmDelete(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('The system user cannot be deleted.')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    vi.mocked(deleteUser).mockRejectedValueOnce(
      new ApiClientError('User with id = 2 was not found.', 404, null),
    )
    await wrapper.get('[aria-label="Delete ada"]').trigger('click')
    await confirmDelete(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('User with id = 2 was not found.')
  })
})
