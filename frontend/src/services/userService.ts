import { ApiClientError, toApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import type { ApiResponse, PagedApiResponse, PaginationMetadata } from '@/types/api'
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '@/types/user'

/** Matches backend `PageRequest.DefaultPageSize`. */
export const USERS_PAGE_SIZE = 20

export interface UserListQuery {
  pageNumber: number
  pageSize: number
}

export interface UserListResult {
  users: UserResponse[]
  pagination: PaginationMetadata
  message: string
}

/**
 * Users API (`UsersController`).
 * The list endpoint accepts only `pageNumber` and `pageSize` — there is no search filter.
 */
export async function listUsers(query: UserListQuery): Promise<UserListResult> {
  try {
    const { data } = await http.get<PagedApiResponse<UserResponse>>('/users', {
      params: {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      },
    })

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load users.', null, data.errors)
    }

    return {
      users: data.data,
      pagination: data.pagination,
      message: data.message,
    }
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load users.')
  }
}

export async function getUser(id: number): Promise<UserResponse> {
  try {
    const { data } = await http.get<ApiResponse<UserResponse>>(`/users/${id}`)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load the user.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load the user.')
  }
}

export async function createUser(request: CreateUserRequest): Promise<UserResponse> {
  try {
    const { data } = await http.post<ApiResponse<UserResponse>>('/users', request)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not create the user.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not create the user.')
  }
}

/** Update and delete succeed with `data: null` and a message. */
export async function updateUser(id: number, request: UpdateUserRequest): Promise<string> {
  try {
    const { data } = await http.put<ApiResponse<null>>(`/users/${id}`, request)

    if (!data.success) {
      throw new ApiClientError(data.message || 'Could not update the user.', null, data.errors)
    }

    return data.message
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not update the user.')
  }
}

export async function deleteUser(id: number): Promise<string> {
  try {
    const { data } = await http.delete<ApiResponse<null>>(`/users/${id}`)

    if (!data.success) {
      throw new ApiClientError(data.message || 'Could not delete the user.', null, data.errors)
    }

    return data.message
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not delete the user.')
  }
}
