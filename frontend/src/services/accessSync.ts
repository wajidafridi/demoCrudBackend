/**
 * Bridge between the Axios client and the auth store (same pattern as `unauthorizedHandler`).
 *
 * The backend reloads the caller's role and rights from the database on every request and
 * returns a fingerprint of them in the `X-Access-Version` header. When that value differs from
 * the one the store holds, the store re-fetches `GET /api/auth/me` so menus, buttons and route
 * checks match what the backend will enforce.
 */
export const ACCESS_VERSION_HEADER = 'x-access-version'

export interface AccessSyncHandler {
  /** A response carried this access version. */
  onVersion: (version: string) => void
  /** The API answered 403, so displayed permissions may be stale. */
  onForbidden: () => void
}

let handler: AccessSyncHandler | null = null

export function registerAccessSyncHandler(next: AccessSyncHandler): void {
  handler = next
}

export function clearAccessSyncHandler(): void {
  handler = null
}

export function reportAccessVersion(version: string): void {
  handler?.onVersion(version)
}

export function reportForbidden(): void {
  handler?.onForbidden()
}
