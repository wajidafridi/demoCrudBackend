import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UNSAVED_CHANGES_MESSAGE } from '@/composables/useUnsavedChanges'
import { ApiClientError } from '@/services/apiError'
import { changePassword, getAccount, updateAccount } from '@/services/accountService'
import type { AccountProfile } from '@/types/account'
import { formatLocalDate } from '@/utils/dateOfBirth'
import AccountView from '@/views/AccountView.vue'

vi.mock('@/services/accountService', () => ({
  getAccount: vi.fn(),
  updateAccount: vi.fn(),
  changePassword: vi.fn(),
}))

const profile: AccountProfile = {
  id: 7,
  userName: 'ada',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phoneNumber: '555',
  gender: 'Female',
  dateOfBirth: '1990-01-01',
  address: '1 Analytical St',
  imageUrl: null,
  roleId: 2,
  roleName: 'Admin',
  isSystem: true,
  createdAt: '2026-01-01T00:00:00Z',
}

async function mountAccount() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/account', name: 'account', component: AccountView },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push({ name: 'account' })
  await router.isReady()

  const wrapper = mount(
    { template: '<router-view />' },
    {
      global: { plugins: [pinia, router] },
    },
  )
  mounted.push(wrapper)

  return { wrapper, router }
}

function inputValue(wrapper: ReturnType<typeof mount>, id: string): string {
  const element = wrapper.get(id).element
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected ${id} to be an input.`)
  }

  return element.value
}

const mounted: Array<{ unmount: () => void }> = []

describe('AccountView', () => {
  beforeEach(() => {
    vi.mocked(getAccount).mockReset()
    vi.mocked(updateAccount).mockReset()
    vi.mocked(changePassword).mockReset()
    vi.mocked(getAccount).mockResolvedValue(profile)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted.length = 0
  })

  it('shows a loading state and then the profile', async () => {
    let resolveProfile: ((value: AccountProfile) => void) | undefined
    vi.mocked(getAccount).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        }),
    )

    const { wrapper } = await mountAccount()
    expect(wrapper.text()).toContain('Loading account…')

    resolveProfile?.(profile)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('My Account')
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.text()).toContain('ada')
    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('System')
    expect(wrapper.text()).toContain('AL')
    expect(inputValue(wrapper, '#firstName')).toBe('Ada')
    expect(inputValue(wrapper, '#dateOfBirth')).toBe('1990-01-01')
  })

  it('shows an error and retries the account request', async () => {
    vi.mocked(getAccount).mockRejectedValueOnce(
      new ApiClientError('Could not load your account.', 500, null),
    )

    const { wrapper } = await mountAccount()
    await flushPromises()
    expect(wrapper.text()).toContain('Could not load your account.')

    vi.mocked(getAccount).mockResolvedValueOnce(profile)
    await wrapper.get('[aria-label="Try again"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Ada Lovelace')
  })

  it('saves only the permitted profile fields', async () => {
    vi.mocked(updateAccount).mockResolvedValue({ ...profile, firstName: 'Augusta' })
    const { wrapper } = await mountAccount()
    await flushPromises()

    await wrapper.get('#firstName').setValue(' Augusta ')
    await wrapper.get('#profile-form').trigger('submit')
    await flushPromises()

    expect(updateAccount).toHaveBeenCalledWith({
      firstName: 'Augusta',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: '555',
      gender: 'Female',
      dateOfBirth: '1990-01-01',
      address: '1 Analytical St',
      imageUrl: null,
    })
    const body = vi.mocked(updateAccount).mock.calls[0]?.[0]
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('userName')
    expect(body).not.toHaveProperty('roleId')
    expect(body).not.toHaveProperty('isSystem')
    expect(body).not.toHaveProperty('password')
    expect(wrapper.text()).toContain('Account updated successfully.')
    expect(wrapper.text()).toContain('Augusta Lovelace')
  })

  it('shows validation errors and does not save an invalid profile', async () => {
    const { wrapper } = await mountAccount()
    await flushPromises()

    await wrapper.get('#firstName').setValue(' ')
    await wrapper.get('#email').setValue('bad')
    await wrapper.get('#profile-form').trigger('submit')

    expect(updateAccount).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('First name is required.')
    expect(wrapper.text()).toContain('Enter a valid email address.')
    expect(wrapper.text()).toContain('Please correct the highlighted fields.')
  })

  it('shows an API field error for a profile update', async () => {
    vi.mocked(updateAccount).mockRejectedValue(
      new ApiClientError('Email is already in use.', 409, {
        Email: ['Email is already in use.'],
      }),
    )

    const { wrapper } = await mountAccount()
    await flushPromises()
    await wrapper.get('#profile-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email is already in use.')
  })

  it('ignores a second profile save while the first is in flight', async () => {
    let resolveUpdate: ((value: AccountProfile) => void) | undefined
    vi.mocked(updateAccount).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve
        }),
    )

    const { wrapper } = await mountAccount()
    await flushPromises()

    const pending = wrapper.get('#profile-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#profile-form button[type="submit"]').text()).toContain('Saving…')

    await wrapper.get('#profile-form').trigger('submit')
    expect(updateAccount).toHaveBeenCalledTimes(1)

    resolveUpdate?.(profile)
    await pending
    await flushPromises()
  })

  it('resets edited profile fields on cancel', async () => {
    const { wrapper } = await mountAccount()
    await flushPromises()

    await wrapper.get('#firstName').setValue('Changed')
    await wrapper.get('#profile-form button[type="button"]').trigger('click')

    expect(inputValue(wrapper, '#firstName')).toBe('Ada')
    expect(updateAccount).not.toHaveBeenCalled()
  })

  it('rejects an incomplete, short, mismatched, or reused password', async () => {
    const { wrapper } = await mountAccount()
    await flushPromises()

    await wrapper.get('#password-form').trigger('submit')
    expect(changePassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Current password is required.')
    expect(wrapper.text()).toContain('New password is required.')
    expect(wrapper.text()).toContain('Confirm password is required.')

    await wrapper.get('#currentPassword').setValue('current-password')
    await wrapper.get('#newPassword').setValue('short')
    await wrapper.get('#confirmPassword').setValue('short')
    await wrapper.get('#password-form').trigger('submit')
    expect(wrapper.text()).toContain('New password must be at least 8 characters.')

    await wrapper.get('#newPassword').setValue('current-password')
    await wrapper.get('#confirmPassword').setValue('current-password')
    await wrapper.get('#password-form').trigger('submit')
    expect(wrapper.text()).toContain('New password must be different from the current password.')

    await wrapper.get('#newPassword').setValue('new-password')
    await wrapper.get('#confirmPassword').setValue('other-password')
    await wrapper.get('#password-form').trigger('submit')
    expect(wrapper.text()).toContain('Confirm password must match the new password.')
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('changes the password, shows the API message, and clears the inputs', async () => {
    vi.mocked(changePassword).mockResolvedValue(
      'Password changed successfully. Existing access tokens remain valid until they expire.',
    )

    const { wrapper } = await mountAccount()
    await flushPromises()
    await wrapper.get('#currentPassword').setValue('current-password')
    await wrapper.get('#newPassword').setValue('new-password')
    await wrapper.get('#confirmPassword').setValue('new-password')
    await wrapper.get('[aria-label="Show new password"]').trigger('click')
    expect(wrapper.get('#newPassword').attributes('type')).toBe('text')

    await wrapper.get('#password-form').trigger('submit')
    await flushPromises()

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'current-password',
      newPassword: 'new-password',
    })
    expect(wrapper.text()).toContain('Password changed successfully.')
    expect(inputValue(wrapper, '#currentPassword')).toBe('')
    expect(inputValue(wrapper, '#newPassword')).toBe('')
    expect(inputValue(wrapper, '#confirmPassword')).toBe('')
    expect(wrapper.get('#newPassword').attributes('type')).toBe('password')
  })

  it('shows a password API error and keeps the form available', async () => {
    vi.mocked(changePassword).mockRejectedValue(
      new ApiClientError('The current password is incorrect.', 400, {
        CurrentPassword: ['The current password is incorrect.'],
      }),
    )

    const { wrapper } = await mountAccount()
    await flushPromises()
    await wrapper.get('#currentPassword').setValue('wrong-password')
    await wrapper.get('#newPassword').setValue('new-password')
    await wrapper.get('#confirmPassword').setValue('new-password')
    await wrapper.get('#password-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The current password is incorrect.')
    expect(inputValue(wrapper, '#newPassword')).toBe('new-password')
  })

  it('ignores a second password submit while the first is in flight', async () => {
    let resolvePassword: ((value: string) => void) | undefined
    vi.mocked(changePassword).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePassword = resolve
        }),
    )

    const { wrapper } = await mountAccount()
    await flushPromises()
    await wrapper.get('#currentPassword').setValue('current-password')
    await wrapper.get('#newPassword').setValue('new-password')
    await wrapper.get('#confirmPassword').setValue('new-password')

    const pending = wrapper.get('#password-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#password-form button[type="submit"]').text()).toContain('Updating…')

    await wrapper.get('#password-form').trigger('submit')
    expect(changePassword).toHaveBeenCalledTimes(1)

    resolvePassword?.('Password changed successfully.')
    await pending
    await flushPromises()
  })

  it('uses theme tokens and a single-column grid that widens on larger screens', async () => {
    const { wrapper } = await mountAccount()
    await flushPromises()

    expect(wrapper.get('section').classes()).toContain('min-w-0')
    expect(wrapper.get('#profile-form').classes()).toContain('bg-surface')
    expect(wrapper.get('#profile-form button[type="submit"]').classes()).toContain(
      'bg-accent-solid',
    )
    const grid = wrapper.get('#profile-form .grid')
    expect(grid.classes()).toContain('grid-cols-1')
    expect(grid.classes()).toContain('sm:grid-cols-2')
    expect(wrapper.html()).not.toContain('violet')
  })

  it('warns before leaving unsaved account changes and stays quiet after a save', async () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    const unchanged = await mountAccount()
    await flushPromises()

    await unchanged.router.push('/login')
    expect(confirm).not.toHaveBeenCalled()
    expect(unchanged.router.currentRoute.value.name).toBe('login')
    unchanged.wrapper.unmount()

    const dirty = await mountAccount()
    await flushPromises()
    await dirty.wrapper.get('#firstName').setValue('Grace')
    await dirty.router.push('/login')

    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE)
    expect(dirty.router.currentRoute.value.name).toBe('account')

    const leaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leaving)
    expect(leaving.defaultPrevented).toBe(true)

    vi.mocked(updateAccount).mockResolvedValue({ ...profile, firstName: 'Grace' })
    await dirty.wrapper.get('#profile-form').trigger('submit')
    await flushPromises()
    expect(dirty.wrapper.text()).toContain('Account updated successfully.')

    const afterSave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterSave)
    expect(afterSave.defaultPrevented).toBe(false)

    await dirty.wrapper.get('#currentPassword').setValue('secret')
    const passwordUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(passwordUnload)
    expect(passwordUnload.defaultPrevented).toBe(true)

    confirm.mockReturnValue(true)
    await dirty.router.push('/login')
    expect(dirty.router.currentRoute.value.name).toBe('login')
  })

  it('limits the date of birth control to today', async () => {
    const { wrapper } = await mountAccount()
    await flushPromises()

    expect(wrapper.get('#dateOfBirth').attributes('max')).toBe(formatLocalDate(new Date()))
  })
})
