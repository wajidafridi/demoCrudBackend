import { describe, expect, it } from 'vitest'

import {
  profileToForm,
  readFieldError,
  toUpdateAccountRequest,
  validateAccountForm,
  validatePasswordForm,
  type AccountFormValues,
} from '@/features/account/accountForm'
import type { AccountProfile } from '@/types/account'
import { formatLocalDate } from '@/utils/dateOfBirth'

const profile: AccountProfile = {
  id: 7,
  userName: 'ada',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phoneNumber: '555',
  gender: 'Female',
  dateOfBirth: '1990-01-01T00:00:00Z',
  address: '1 Analytical St',
  imageUrl: 'https://example.com/ada.png',
  roleId: 2,
  roleName: 'Admin',
  isSystem: false,
  createdAt: '2026-01-01T00:00:00Z',
}

function values(overrides: Partial<AccountFormValues> = {}): AccountFormValues {
  return {
    ...profileToForm(profile),
    ...overrides,
  }
}

describe('account form', () => {
  it('maps a profile onto editable fields and keeps the date input value', () => {
    expect(profileToForm(profile).dateOfBirth).toBe('1990-01-01')
    expect(profileToForm({ ...profile, phoneNumber: null, address: null }).phoneNumber).toBe('')
  })

  it('requires names and a valid email', () => {
    const errors = validateAccountForm(
      values({ firstName: ' ', lastName: '', email: 'not-an-email' }),
    )

    expect(errors.firstName).toBe('First name is required.')
    expect(errors.lastName).toBe('Last name is required.')
    expect(errors.email).toBe('Enter a valid email address.')
  })

  it('rejects an impossible date of birth', () => {
    expect(validateAccountForm(values({ dateOfBirth: '1990-13-01' })).dateOfBirth).toBe(
      'Enter a valid date of birth.',
    )
  })

  it('accepts a past date and today, and rejects a future date of birth', () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    expect(validateAccountForm(values({ dateOfBirth: '1990-01-01' })).dateOfBirth).toBeUndefined()
    expect(
      validateAccountForm(values({ dateOfBirth: formatLocalDate(today) })).dateOfBirth,
    ).toBeUndefined()
    expect(
      validateAccountForm(values({ dateOfBirth: formatLocalDate(tomorrow) })).dateOfBirth,
    ).toBe('Date of birth cannot be in the future.')
  })

  it('builds an update body without identity, role, or password fields', () => {
    const body = toUpdateAccountRequest(
      values({
        firstName: ' Ada ',
        phoneNumber: '  ',
        address: '  ',
      }),
      profile.imageUrl,
    )

    expect(body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: null,
      gender: 'Female',
      dateOfBirth: '1990-01-01',
      address: null,
      imageUrl: 'https://example.com/ada.png',
    })
    expect(Object.keys(body)).toEqual([
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'gender',
      'dateOfBirth',
      'address',
      'imageUrl',
    ])
  })

  it('requires the current password and an 8 to 100 character new password', () => {
    expect(
      validatePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }),
    ).toMatchObject({
      currentPassword: 'Current password is required.',
      newPassword: 'New password is required.',
      confirmPassword: 'Confirm password is required.',
    })

    expect(
      validatePasswordForm({
        currentPassword: 'current-password',
        newPassword: 'short',
        confirmPassword: 'short',
      }).newPassword,
    ).toBe('New password must be at least 8 characters.')

    const longPassword = 'a'.repeat(101)
    expect(
      validatePasswordForm({
        currentPassword: 'current-password',
        newPassword: longPassword,
        confirmPassword: longPassword,
      }).newPassword,
    ).toBe('New password must be at most 100 characters.')
  })

  it('rejects a confirmation mismatch and a new password that matches the current one', () => {
    expect(
      validatePasswordForm({
        currentPassword: 'current-password',
        newPassword: 'new-password',
        confirmPassword: 'other-password',
      }).confirmPassword,
    ).toBe('Confirm password must match the new password.')

    expect(
      validatePasswordForm({
        currentPassword: 'current-password',
        newPassword: 'current-password',
        confirmPassword: 'current-password',
      }).newPassword,
    ).toBe('New password must be different from the current password.')
  })

  it('reads a camelCase or PascalCase API field error', () => {
    expect(readFieldError({ NewPassword: ['Too short.'] }, 'newPassword')).toBe('Too short.')
  })
})
