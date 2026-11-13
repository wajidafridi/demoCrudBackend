import { isAxiosError } from 'axios'

/** Map login failures to a user-visible message. Never includes credentials. */
export function toLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data
    if (
      payload != null &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string' &&
      (payload as { message: string }).message.trim().length > 0
    ) {
      return (payload as { message: string }).message
    }

    if (error.response?.status === 401) {
      return 'Invalid username or password.'
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Login failed. Please try again.'
}
