import { http } from '@/services/http'
import type { ApiResponse } from '@/types/api'
import type { LoginRequest, LoginResponse } from '@/types/auth'

/** POST /api/auth/login — returns the envelope `data` payload on success. */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data: envelope } = await http.post<ApiResponse<LoginResponse>>('/auth/login', request)

  if (!envelope.success || envelope.data == null) {
    throw new Error(envelope.message || 'Login failed.')
  }

  return envelope.data
}
