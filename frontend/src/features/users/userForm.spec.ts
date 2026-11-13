import { describe, expect, it } from 'vitest'

import {
  describeUserFormError,
  emptyUserForm,
  fieldErrorMessage,
  parseUserId,
  toCreateRequest,
  toUpdateRequest,
  userToFormValues,
  validateUserForm,
  type UserFormValues,
} from '@/features/users/userForm'
import type { UserResponse } from '@/types/user'

function validValues(overrides: Partial<UserFormValues> = {}): UserFormValues {
  return {
    ...emptyUserForm(),
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    userName: 'ada',
    password: 'secret1',
    roleId: '2',
    ...overrides,
  }
}

const user: UserResponse = {
  id: 4,
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  roleId: 2,
  roleName: 'Admin',
  address: '1 Analytical St',
  phoneNumber: '555',
  gender: 'Female',
  dateOfBirth: '1990-01-01T00:00:00',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  age: 36,
}

describe('validateUserForm', () => {
  it('requires the create-user fields', () => {
    const errors = validateUserForm(emptyUserForm(), 'create')

    expect(errors.firstName).toBe('First name is required.')
    expect(errors.lastName).toBe('Last name is required.')
    expect(errors.email).toBe('Email is required.')
    expect(errors.userName).toBe('Username is required.')
    expect(errors.password).toBe('Password is required.')
    expect(errors.roleId).toBe('Role is required.')
  })

  it('does not require a password when editing', () => {
    const errors = validateUserForm(validValues({ password: '' }), 'edit')
    expect(errors.password).toBeUndefined()
    expect(errors).toEqual({})
  })

  it('checks email, password length, role id, and optional field limits', () => {
    const errors = validateUserForm(
      validValues({
        email: 'not-an-email',
        password: '12345',
        roleId: '0',
        phoneNumber: 'x'.repeat(51),
        dateOfBirth: '2026-02-31',
      }),
      'create',
    )

    expect(errors.email).toBe('Enter a valid email address.')
    expect(errors.password).toBe('Password must be at least 6 characters.')
    expect(errors.roleId).toBe('Role is required.')
    expect(errors.phoneNumber).toBe('Phone number must be at most 50 characters.')
    expect(errors.dateOfBirth).toBe('Enter a valid date of birth.')
  })

  it('accepts a complete create form', () => {
    expect(validateUserForm(validValues({ address: '  ' }), 'create')).toEqual({})
  })
})

describe('user form request mapping', () => {
  it('maps form values onto the create DTO and trims text', () => {
    expect(
      toCreateRequest(
        validValues({
          firstName: ' Ada ',
          address: '  ',
          dateOfBirth: '1990-01-01',
        }),
      ),
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      userName: 'ada',
      password: 'secret1',
      roleId: 2,
      address: null,
      phoneNumber: null,
      gender: null,
      dateOfBirth: '1990-01-01',
      imageUrl: null,
    })
  })

  it('maps an existing user onto the update DTO without a password', () => {
    const values = userToFormValues(user)

    expect(values.dateOfBirth).toBe('1990-01-01')
    expect(values.password).toBe('')
    expect(toUpdateRequest(values)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      userName: 'ada',
      roleId: 2,
      address: '1 Analytical St',
      phoneNumber: '555',
      gender: 'Female',
      dateOfBirth: '1990-01-01',
      imageUrl: null,
    })
  })

  it('reads API field errors case-insensitively and keeps unknown keys separate', () => {
    const errors = {
      Email: ['The Email field is not a valid e-mail address.'],
      'userRequest.FirstName': ['The FirstName field is required.'],
      Mystery: ['Something else went wrong.'],
    }

    expect(fieldErrorMessage(errors, 'email')).toBe(
      'The Email field is not a valid e-mail address.',
    )
    expect(fieldErrorMessage(errors, 'firstName')).toBe('The FirstName field is required.')
    expect(describeUserFormError('Validation failed', errors)).toBe(
      'Validation failed Something else went wrong.',
    )
  })

  it('parses positive integer route ids', () => {
    expect(parseUserId('2')).toBe(2)
    expect(parseUserId('0')).toBeNull()
    expect(parseUserId('abc')).toBeNull()
    expect(parseUserId(undefined)).toBeNull()
  })
})
