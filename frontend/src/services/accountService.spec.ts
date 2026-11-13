import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { changePassword, getAccount, updateAccount } from '@/services/accountService'
import { http } from '@/services/http'
import type { AccountProfile, UpdateAccountRequest } from '@/types/account'
import type { ApiResponse } from '@/types/api'

vi.mock('@/services/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

const profile: AccountProfile = {
  id: 7,
  userName: 'ada',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phoneNumber: null,
  gender: null,
  dateOfBirth: null,
  address: null,
  imageUrl: null,
  roleId: 2,
  roleName: 'Admin',
  isSystem: false,
  createdAt: '2026-01-01T00:00:00Z',
}

const updateBody: UpdateAccountRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phoneNumber: null,
  gender: null,
  dateOfBirth: null,
  address: null,
  imageUrl: null,
}

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
  }
}

describe('accountService', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.put).mockReset()
    vi.mocked(http.post).mockReset()
  })

  it('loads the signed-in account', async () => {
    vi.mocked(http.get).mockResolvedValue(
      axiosResponse<ApiResponse<AccountProfile>>({
        success: true,
        message: 'Account fetched successfully.',
        data: profile,
        pagination: null,
        errors: null,
      }),
    )

    await expect(getAccount()).resolves.toEqual(profile)
    expect(http.get).toHaveBeenCalledWith('/account')
  })

  it('puts the profile body without adding an id', async () => {
    vi.mocked(http.put).mockResolvedValue(
      axiosResponse<ApiResponse<AccountProfile>>({
        success: true,
        message: 'Account updated successfully.',
        data: profile,
        pagination: null,
        errors: null,
      }),
    )

    await updateAccount(updateBody)

    expect(http.put).toHaveBeenCalledWith('/account', updateBody)
    expect(updateBody).not.toHaveProperty('id')
    expect(updateBody).not.toHaveProperty('roleId')
    expect(updateBody).not.toHaveProperty('isSystem')
  })

  it('posts only the current and new passwords', async () => {
    vi.mocked(http.post).mockResolvedValue(
      axiosResponse<ApiResponse<null>>({
        success: true,
        message: 'Password changed successfully.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )

    const body = { currentPassword: 'current-password', newPassword: 'new-password' }
    await expect(changePassword(body)).resolves.toBe('Password changed successfully.')
    expect(http.post).toHaveBeenCalledWith('/account/change-password', body)
  })

  it('surfaces a password API error without changing the request', async () => {
    vi.mocked(http.post).mockRejectedValue(
      new AxiosError(
        'Request failed',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        axiosResponse(
          {
            success: false,
            message: 'The current password is incorrect.',
            data: null,
            pagination: null,
            errors: { CurrentPassword: ['The current password is incorrect.'] },
          },
          400,
        ),
      ),
    )

    await expect(
      changePassword({ currentPassword: 'wrong-password', newPassword: 'new-password' }),
    ).rejects.toMatchObject({
      message: 'The current password is incorrect.',
      fieldErrors: { CurrentPassword: ['The current password is incorrect.'] },
    })
  })
})
