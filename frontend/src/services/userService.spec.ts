import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import { createUser, deleteUser, getUser, listUsers, updateUser } from '@/services/userService'
import type { ApiResponse, PagedApiResponse } from '@/types/api'
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '@/types/user'

vi.mock('@/services/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const user: UserResponse = {
  id: 2,
  isSystem: false,
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  roleId: 2,
  roleName: 'Admin',
  address: null,
  phoneNumber: null,
  gender: null,
  dateOfBirth: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  age: null,
}

const pagination = {
  pageNumber: 1,
  pageSize: 10,
  totalCount: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
}

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
  }
}

function axiosFailure(status: number, data: unknown): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    axiosResponse(data, status),
  )
}

const createBody: CreateUserRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  password: 'secret1',
  roleId: 2,
  address: null,
  phoneNumber: null,
  gender: null,
  dateOfBirth: null,
  imageUrl: null,
}

const updateBody: UpdateUserRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  userName: 'ada',
  roleId: 2,
  address: null,
  phoneNumber: null,
  gender: null,
  dateOfBirth: null,
  imageUrl: null,
}

describe('userService', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.post).mockReset()
    vi.mocked(http.put).mockReset()
    vi.mocked(http.delete).mockReset()
  })

  it('lists users with pageNumber and pageSize only', async () => {
    const envelope: PagedApiResponse<UserResponse> = {
      success: true,
      message: 'Users fetched successfully.',
      data: [user],
      pagination,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    const result = await listUsers({ pageNumber: 2, pageSize: 10 })

    expect(http.get).toHaveBeenCalledWith('/users', {
      params: { pageNumber: 2, pageSize: 10 },
    })
    expect(result.users).toEqual([user])
    expect(result.pagination).toEqual(pagination)
    expect(result.message).toBe('Users fetched successfully.')
  })

  it('rejects a list envelope with success false', async () => {
    const envelope: PagedApiResponse<UserResponse> = {
      success: false,
      message: 'Could not load users.',
      data: null,
      pagination,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    await expect(listUsers({ pageNumber: 1, pageSize: 10 })).rejects.toMatchObject({
      message: 'Could not load users.',
    })
  })

  it('loads one user from GET /users/{id}', async () => {
    const envelope: ApiResponse<UserResponse> = {
      success: true,
      message: 'User fetched successfully.',
      data: user,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    await expect(getUser(2)).resolves.toEqual(user)
    expect(http.get).toHaveBeenCalledWith('/users/2')
  })

  it('creates a user with POST /users', async () => {
    const envelope: ApiResponse<UserResponse> = {
      success: true,
      message: 'User created successfully.',
      data: user,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.post).mockResolvedValue(axiosResponse(envelope, 201))

    await expect(createUser(createBody)).resolves.toEqual(user)
    expect(http.post).toHaveBeenCalledWith('/users', createBody)
  })

  it('updates a user with PUT /users/{id} and returns the message', async () => {
    const envelope: ApiResponse<null> = {
      success: true,
      message: 'User updated successfully.',
      data: null,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.put).mockResolvedValue(axiosResponse(envelope))

    await expect(updateUser(2, updateBody)).resolves.toBe('User updated successfully.')
    expect(http.put).toHaveBeenCalledWith('/users/2', updateBody)
  })

  it('deletes a user with DELETE /users/{id}', async () => {
    const envelope: ApiResponse<null> = {
      success: true,
      message: 'User deleted successfully.',
      data: null,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.delete).mockResolvedValue(axiosResponse(envelope))

    await expect(deleteUser(2)).resolves.toBe('User deleted successfully.')
    expect(http.delete).toHaveBeenCalledWith('/users/2')
  })

  it('maps validation errors from a 400 response', async () => {
    vi.mocked(http.post).mockRejectedValue(
      axiosFailure(400, {
        success: false,
        message: 'Validation failed',
        data: null,
        pagination: null,
        errors: { Email: ['The Email field is not a valid e-mail address.'] },
      }),
    )

    const error = await createUser(createBody).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      message: 'Validation failed',
      status: 400,
      fieldErrors: { Email: ['The Email field is not a valid e-mail address.'] },
    })
  })

  it('keeps forbidden and not-found responses as API errors', async () => {
    vi.mocked(http.delete).mockRejectedValueOnce(
      axiosFailure(403, {
        success: false,
        message: 'The system user cannot be deleted.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )

    await expect(deleteUser(1)).rejects.toMatchObject({
      status: 403,
      message: 'The system user cannot be deleted.',
    })

    vi.mocked(http.delete).mockRejectedValueOnce(
      axiosFailure(404, {
        success: false,
        message: 'User with id = 9 was not found.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )

    await expect(deleteUser(9)).rejects.toMatchObject({
      status: 404,
      message: 'User with id = 9 was not found.',
    })
  })

  it('reports a network failure when the server cannot be reached', async () => {
    vi.mocked(http.get).mockRejectedValue(new AxiosError('Network Error'))

    await expect(listUsers({ pageNumber: 1, pageSize: 10 })).rejects.toMatchObject({
      status: null,
      message: 'Could not reach the server. Check that the API is running.',
    })
  })
})
