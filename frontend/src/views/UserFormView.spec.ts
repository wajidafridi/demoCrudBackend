import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '@/services/apiError'
import { listAllRoles } from '@/services/roleService'
import { createUser, getUser, updateUser } from '@/services/userService'
import type { UserResponse } from '@/types/user'
import UserFormView from '@/views/UserFormView.vue'

vi.mock('@/services/userService', () => ({
  createUser: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/services/roleService', () => ({
  listAllRoles: vi.fn(),
}))

const assignableRoles = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'User' },
]

const ada: UserResponse = {
  id: 2,
  isSystem: false,
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  roleId: 2,
  roleName: 'Admin',
  address: null,
  phoneNumber: null,
  gender: null,
  dateOfBirth: '1990-01-01T00:00:00',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  age: 36,
}

async function mountForm(
  path: string,
): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/users', name: 'users', component: { template: '<div>Users list</div>' } },
      { path: '/users/create', name: 'users-create', component: UserFormView },
      { path: '/users/:id/edit', name: 'users-edit', component: UserFormView },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(UserFormView, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

async function fillCreateForm(wrapper: ReturnType<typeof mount>): Promise<void> {
  await flushPromises()
  await wrapper.get('#firstName').setValue('Ada')
  await wrapper.get('#lastName').setValue('Lovelace')
  await wrapper.get('#email').setValue('ada@example.com')
  await wrapper.get('#userName').setValue('ada')
  await wrapper.get('#password').setValue('secret12')
  await wrapper.get('#roleId').setValue('2')
}

describe('UserFormView', () => {
  beforeEach(() => {
    vi.mocked(createUser).mockReset()
    vi.mocked(getUser).mockReset()
    vi.mocked(updateUser).mockReset()
    vi.mocked(listAllRoles).mockReset()
    vi.mocked(listAllRoles).mockResolvedValue(assignableRoles)
  })

  it('blocks create until required fields are valid', async () => {
    const { wrapper } = await mountForm('/users/create')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('First name is required.')
    expect(wrapper.text()).toContain('Last name is required.')
    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Username is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(wrapper.text()).toContain('Role is required.')
    expect(wrapper.text()).toContain('Please correct the highlighted fields.')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('creates a user and returns to the list with a success notice', async () => {
    vi.mocked(createUser).mockResolvedValue(ada)
    const { wrapper, router } = await mountForm('/users/create')

    await fillCreateForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createUser).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      userName: 'ada',
      password: 'secret12',
      roleId: 2,
      address: null,
      phoneNumber: null,
      gender: null,
      dateOfBirth: null,
      imageUrl: null,
    })
    expect(router.currentRoute.value.name).toBe('users')
    expect(router.currentRoute.value.query.notice).toBe('created')
  })

  it('shows API validation errors on the matching fields', async () => {
    vi.mocked(createUser).mockRejectedValue(
      new ApiClientError('Validation failed', 400, {
        Email: ['The Email field is not a valid e-mail address.'],
        Mystery: ['Something else went wrong.'],
      }),
    )

    const { wrapper } = await mountForm('/users/create')
    await fillCreateForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The Email field is not a valid e-mail address.')
    expect(wrapper.text()).toContain('Validation failed Something else went wrong.')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows a conflict message when the username is taken', async () => {
    vi.mocked(createUser).mockRejectedValue(
      new ApiClientError('Username is already taken.', 409, null),
    )

    const { wrapper } = await mountForm('/users/create')
    await fillCreateForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Username is already taken.')
  })

  it('loads a user for edit and submits the update DTO', async () => {
    vi.mocked(getUser).mockResolvedValue(ada)
    vi.mocked(updateUser).mockResolvedValue('User updated successfully.')

    const { wrapper, router } = await mountForm('/users/2/edit')
    await flushPromises()

    expect(getUser).toHaveBeenCalledWith(2)
    expect(wrapper.find('#password').exists()).toBe(false)
    expect(inputValue(wrapper, '#userName')).toBe('ada')
    expect(inputValue(wrapper, '#dateOfBirth')).toBe('1990-01-01')
    expect(selectValue(wrapper, '#roleId')).toBe('2')
    expect(wrapper.text()).toContain('Admin')

    await wrapper.get('#firstName').setValue('Grace')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateUser).toHaveBeenCalledWith(2, {
      firstName: 'Grace',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      userName: 'ada',
      roleId: 2,
      address: null,
      phoneNumber: null,
      gender: null,
      dateOfBirth: '1990-01-01',
      imageUrl: null,
    })
    expect(router.currentRoute.value.query.notice).toBe('updated')
  })

  it('shows a loading state while the user is fetched', async () => {
    let resolveUser: ((value: UserResponse) => void) | undefined
    vi.mocked(getUser).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUser = resolve
        }),
    )

    const { wrapper } = await mountForm('/users/2/edit')

    expect(wrapper.text()).toContain('Loading user…')
    expect(wrapper.find('#userName').exists()).toBe(false)

    resolveUser?.(ada)
    await flushPromises()

    expect(wrapper.find('#userName').exists()).toBe(true)
  })

  it('shows not-found and invalid-link errors without the form', async () => {
    vi.mocked(getUser).mockRejectedValue(
      new ApiClientError('User with id = 9 was not found.', 404, null),
    )

    const missing = await mountForm('/users/9/edit')
    await flushPromises()

    expect(missing.wrapper.text()).toContain('User with id = 9 was not found.')
    expect(missing.wrapper.find('form').exists()).toBe(false)

    const invalid = await mountForm('/users/nope/edit')
    await flushPromises()

    expect(invalid.wrapper.text()).toContain('This user link is invalid.')
    expect(getUser).toHaveBeenCalledTimes(1)
  })

  it('offers role names from the roles API instead of a numeric id field', async () => {
    const { wrapper } = await mountForm('/users/create')
    await flushPromises()

    const roleField = wrapper.get('#roleId')
    expect(roleField.element.tagName).toBe('SELECT')
    expect(roleField.text()).toContain('Admin')
    expect(roleField.text()).toContain('User')
    expect(wrapper.text()).not.toContain('Role id')
    expect(listAllRoles).toHaveBeenCalledTimes(1)
  })

  it('keeps a protected current role selected and does not offer a replacement', async () => {
    vi.mocked(getUser).mockResolvedValue({ ...ada, roleId: 1, roleName: 'SuperAdmin' })
    vi.mocked(updateUser).mockResolvedValue('User updated successfully.')

    const { wrapper } = await mountForm('/users/2/edit')
    await flushPromises()

    const roleField = wrapper.get('#roleId')
    expect(roleField.attributes('disabled')).toBeDefined()
    const optionLabels = roleField.findAll('option').map((option) => option.text())
    expect(optionLabels).toEqual(['SuperAdmin'])
    expect(wrapper.text()).toContain('This role is protected and cannot be changed.')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        roleId: 1,
      }),
    )
  })

  it('shows an error when roles cannot be loaded', async () => {
    vi.mocked(listAllRoles).mockRejectedValue(
      new ApiClientError('Could not load roles.', 403, null),
    )

    const { wrapper } = await mountForm('/users/create')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load roles.')
  })
})

function inputValue(wrapper: ReturnType<typeof mount>, selector: string): string {
  const element = wrapper.get(selector).element
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected ${selector} to be an input.`)
  }

  return element.value
}

function selectValue(wrapper: ReturnType<typeof mount>, selector: string): string {
  const element = wrapper.get(selector).element
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Expected ${selector} to be a select.`)
  }

  return element.value
}
