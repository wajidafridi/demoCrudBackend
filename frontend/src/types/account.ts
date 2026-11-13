/**
 * Matches backend `Dtos.AccountProfileDto`.
 * `GET /api/account` is available to the signed-in user and includes `roleId`.
 */
export interface AccountProfile {
  id: number
  userName: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  imageUrl: string | null
  roleId: number
  roleName: string | null
  isSystem: boolean
  createdAt: string
}

/** CamelCase JSON for `Dtos.UpdateAccountRequestDto`. Identity stays on the token. */
export interface UpdateAccountRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  imageUrl: string | null
}

/** CamelCase JSON for `Dtos.ChangePasswordRequestDto`. */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
