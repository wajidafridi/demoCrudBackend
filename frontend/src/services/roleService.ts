import { ApiClientError, toApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import type { ApiResponse, PagedApiResponse, PaginationMetadata } from '@/types/api'
import type { RightResponse, RoleRightsRequest } from '@/types/right'
import type { RoleRequest, RoleResponse } from '@/types/role'

/** Matches backend `PageRequest.DefaultPageSize`. */
export const ROLES_PAGE_SIZE = 20

/** Backend `PageRequest.MaxPageSize`. Used when a screen needs every visible page. */
const MAX_PAGE_SIZE = 100

export interface RoleListQuery {
  pageNumber: number
  pageSize: number
}

export interface RoleListResult {
  roles: RoleResponse[]
  pagination: PaginationMetadata
  message: string
}

/**
 * Roles API (`RolesController`).
 * The list accepts only `pageNumber` and `pageSize`. System roles are omitted by the backend.
 */
export async function listRoles(query: RoleListQuery): Promise<RoleListResult> {
  try {
    const { data } = await http.get<PagedApiResponse<RoleResponse>>('/roles', {
      params: {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      },
    })

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load roles.', null, data.errors)
    }

    return {
      roles: data.data,
      pagination: data.pagination,
      message: data.message,
    }
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load roles.')
  }
}

/** Every role the list endpoint returns, across pages. */
export async function listAllRoles(): Promise<RoleResponse[]> {
  const first = await listRoles({ pageNumber: 1, pageSize: MAX_PAGE_SIZE })
  const roles = [...first.roles]

  for (let pageNumber = 2; pageNumber <= first.pagination.totalPages; pageNumber += 1) {
    const next = await listRoles({ pageNumber, pageSize: MAX_PAGE_SIZE })
    roles.push(...next.roles)
  }

  return roles
}

export async function getRole(id: number): Promise<RoleResponse> {
  try {
    const { data } = await http.get<ApiResponse<RoleResponse>>(`/roles/${id}`)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load the role.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load the role.')
  }
}

export async function createRole(request: RoleRequest): Promise<RoleResponse> {
  try {
    const { data } = await http.post<ApiResponse<RoleResponse>>('/roles', request)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not create the role.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not create the role.')
  }
}

export async function updateRole(id: number, request: RoleRequest): Promise<RoleResponse> {
  try {
    const { data } = await http.put<ApiResponse<RoleResponse>>(`/roles/${id}`, request)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not update the role.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not update the role.')
  }
}

export async function deleteRole(id: number): Promise<string> {
  try {
    const { data } = await http.delete<ApiResponse<null>>(`/roles/${id}`)

    if (!data.success) {
      throw new ApiClientError(data.message || 'Could not delete the role.', null, data.errors)
    }

    return data.message
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not delete the role.')
  }
}

export async function getRoleRights(roleId: number): Promise<RightResponse[]> {
  try {
    const { data } = await http.get<ApiResponse<RightResponse[]>>(`/roles/${roleId}/rights`)

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load role rights.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load role rights.')
  }
}

export async function assignRoleRights(
  roleId: number,
  request: RoleRightsRequest,
): Promise<RightResponse[]> {
  try {
    const { data } = await http.post<ApiResponse<RightResponse[]>>(
      `/roles/${roleId}/rights`,
      request,
    )

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not assign rights.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not assign rights.')
  }
}

export async function removeRoleRights(
  roleId: number,
  request: RoleRightsRequest,
): Promise<RightResponse[]> {
  try {
    const { data } = await http.delete<ApiResponse<RightResponse[]>>(`/roles/${roleId}/rights`, {
      data: request,
    })

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not remove rights.', null, data.errors)
    }

    return data.data
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not remove rights.')
  }
}
