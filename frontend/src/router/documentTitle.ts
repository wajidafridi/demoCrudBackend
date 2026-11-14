import type { RouteLocationNormalized } from 'vue-router'

export const APP_TITLE = 'Demo CRUD'

export function formatDocumentTitle(route: Pick<RouteLocationNormalized, 'matched'>): string {
  const page = [...route.matched]
    .reverse()
    .map((record) => record.meta.title)
    .find((title): title is string => typeof title === 'string' && title.length > 0)

  if (page == null || page === APP_TITLE) {
    return APP_TITLE
  }

  const suffix = ` · ${APP_TITLE}`
  if (page.endsWith(suffix)) {
    return page
  }

  return `${page}${suffix}`
}
