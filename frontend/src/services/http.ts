import axios, { AxiosHeaders, isAxiosError, type AxiosResponse } from 'axios'

import { ACCESS_VERSION_HEADER, reportAccessVersion, reportForbidden } from '@/services/accessSync'
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

function reportVersionFrom(response: AxiosResponse | undefined): void {
  if (response == null) {
    return
  }

  const value = AxiosHeaders.from(response.headers as Record<string, string>).get(
    ACCESS_VERSION_HEADER,
  )
  if (typeof value === 'string' && value.length > 0) {
    reportAccessVersion(value)
  }
}

http.interceptors.response.use(
  (response) => {
    reportVersionFrom(response)
    return response
  },
  (error: unknown) => {
    // Only HTTP 401 means "session is no longer valid".
    // 403 / 4xx / 5xx / success:false envelopes stay as normal API failures.
    if (isAxiosError(error)) {
      const status = error.response?.status
      if (status === 401) {
        handleUnauthorizedSession()
      } else {
        reportVersionFrom(error.response)
        if (status === 403) {
          // A right may have been revoked since the UI last synced.
          reportForbidden()
        }
      }
    }

    return Promise.reject(error)
  },
)
