import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { login as loginRequest } from '@/services/authService'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/tokenStorage'
import type { AuthUser, LoginRequest, LoginResponse } from '@/types/auth'
import { decodeAccessToken } from '@/utils/jwt'

/** setTimeout delay cap (~24.8 days). */
const MAX_TIMEOUT_MS = 2_147_483_647

/**
 * Set only by an explicit logout. Session expiry and HTTP 401 call `clearSession`
 * directly, so the app can tell a user logout from a session that ended underneath them.
 */
let explicitLogout = false

/** Returns true once after `logout()`, then resets. */
export function consumeExplicitLogout(): boolean {
  const value = explicitLogout
  explicitLogout = false
  return value
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const permissions = ref<string[]>([])
  const expiresAtUtc = ref<Date | null>(null)

  let expiryTimerId: ReturnType<typeof setTimeout> | null = null
  /** Bumped whenever a timer is cancelled or replaced so stale callbacks cannot clear a newer session. */
  let expiryGeneration = 0

  const isAuthenticated = computed(() => {
    if (accessToken.value == null || expiresAtUtc.value == null) {
      return false
    }

    return expiresAtUtc.value.getTime() > Date.now()
  })

  function cancelExpiryTimer(): void {
    if (expiryTimerId != null) {
      clearTimeout(expiryTimerId)
      expiryTimerId = null
    }
  }

  function clearSession(): void {
    cancelExpiryTimer()
    expiryGeneration += 1
    accessToken.value = null
    user.value = null
    permissions.value = []
    expiresAtUtc.value = null
    clearAccessToken()
  }

  function scheduleSessionExpiry(expiresAt: Date): void {
    cancelExpiryTimer()
    const generation = (expiryGeneration += 1)
    const delayMs = expiresAt.getTime() - Date.now()

    if (delayMs <= 0) {
      clearSession()
      return
    }

    expiryTimerId = setTimeout(
      () => {
        if (generation !== expiryGeneration) {
          return
        }

        clearSession()
      },
      Math.min(delayMs, MAX_TIMEOUT_MS),
    )
  }

  function applyDecodedToken(
    token: string,
    decoded: NonNullable<ReturnType<typeof decodeAccessToken>>,
    profile?: Pick<AuthUser, 'email' | 'roleId'>,
  ): void {
    accessToken.value = token
    expiresAtUtc.value = decoded.expiresAtUtc
    permissions.value = [...decoded.permissions]
    user.value = {
      id: decoded.userId,
      userName: decoded.userName,
      roleName: decoded.roleName,
      email: profile?.email ?? null,
      roleId: profile?.roleId ?? null,
    }
    setAccessToken(token)
    scheduleSessionExpiry(decoded.expiresAtUtc)
  }

  function restoreSession(): void {
    const storedToken = getAccessToken()
    if (storedToken == null || storedToken.length === 0) {
      clearSession()
      return
    }

    const decoded = decodeAccessToken(storedToken)
    if (decoded == null) {
      clearSession()
      return
    }

    applyDecodedToken(storedToken, decoded)
  }

  async function login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await loginRequest(credentials)
    const decoded = decodeAccessToken(response.accessToken)

    if (decoded == null) {
      clearSession()
      throw new Error('Login succeeded but the access token is invalid or expired.')
    }

    applyDecodedToken(response.accessToken, decoded, {
      email: response.email,
      roleId: response.roleId,
    })

    return response
  }

  function logout(): void {
    if (isAuthenticated.value) {
      explicitLogout = true
    }

    clearSession()
  }

  function hasPermission(permission: string): boolean {
    if (!isAuthenticated.value) {
      return false
    }

    return permissions.value.includes(permission)
  }

  restoreSession()

  return {
    accessToken,
    user,
    permissions,
    expiresAtUtc,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    restoreSession,
    clearSession,
  }
})
