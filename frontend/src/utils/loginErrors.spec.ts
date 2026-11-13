import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { toLoginErrorMessage } from '@/utils/loginErrors'

describe('toLoginErrorMessage', () => {
  it('reads the API envelope message from an Axios error', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {
        success: false,
        message: 'Invalid username or password.',
        data: null,
        pagination: null,
        errors: null,
      },
    }

    expect(toLoginErrorMessage(error)).toBe('Invalid username or password.')
  })

  it('falls back for unknown errors', () => {
    expect(toLoginErrorMessage(new Error('Nope'))).toBe('Nope')
    expect(toLoginErrorMessage({})).toBe('Login failed. Please try again.')
  })
})
