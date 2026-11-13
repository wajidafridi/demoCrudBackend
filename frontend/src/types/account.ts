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
