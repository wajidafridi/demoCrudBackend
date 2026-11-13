/**
 * CamelCase JSON for `Dtos.UserResponseDto`.
 * `fullName` and `age` are computed on the server and included in the payload.
 * Dates arrive as ISO-8601 strings.
 */
export interface UserResponse {
  id: number
  /** Copied from `User.IsSystem`. True for the seeded system account. */
  isSystem: boolean
  firstName: string
  lastName: string
  fullName: string
  email: string
  userName: string
  roleId: number
  roleName: string | null
  address: string | null
  phoneNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string | null
  age: number | null
}

/** CamelCase JSON for `Dtos.CreateUserRequestDto`. */
export interface CreateUserRequest {
  firstName: string
  lastName: string
  email: string
  userName: string
  password: string
  roleId: number
  address: string | null
  phoneNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  imageUrl: string | null
}

/** CamelCase JSON for `Dtos.UpdateUserRequestDto` (no password). */
export interface UpdateUserRequest {
  firstName: string
  lastName: string
  email: string
  userName: string
  roleId: number
  address: string | null
  phoneNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  imageUrl: string | null
}
