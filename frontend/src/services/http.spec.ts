import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAccessSyncHandler, registerAccessSyncHandler } from '@/services/accessSync'
import { http } from '@/services/http'
import { clearAccessToken, setAccessToken } from '@/services/tokenStorage'
import {
  clearUnauthorizedSessionHandler,
  registerUnauthorizedSessionHandler,
} from '@/services/unauthorizedHandler'

function mockResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  }
}

function rejectWithStatus(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): Promise<never> {
  const response = mockResponse(config, status, data)
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    ),
  )
}

describe('http Axios interceptors', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    clearUnauthorizedSessionHandler()
  })

  afterEach(() => {
    sessionStorage.clear()
    clearAccessToken()
    clearUnauthorizedSessionHandler()
  })

  it('sends no Authorization header when no token is stored', async () => {
    let authorization: string | boolean | undefined

    await http.get('/ping', {
      adapter: async (config) => {
        authorization = AxiosHeaders.from(config.headers).get('Authorization')
        return mockResponse(config, 200)
      },
    })

    expect(authorization).toBeUndefined()
  })

  it('attaches Bearer token when a token is stored', async () => {
    setAccessToken('test-access-token')
    let authorization: string | boolean | undefined

    await http.get('/ping', {
      adapter: async (config) => {
        authorization = AxiosHeaders.from(config.headers).get('Authorization')
        return mockResponse(config, 200)
      },
    })

    expect(authorization).toBe('Bearer test-access-token')
  })

  it('invokes the unauthorized handler on HTTP 401 and preserves the rejection', async () => {
    const handler = vi.fn()
    registerUnauthorizedSessionHandler(handler)

    const error = await http
      .get('/secured', {
        adapter: async (config) => rejectWithStatus(config, 401, { success: false }),
      })
      .catch((reason: unknown) => reason)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(error).toMatchObject({ response: { status: 401 } })
  })

  it('does not invoke the unauthorized handler on HTTP 403', async () => {
    const handler = vi.fn()
    registerUnauthorizedSessionHandler(handler)

    await expect(
      http.get('/forbidden', {
        adapter: async (config) => rejectWithStatus(config, 403, { success: false }),
      }),
    ).rejects.toMatchObject({ response: { status: 403 } })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not invoke the unauthorized handler on HTTP 500', async () => {
    const handler = vi.fn()
    registerUnauthorizedSessionHandler(handler)

    await expect(
      http.get('/boom', {
        adapter: async (config) => rejectWithStatus(config, 500, { success: false }),
      }),
    ).rejects.toMatchObject({ response: { status: 500 } })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not clear the session for HTTP 200 with success: false', async () => {
    const handler = vi.fn()
    registerUnauthorizedSessionHandler(handler)

    const response = await http.get('/validation', {
      adapter: async (config) =>
        mockResponse(config, 200, {
          success: false,
          message: 'Validation failed',
          data: null,
          pagination: null,
          errors: { name: ['Required'] },
        }),
    })

    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({ success: false })
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects safely on HTTP 401 when no unauthorized handler is registered', async () => {
    clearUnauthorizedSessionHandler()

    await expect(
      http.get('/secured', {
        adapter: async (config) => rejectWithStatus(config, 401, { success: false }),
      }),
    ).rejects.toMatchObject({ response: { status: 401 } })
  })
})

describe('http access-version reporting', () => {
  const onVersion = vi.fn()
  const onForbidden = vi.fn()

  function respondWith(status: number, headers: Record<string, string>) {
    return async (config: InternalAxiosRequestConfig) => {
      const response = { ...mockResponse(config, status), headers }
      if (status >= 400) {
        return Promise.reject(
          new AxiosError('failed', AxiosError.ERR_BAD_REQUEST, config, undefined, response),
        )
      }
      return response
    }
  }

  beforeEach(() => {
    onVersion.mockReset()
    onForbidden.mockReset()
    registerAccessSyncHandler({ onVersion, onForbidden })
  })

  afterEach(() => {
    clearAccessSyncHandler()
  })

  it('reports the X-Access-Version header from a successful response', async () => {
    await http.get('/users', { adapter: respondWith(200, { 'x-access-version': 'abc123' }) })

    expect(onVersion).toHaveBeenCalledWith('abc123')
    expect(onForbidden).not.toHaveBeenCalled()
  })

  it('reports the header and a forbidden signal on HTTP 403', async () => {
    await expect(
      http.put('/users/5', {}, { adapter: respondWith(403, { 'x-access-version': 'def456' }) }),
    ).rejects.toMatchObject({ response: { status: 403 } })

    expect(onVersion).toHaveBeenCalledWith('def456')
    expect(onForbidden).toHaveBeenCalledTimes(1)
  })

  it('does not report a version on HTTP 401', async () => {
    registerUnauthorizedSessionHandler(vi.fn())

    await expect(
      http.get('/users', { adapter: respondWith(401, { 'x-access-version': 'stale' }) }),
    ).rejects.toMatchObject({ response: { status: 401 } })

    expect(onVersion).not.toHaveBeenCalled()
    expect(onForbidden).not.toHaveBeenCalled()
  })

  it('does nothing when the header is absent', async () => {
    await http.get('/auth/login', { adapter: respondWith(200, {}) })

    expect(onVersion).not.toHaveBeenCalled()
  })
})
