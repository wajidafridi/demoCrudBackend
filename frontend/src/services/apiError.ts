import { isAxiosError } from 'axios'

/** Normalized API failure for feature code. HTTP 401 is still handled by the Axios interceptor. */
export class ApiClientError extends Error {
  readonly status: number | null
  readonly fieldErrors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number | null,
    fieldErrors: Record<string, string[]> | null,
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readFieldErrors(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value)) {
    return null
  }

  const fieldErrors: Record<string, string[]> = {}

  for (const [key, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) {
      continue
    }

    const texts = messages.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
    if (texts.length > 0) {
      fieldErrors[key] = texts
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
}

function readEnvelopeMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null
  }

  const message = payload.message
  if (typeof message !== 'string' || message.trim().length === 0) {
    return null
  }

  return message
}

function fallbackForStatus(status: number | null, fallback: string): string {
  if (status == null) {
    return 'Could not reach the server. Check that the API is running.'
  }

  if (status === 401) {
    return 'Your session has expired. Sign in again.'
  }

  if (status === 403) {
    return 'You are not allowed to perform this action.'
  }

  if (status === 404) {
    return 'The requested record was not found.'
  }

  if (status === 409) {
    return 'This record conflicts with an existing one.'
  }

  return fallback
}

/** Map an unknown rejection (Axios or otherwise) to `ApiClientError`. */
export function toApiClientError(error: unknown, fallback: string): ApiClientError {
  if (error instanceof ApiClientError) {
    return error
  }

  if (isAxiosError(error)) {
    const payload = error.response?.data
    const message = readEnvelopeMessage(payload)
    const status = error.response?.status ?? null
    return new ApiClientError(
      message ?? fallbackForStatus(status, fallback),
      status,
      readFieldErrors(isRecord(payload) ? payload.errors : null),
    )
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return new ApiClientError(error.message, null, null)
  }

  return new ApiClientError(fallback, null, null)
}
