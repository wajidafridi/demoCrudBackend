import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchCurrentAccess, login as loginRequest } from '@/services/authService'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/tokenStorage'
import type { AuthUser, CurrentAccess, LoginRequest, LoginResponse } from '@/types/auth'
import { decodeAccessToken } from '@/utils/jwt'

/** setTimeout delay cap (~24.8 days). */
const MAX_TIMEOUT_MS = 2_147_483_647

/** Background re-check of rights while the tab is visible. */
export const ACCESS_POLL_INTERVAL_MS = 60_000

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

type AccessUpdate = Pick<CurrentAccess, 'permissions' | 'accessVersion'> &
  Partial<Pick<CurrentAccess, 'userName' | 'roleId' | 'roleName'>>

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const permissions = ref<string[]>([])
  const expiresAtUtc = ref<Date | null>(null)
  /**
   * Fingerprint of role + rights from the backend (`X-Access-Version`).
   * Null until the login response or the first `GET /api/auth/me` after a page reload.
   */
  const accessVersion = ref<string | null>(null)

  let expiryTimerId: ReturnType<typeof setTimeout> | null = null
  /** Bumped whenever a timer is cancelled or replaced so stale callbacks cannot clear a newer session. */
  let expiryGeneration = 0
  /** Bumped on every new or cleared session so a late `/auth/me` answer cannot apply to another session. */
  let sessionGeneration = 0
  /** When the backend last confirmed the displayed rights (ms since epoch). 0 = never. */
  let accessConfirmedAt = 0
  let refreshInFlight: Promise<void> | null = null

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
    sessionGeneration += 1
    accessToken.value = null
    user.value = null
    permissions.value = []
    expiresAtUtc.value = null
    accessVersion.value = null
    accessConfirmedAt = 0
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
    sessionGeneration += 1
    accessToken.value = token
    expiresAtUtc.value = decoded.expiresAtUtc
    // Token claims are only a starting point. The backend re-checks rights on every request,
    // and `refreshAccess` replaces these with the current values.
    permissions.value = [...decoded.permissions]
    accessVersion.value = null
    accessConfirmedAt = 0
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

  function applyAccess(access: AccessUpdate): void {
    permissions.value = [...access.permissions]
    accessVersion.value = access.accessVersion
    accessConfirmedAt = Date.now()

    if (user.value != null) {
      user.value = {
        ...user.value,
        userName: access.userName ?? user.value.userName,
        roleId: access.roleId ?? user.value.roleId,
        roleName: access.roleName ?? user.value.roleName,
      }
    }
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

    if (Array.isArray(response.permissions) && typeof response.accessVersion === 'string') {
      applyAccess({ permissions: response.permissions, accessVersion: response.accessVersion })
    }

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

  /**
   * Re-reads role and rights from `GET /api/auth/me`. Concurrent calls share one request.
   * A 401 ends the session through the Axios interceptor. Any other failure keeps the last
   * known rights: the backend still enforces the real ones, so a stale UI cannot grant access.
   */
  function refreshAccess(): Promise<void> {
    if (!isAuthenticated.value) {
      return Promise.resolve()
    }

    if (refreshInFlight != null) {
      return refreshInFlight
    }

    const generation = sessionGeneration
    const userId = user.value?.id
    refreshInFlight = (async () => {
      try {
        const access = await fetchCurrentAccess()
        if (generation !== sessionGeneration || !isAuthenticated.value || access.id !== userId) {
          return
        }

        applyAccess(access)
      } catch {
        // Keep the last known rights. See the comment above.
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  }

  /** Refreshes unless the backend confirmed the current rights within `maxAgeMs`. */
  async function ensureFreshAccess(maxAgeMs = 0): Promise<void> {
    if (!isAuthenticated.value) {
      return
    }

    // Strict comparison: maxAgeMs = 0 always asks the backend.
    if (accessConfirmedAt > 0 && Date.now() - accessConfirmedAt < maxAgeMs) {
      return
    }

    await refreshAccess()
  }

  /** Called for every API response that carries `X-Access-Version`. */
  function handleAccessVersion(version: string): void {
    if (!isAuthenticated.value) {
      return
    }

    if (version === accessVersion.value) {
      accessConfirmedAt = Date.now()
      return
    }

    void refreshAccess()
  }

  /**
   * Re-checks rights when the tab regains focus and every `ACCESS_POLL_INTERVAL_MS` while visible,
   * so an idle page also picks up changes. Returns a function that stops monitoring.
   */
  function startAccessMonitor(): () => void {
    const refreshIfVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void refreshAccess()
      }
    }

    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    const intervalId = setInterval(refreshIfVisible, ACCESS_POLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      clearInterval(intervalId)
    }
  }

  restoreSession()

  return {
    accessToken,
    user,
    permissions,
    expiresAtUtc,
    accessVersion,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    restoreSession,
    clearSession,
    refreshAccess,
    ensureFreshAccess,
    handleAccessVersion,
    startAccessMonitor,
  }
})
