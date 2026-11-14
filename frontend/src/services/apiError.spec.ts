import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { REQUEST_TIMEOUT_MESSAGE, toApiClientError } from '@/services/apiError'
import { REQUEST_TIMEOUT_MS, http } from '@/services/http'

const config = { headers: new AxiosHeaders() }

describe('toApiClientError for failures without a response', () => {
  it('gives the shared client a request timeout', () => {
    expect(http.defaults.timeout).toBe(REQUEST_TIMEOUT_MS)
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it.each(['ECONNABORTED', 'ETIMEDOUT'])(
    'explains a %s timeout and warns against a blind retry',
    (code) => {
      const error = new AxiosError('timeout of 30000ms exceeded', code, config)

      const result = toApiClientError(error, 'Could not save the user.')

      expect(result.message).toBe(REQUEST_TIMEOUT_MESSAGE)
      expect(result.message).toContain('Refresh the page')
      expect(result.status).toBeNull()
    },
  )

  it('keeps the connection message when the server cannot be reached', () => {
    const error = new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)

    expect(toApiClientError(error, 'Could not save the user.').message).toBe(
      'Could not reach the server. Check that the API is running.',
    )
  })

  it('keeps the server message for a 500 response', () => {
    const error = new AxiosError('Request failed', AxiosError.ERR_BAD_RESPONSE, config, null, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config,
      data: { success: false, message: 'An unexpected error occurred. Please try again later.' },
    })

    expect(toApiClientError(error, 'Could not save the user.')).toMatchObject({
      message: 'An unexpected error occurred. Please try again later.',
      status: 500,
    })
  })
})
