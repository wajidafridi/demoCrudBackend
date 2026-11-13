/** Matches backend `Common.ApiResponse<T>` (non-paginated). JSON uses camelCase. */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  /** Always null on non-paginated endpoints. */
  pagination: null
  errors: Record<string, string[]> | null
}

/** Matches backend `Common.PaginationMetadata`. */
export interface PaginationMetadata {
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

/**
 * Matches backend `Common.PagedApiResponse<IReadOnlyList<TItem>>`.
 * `T` is the item type; `data` is the item array (do not pass `T[]` as `T`).
 */
export interface PagedApiResponse<T> {
  success: boolean
  message: string
  data: T[] | null
  pagination: PaginationMetadata
  errors: Record<string, string[]> | null
}
