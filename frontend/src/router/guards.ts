import { watch } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'
import { resolveSafeInternalPath } from '@/utils/safeRedirect'

function collectRequiredPermissions(permissionsLists: Array<string[] | undefined>): string[] {
  const required = new Set<string>()
  for (const list of permissionsLists) {
    if (!list) {
      continue
    }
    for (const permission of list) {
      required.add(permission)
    }
  }
  return [...required]
}

function requiredPermissionsFor(route: Pick<RouteLocationNormalizedLoaded, 'matched'>): string[] {
  return collectRequiredPermissions(route.matched.map((record) => record.meta.permissions))
}

/** Registers the global auth / permission navigation guard. */
export function setupAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    // Avoid loops: login is always public; signed-in users leave login.
    if (to.name === 'login') {
      if (!authStore.isAuthenticated) {
        return true
      }

      return resolveSafeInternalPath(to.query.redirect, '/')
    }

    // Access-denied is reachable without further permission checks (prevents loops).
    if (to.name === 'access-denied') {
      return true
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true)
    const requiredPermissions = requiredPermissionsFor(to)
    const needsAuthentication = requiresAuth || requiredPermissions.length > 0

    if (!needsAuthentication) {
      return true
    }

    if (!authStore.isAuthenticated) {
      return {
        name: 'login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    if (requiredPermissions.length === 0) {
      // Pages such as the dashboard show permission-based content but do not need a right to open.
      // Refresh in the background; the page updates when the answer arrives.
      void authStore.ensureFreshAccess()
      return true
    }

    // Ask the backend before deciding, so a revoked right blocks the route immediately.
    await authStore.ensureFreshAccess()

    if (!authStore.isAuthenticated) {
      return {
        name: 'login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    const missingPermission = requiredPermissions.some(
      (permission) => !authStore.hasPermission(permission),
    )
    if (missingPermission) {
      return { name: 'access-denied' }
    }

    return true
  })
}

/**
 * Leaves the current page when a rights refresh removes a permission it needs,
 * for example when an administrator revokes `User_Edit` while the edit form is open.
 */
export function setupAccessWatcher(router: Router): () => void {
  const authStore = useAuthStore()

  return watch(
    () => authStore.permissions,
    () => {
      if (!authStore.isAuthenticated) {
        return
      }

      const current = router.currentRoute.value
      const missing = requiredPermissionsFor(current).some(
        (permission) => !authStore.hasPermission(permission),
      )
      if (missing) {
        void router.replace({ name: 'access-denied' })
      }
    },
  )
}
