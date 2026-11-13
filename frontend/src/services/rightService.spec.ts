import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/services/http'
import { listAllRights, listRights } from '@/services/rightService'
import type { PagedApiResponse } from '@/types/api'
import type { RightResponse } from '@/types/right'

vi.mock('@/services/http', () => ({
  http: {
    get: vi.fn(),
  },
}))

const right: RightResponse = { id: 1, name: 'User_View' }

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
  }
}

describe('rightService', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('lists rights with pageNumber and pageSize', async () => {
    const envelope: PagedApiResponse<RightResponse> = {
      success: true,
      message: 'Rights fetched successfully.',
      data: [right],
      pagination: {
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    const result = await listRights({ pageNumber: 1, pageSize: 20 })

    expect(http.get).toHaveBeenCalledWith('/rights', {
      params: { pageNumber: 1, pageSize: 20 },
    })
    expect(result.rights).toEqual([right])
  })

  it('collects every catalog page', async () => {
    const page = (
      items: RightResponse[],
      pageNumber: number,
      totalPages: number,
    ): PagedApiResponse<RightResponse> => ({
      success: true,
      message: 'Rights fetched successfully.',
      data: items,
      pagination: {
        pageNumber,
        pageSize: 100,
        totalCount: 2,
        totalPages,
        hasPreviousPage: pageNumber > 1,
        hasNextPage: pageNumber < totalPages,
      },
      errors: null,
    })

    vi.mocked(http.get)
      .mockResolvedValueOnce(axiosResponse(page([right], 1, 2)))
      .mockResolvedValueOnce(axiosResponse(page([{ id: 2, name: 'User_Create' }], 2, 2)))

    await expect(listAllRights()).resolves.toEqual([right, { id: 2, name: 'User_Create' }])
    expect(http.get).toHaveBeenNthCalledWith(2, '/rights', {
      params: { pageNumber: 2, pageSize: 100 },
    })
  })

  it('rejects an unsuccessful catalog envelope', async () => {
    const envelope: PagedApiResponse<RightResponse> = {
      success: false,
      message: 'Could not load rights.',
      data: null,
      pagination: {
        pageNumber: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      errors: null,
    }
    vi.mocked(http.get).mockResolvedValue(axiosResponse(envelope))

    await expect(listRights({ pageNumber: 1, pageSize: 20 })).rejects.toMatchObject({
      message: 'Could not load rights.',
    })
  })
})
