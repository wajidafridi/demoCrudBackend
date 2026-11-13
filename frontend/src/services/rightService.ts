import { ApiClientError, toApiClientError } from '@/services/apiError'
import { http } from '@/services/http'
import type { PagedApiResponse, PaginationMetadata } from '@/types/api'
import type { RightResponse } from '@/types/right'

/** Backend `PageRequest.MaxPageSize`. The catalog is paged, and assignment needs every visible right. */
const MAX_PAGE_SIZE = 100

export interface RightListQuery {
  pageNumber: number
  pageSize: number
}

export interface RightListResult {
  rights: RightResponse[]
  pagination: PaginationMetadata
  message: string
}

/**
 * Rights catalog (`RightsController`).
 * `GET /rights` returns only rights the caller already holds. There is no search filter.
 */
export async function listRights(query: RightListQuery): Promise<RightListResult> {
  try {
    const { data } = await http.get<PagedApiResponse<RightResponse>>('/rights', {
      params: {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      },
    })

    if (!data.success || data.data == null) {
      throw new ApiClientError(data.message || 'Could not load rights.', null, data.errors)
    }

    return {
      rights: data.data,
      pagination: data.pagination,
      message: data.message,
    }
  } catch (error: unknown) {
    throw toApiClientError(error, 'Could not load rights.')
  }
}

/** Every right the catalog returns for the caller, across pages. */
export async function listAllRights(): Promise<RightResponse[]> {
  const first = await listRights({ pageNumber: 1, pageSize: MAX_PAGE_SIZE })
  const rights = [...first.rights]

  for (let pageNumber = 2; pageNumber <= first.pagination.totalPages; pageNumber += 1) {
    const next = await listRights({ pageNumber, pageSize: MAX_PAGE_SIZE })
    rights.push(...next.rights)
  }

  return rights
}
