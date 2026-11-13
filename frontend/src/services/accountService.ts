import { ApiClientError, toApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import type { AccountProfile } from '@/types/account'
import type { ApiResponse } from '@/types/api'

/** Signed-in profile (`AccountController`). Requires authentication only. */
export async function getAccount(): Promise<AccountProfile> {
  try {
    const { data } = await http.get<ApiResponse<AccountProfile>>('/account')

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load your account.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load your account.')
  }
}
