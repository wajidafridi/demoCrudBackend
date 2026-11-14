/** Matches backend `Dtos.LoginRequestDto`. */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * Matches backend `Dtos.LoginResponseDto` (envelope data payload).
 * `permissions` are the role's rights at login time; later changes come from `GET /api/auth/me`.
 * `expiresAtUtc` is an ISO-8601 string over the wire (`DateTime` in C#).
 */
export interface LoginResponse {
  id: number
  userName: string
  email: string
  roleId: number
  roleName: string | null
  accessToken: string
  expiresAtUtc: string
  permissions?: string[]
  accessVersion?: string
}

/**
 * Matches backend `Dtos.CurrentAccessDto` from `GET /api/auth/me`.
 * Read from the database on that request, so it reflects rights changed after login.
 */
export interface CurrentAccess {
  id: number
  userName: string
  roleId: number
  roleName: string
  permissions: string[]
  /** Same value as the `X-Access-Version` response header. */
  accessVersion: string
}

/**
 * Client session identity. After a page refresh, only fields present on the JWT
 * are restored (`id`, `userName`, `roleName`) until `GET /api/auth/me` answers.
 * `email` stays null until the next login.
 */
export interface AuthUser {
  id: number
  userName: string
  email: string | null
  roleId: number | null
  roleName: string | null
}
