import { http } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type { CurrentAccess, LoginRequest, LoginResponse } from '@/types/auth'

/** POST /api/auth/login — returns the envelope `data` payload on success. */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data: envelope } = await http.post<ApiResponse<LoginResponse>>('/auth/login', request)

  if (!envelope.success || envelope.data == null) {
    throw new Error(envelope.message || 'Login failed.')
  }

  return envelope.data
}

/** GET /api/auth/me — the caller's current role and rights, read from the database. */
export async function fetchCurrentAccess(): Promise<CurrentAccess> {
  const { data: envelope } = await http.get<ApiResponse<CurrentAccess>>('/auth/me')

  if (!envelope.success || envelope.data == null) {
    throw new Error(envelope.message || 'Could not load your current access.')
  }

  return envelope.data
}
