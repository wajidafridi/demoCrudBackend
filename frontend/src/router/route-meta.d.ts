import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title shown in the application header. */
    title?: string
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
