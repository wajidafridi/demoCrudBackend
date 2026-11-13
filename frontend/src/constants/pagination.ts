/** Matches backend `PageRequest.DefaultPageSize`. */
export const DEFAULT_PAGE_SIZE = 10

/** Matches backend `PageRequest.MaxPageSize`. */
export const MAX_PAGE_SIZE = 100

/** Allowed rows-per-page values for list screens. */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50, 100] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

/**
 * Scroll the table body instead of the page once the list is taller than ~10 rows.
 * Keeps the header sticky inside the same scroll container.
 */
export const TABLE_SCROLL_CLASS =
  'max-h-[min(34rem,calc(100dvh-16rem))] overflow-auto overscroll-contain'
