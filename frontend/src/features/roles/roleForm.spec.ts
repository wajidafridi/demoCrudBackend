import { describe, expect, it } from 'vitest'

import {
  describeRoleError,
  roleNameError,
  toRoleRequest,
  validateRoleName,
} from '@/features/roles/roleForm'

describe('role form validation', () => {
  it('requires a role name and limits its length', () => {
    expect(validateRoleName('  ')).toBe('Role name is required.')
    expect(validateRoleName('a'.repeat(101))).toBe('Role name must be at most 100 characters.')
    expect(validateRoleName(' Admin ')).toBeNull()
  })

  it('trims the name into the request DTO', () => {
    expect(toRoleRequest('  Coordinator  ')).toEqual({ name: 'Coordinator' })
  })

  it('maps the Name field error and keeps unknown errors on the message', () => {
    const errors = {
      Name: ['The Name field is required.'],
      Other: ['Unexpected.'],
    }

    expect(roleNameError(errors)).toBe('The Name field is required.')
    expect(describeRoleError('Validation failed', errors)).toBe('Validation failed Unexpected.')
  })
})
