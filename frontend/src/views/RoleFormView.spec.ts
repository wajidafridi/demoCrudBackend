import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '@/services/apiError'
import { createRole, getRole, updateRole } from '@/services/roleService'
import RoleFormView from '@/views/RoleFormView.vue'

vi.mock('@/services/roleService', () => ({
  createRole: vi.fn(),
  getRole: vi.fn(),
  updateRole: vi.fn(),
}))

async function mountForm(
  path: string,
): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/roles', name: 'roles', component: { template: '<div>Roles list</div>' } },
      { path: '/roles/create', name: 'roles-create', component: RoleFormView },
      { path: '/roles/:id/edit', name: 'roles-edit', component: RoleFormView },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(RoleFormView, {
    global: {
      plugins: [router],
    },
  })

  return { wrapper, router }
}

describe('RoleFormView', () => {
  beforeEach(() => {
    vi.mocked(createRole).mockReset()
    vi.mocked(getRole).mockReset()
    vi.mocked(updateRole).mockReset()
  })

  it('requires a role name before create', async () => {
    const { wrapper } = await mountForm('/roles/create')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Role name is required.')
    expect(wrapper.text()).toContain('Please correct the highlighted fields.')
    expect(createRole).not.toHaveBeenCalled()
  })

  it('creates a role and returns to the list', async () => {
    vi.mocked(createRole).mockResolvedValue({ id: 4, name: 'Coordinator' })
    const { wrapper, router } = await mountForm('/roles/create')

    await wrapper.get('#roleName').setValue('  Coordinator  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createRole).toHaveBeenCalledWith({ name: 'Coordinator' })
    expect(router.currentRoute.value.name).toBe('roles')
    expect(router.currentRoute.value.query.notice).toBe('created')
  })

  it('shows a conflict message when the name is taken', async () => {
    vi.mocked(createRole).mockRejectedValue(
      new ApiClientError('Role name is already in use.', 409, null),
    )

    const { wrapper } = await mountForm('/roles/create')
    await wrapper.get('#roleName').setValue('Admin')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Role name is already in use.')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows API validation on the name field', async () => {
    vi.mocked(createRole).mockRejectedValue(
      new ApiClientError('Validation failed', 400, {
        Name: ['The Name field is required.'],
      }),
    )

    const { wrapper } = await mountForm('/roles/create')
    await wrapper.get('#roleName').setValue('Admin')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The Name field is required.')
  })

  it('loads a role for edit and submits the update DTO', async () => {
    vi.mocked(getRole).mockResolvedValue({ id: 2, name: 'Admin' })
    vi.mocked(updateRole).mockResolvedValue({ id: 2, name: 'Managers' })

    const { wrapper, router } = await mountForm('/roles/2/edit')
    await flushPromises()

    expect(getRole).toHaveBeenCalledWith(2)
    const nameField = wrapper.get('#roleName').element
    if (!(nameField instanceof HTMLInputElement)) {
      throw new Error('Expected the role name field to be an input.')
    }
    expect(nameField.value).toBe('Admin')

    await wrapper.get('#roleName').setValue('Managers')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateRole).toHaveBeenCalledWith(2, { name: 'Managers' })
    expect(router.currentRoute.value.query.notice).toBe('updated')
  })

  it('ignores a second submit while create is in flight', async () => {
    let resolveCreate: ((value: { id: number; name: string }) => void) | undefined
    vi.mocked(createRole).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const { wrapper } = await mountForm('/roles/create')
    await wrapper.get('#roleName').setValue('Coordinator')

    const submitPromise = wrapper.get('form').trigger('submit')
    await flushPromises()

    const saveButton = wrapper.get('button[type="submit"]')
    expect(saveButton.text()).toContain('Saving…')
    expect(saveButton.attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(createRole).toHaveBeenCalledTimes(1)

    resolveCreate?.({ id: 4, name: 'Coordinator' })
    await submitPromise
    await flushPromises()
  })

  it('shows loading, not-found, and invalid-link states', async () => {
    let resolveRole: ((value: { id: number; name: string }) => void) | undefined
    vi.mocked(getRole).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRole = resolve
        }),
    )

    const loading = await mountForm('/roles/2/edit')
    expect(loading.wrapper.text()).toContain('Loading role…')
    expect(loading.wrapper.find('form').exists()).toBe(false)
    resolveRole?.({ id: 2, name: 'Admin' })
    await flushPromises()
    expect(loading.wrapper.find('#roleName').exists()).toBe(true)

    vi.mocked(getRole).mockRejectedValue(
      new ApiClientError('Role with id = 9 was not found.', 404, null),
    )
    const missing = await mountForm('/roles/9/edit')
    await flushPromises()
    expect(missing.wrapper.text()).toContain('Role with id = 9 was not found.')
    expect(missing.wrapper.find('form').exists()).toBe(false)

    const invalid = await mountForm('/roles/nope/edit')
    await flushPromises()
    expect(invalid.wrapper.text()).toContain('This role link is invalid.')
  })
})
