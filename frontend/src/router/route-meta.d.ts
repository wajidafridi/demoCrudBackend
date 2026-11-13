import type { AppNavKey } from '@/navigation/appNav'

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title shown in the application header. */
    title?: string
    /** Sidebar item that should appear active for this route. */
    nav?: AppNavKey
    /** When true, the user must be authenticated. */
    requiresAuth?: boolean
    /**
     * Permission names the user must have (all of them).
     * Uses backend right names such as `User_View`.
     * Listing permissions also implies authentication.
     */
    permissions?: string[]
  }
}

export {}
