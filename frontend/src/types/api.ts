/** Matches the backend Common ApiResponse envelope. */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  pagination: null
  errors: Record<string, string[]> | null
}

export interface PaginationMetadata {
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

/** Matches the backend Common PagedApiResponse envelope. */
export interface PagedApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  pagination: PaginationMetadata
  errors: Record<string, string[]> | null
}
