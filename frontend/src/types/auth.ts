/** Matches backend `Dtos.LoginRequestDto`. */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * Matches backend `Dtos.LoginResponseDto` (envelope data payload).
 * Permissions live in the JWT claims, not on this DTO.
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
}

/**
 * Client session identity. After a page refresh, only fields present on the JWT
 * are restored (`id`, `userName`, `roleName`). `email` / `roleId` stay null until the next login.
 */
export interface AuthUser {
  id: number
  userName: string
  email: string | null
  roleId: number | null
  roleName: string | null
}
