import axios, { AxiosHeaders, isAxiosError } from 'axios'

import { getAccessToken } from '@/services/tokenStorage'
import { handleUnauthorizedSession } from '@/services/unauthorizedHandler'

/** Shared Axios client. Feature services will import this — do not call Axios from components. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token == null || token.length === 0) {
    return config
  }

  const headers = AxiosHeaders.from(config.headers)
  // Keep an explicitly provided Authorization header (e.g. a one-off override).
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Only HTTP 401 means "session is no longer valid".
    // 403 / 4xx / 5xx / success:false envelopes stay as normal API failures.
    if (isAxiosError(error) && error.response?.status === 401) {
      handleUnauthorizedSession()
    }

    return Promise.reject(error)
  },
)
