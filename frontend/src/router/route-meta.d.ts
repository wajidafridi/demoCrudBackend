import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
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
