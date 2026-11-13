import { ApiClientError, toApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import type { AccountProfile, ChangePasswordRequest, UpdateAccountRequest } from '@/types/account'
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

/** Updates the signed-in profile. The caller id is taken from the access token. */
export async function updateAccount(request: UpdateAccountRequest): Promise<AccountProfile> {
  try {
    const { data } = await http.put<ApiResponse<AccountProfile>>('/account', request)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not update your account.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not update your account.')
  }
}

/** Changes the signed-in password. Existing access tokens stay valid until they expire. */
export async function changePassword(request: ChangePasswordRequest): Promise<string> {
  try {
    const { data } = await http.post<ApiResponse<null>>('/account/change-password', request)

    if (!data.success) {
      throw new ApiClientError(data.message || 'Could not change your password.', null, data.errors)
    }

    return data.message
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not change your password.')
  }
}
