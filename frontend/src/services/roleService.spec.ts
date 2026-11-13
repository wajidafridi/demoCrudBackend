import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/services/http'
import {
  assignRoleRights,
  createRole,
  deleteRole,
  getRole,
  getRoleRights,
  listAllRoles,
  listRoles,
  removeRoleRights,
  updateRole,
} from '@/services/roleService'
import type { ApiResponse, PagedApiResponse } from '@/types/api'
import type { RoleResponse } from '@/types/role'

vi.mock('@/services/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const role: RoleResponse = { id: 2, name: 'Admin' }

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

describe('roleService', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    vi.mocked(http.post).mockReset()
    vi.mocked(http.put).mockReset()
    vi.mocked(http.delete).mockReset()
  })

  it('lists roles with pageNumber and pageSize only', async () => {
    const envelope: PagedApiResponse<RoleResponse> = {
      success: true,
      message: 'Roles fetched successfully.',
      data: [role],
      pagination,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    const result = await listRoles({ pageNumber: 1, pageSize: 10 })

    expect(http.get).toHaveBeenCalledWith('/roles', {
      params: { pageNumber: 1, pageSize: 10 },
    })
    expect(result.roles).toEqual([role])
    expect(result.pagination).toEqual(pagination)
  })

  it('follows later pages when collecting every visible role', async () => {
    const first: PagedApiResponse<RoleResponse> = {
      success: true,
      message: 'Roles fetched successfully.',
      data: [role],
      pagination: { ...pagination, pageSize: 100, totalCount: 2, totalPages: 2, hasNextPage: true },
      errors: null,
    }
    const second: PagedApiResponse<RoleResponse> = {
      success: true,
      message: 'Roles fetched successfully.',
      data: [{ id: 3, name: 'User' }],
      pagination: {
        ...pagination,
        pageNumber: 2,
        pageSize: 100,
        totalCount: 2,
        totalPages: 2,
        hasPreviousPage: true,
      },
      errors: null,
    }
    vi.mocked(http.get)
      .mockResolvedValueOnce(axiosResponse(first))
      .mockResolvedValueOnce(axiosResponse(second))

    await expect(listAllRoles()).resolves.toEqual([role, { id: 3, name: 'User' }])
    expect(http.get).toHaveBeenNthCalledWith(1, '/roles', {
      params: { pageNumber: 1, pageSize: 100 },
    })
    expect(http.get).toHaveBeenNthCalledWith(2, '/roles', {
      params: { pageNumber: 2, pageSize: 100 },
    })
  })

  it('loads, creates, and updates a role', async () => {
    const envelope: ApiResponse<RoleResponse> = {
      success: true,
      message: 'Role fetched successfully.',
      data: role,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))
    vi.mocked(http.post).mockResolvedValue(axiosResponse(envelope, 201))
    vi.mocked(http.put).mockResolvedValue(
      axiosResponse({ ...envelope, message: 'Role updated successfully.' }),
    )

    await expect(getRole(2)).resolves.toEqual(role)
    await expect(createRole({ name: 'Admin' })).resolves.toEqual(role)
    await expect(updateRole(2, { name: 'Admin' })).resolves.toEqual(role)

    expect(http.get).toHaveBeenCalledWith('/roles/2')
    expect(http.post).toHaveBeenCalledWith('/roles', { name: 'Admin' })
    expect(http.put).toHaveBeenCalledWith('/roles/2', { name: 'Admin' })
  })

  it('deletes a role and returns the message', async () => {
    const envelope: ApiResponse<null> = {
      success: true,
      message: 'Role deleted successfully.',
      data: null,
      pagination: null,
      errors: null,
    }
    vi.mocked(http.delete).mockResolvedValue(axiosResponse(envelope))

    await expect(deleteRole(2)).resolves.toBe('Role deleted successfully.')
    expect(http.delete).toHaveBeenCalledWith('/roles/2')
  })

  it('maps forbidden, not-found, and conflict responses', async () => {
    vi.mocked(http.delete).mockRejectedValueOnce(
      axiosFailure(403, {
        success: false,
        message: 'The system role cannot be changed.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )
    await expect(deleteRole(1)).rejects.toMatchObject({
      status: 403,
      message: 'The system role cannot be changed.',
    })

    vi.mocked(http.get).mockRejectedValueOnce(
      axiosFailure(404, {
        success: false,
        message: 'Role with id = 9 was not found.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )
    await expect(getRole(9)).rejects.toMatchObject({
      status: 404,
      message: 'Role with id = 9 was not found.',
    })

    vi.mocked(http.delete).mockRejectedValueOnce(
      axiosFailure(409, {
        success: false,
        message: 'This role cannot be deleted while users are assigned to it.',
        data: null,
        pagination: null,
        errors: null,
      }),
    )
    await expect(deleteRole(2)).rejects.toMatchObject({
      status: 409,
      message: 'This role cannot be deleted while users are assigned to it.',
    })
  })

  it('reads and changes role rights with the rightIds body', async () => {
    const rightsEnvelope: ApiResponse<{ id: number; name: string }[]> = {
      success: true,
      message: 'Role rights fetched successfully.',
      data: [{ id: 1, name: 'User_View' }],
      pagination: null,
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(rightsEnvelope))
    vi.mocked(http.post).mockResolvedValue(
      axiosResponse({ ...rightsEnvelope, message: 'Rights assigned successfully.' }),
    )
    vi.mocked(http.delete).mockResolvedValue(
      axiosResponse({
        ...rightsEnvelope,
        message: 'Rights removed successfully.',
        data: [],
      }),
    )

    await expect(getRoleRights(2)).resolves.toEqual([{ id: 1, name: 'User_View' }])
    await expect(assignRoleRights(2, { rightIds: [1] })).resolves.toEqual([
      { id: 1, name: 'User_View' },
    ])
    await expect(removeRoleRights(2, { rightIds: [1] })).resolves.toEqual([])

    expect(http.get).toHaveBeenCalledWith('/roles/2/rights')
    expect(http.post).toHaveBeenCalledWith('/roles/2/rights', { rightIds: [1] })
    expect(http.delete).toHaveBeenCalledWith('/roles/2/rights', { data: { rightIds: [1] } })
  })
})
