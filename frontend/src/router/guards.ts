import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

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

/** Registers the global auth / permission navigation guard. */
export function setupAuthGuard(router: Router): void {
  router.beforeEach((to) => {
    const authStore = useAuthStore()

    // Avoid loops: login is always public; signed-in users leave login.
    if (to.name === 'login') {
      if (!authStore.isAuthenticated) {
        return true
      }

      const redirect = to.query.redirect
      if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
        return redirect
      }

      return { name: 'home' }
    }

    // Access-denied is reachable without further permission checks (prevents loops).
    if (to.name === 'access-denied') {
      return true
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true)
    const requiredPermissions = collectRequiredPermissions(
      to.matched.map((record) => record.meta.permissions),
    )
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

    if (requiredPermissions.length > 0) {
      const missingPermission = requiredPermissions.some(
        (permission) => !authStore.hasPermission(permission),
      )
      if (missingPermission) {
        return { name: 'access-denied' }
      }
    }

    return true
  })
}
