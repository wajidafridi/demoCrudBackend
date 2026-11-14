import type { RouteLocationNormalized, Router } from 'vue-router'

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

/**
 * Updates the tab title after each navigation. Navigations that a guard cancels or redirects away
 * from (for example "stay on this page" in the unsaved-changes prompt) keep the current title.
 */
export function setupDocumentTitle(router: Router): void {
  router.afterEach((to, _from, failure) => {
    if (failure != null) {
      return
    }

    document.title = formatDocumentTitle(to)
  })
}
