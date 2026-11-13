import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { consumeExplicitLogout, useAuthStore } from '@/stores/authStore'
import { getAccessToken } from '@/services/tokenStorage'
import { JwtClaimNames } from '@/utils/jwt'

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    [JwtClaimNames.nameIdentifier]: '1',
    [JwtClaimNames.name]: 'superadmin',
    [JwtClaimNames.role]: 'SuperAdmin',
    [JwtClaimNames.permission]: ['User_View'],
    [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 60,
    ...overrides,
  }
}

describe('useAuthStore session expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    consumeExplicitLogout()
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('clears Pinia state and sessionStorage when the token expires', () => {
    const store = useAuthStore()
    const token = makeToken(
      validPayload({ [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 5 }),
    )

    sessionStorage.setItem('demoCrud.accessToken', token)
    store.restoreSession()

    expect(store.isAuthenticated).toBe(true)
    expect(getAccessToken()).toBe(token)

    vi.advanceTimersByTime(5_000)

    expect(store.isAuthenticated).toBe(false)
    expect(store.accessToken).toBeNull()
    expect(store.user).toBeNull()
    expect(store.permissions).toEqual([])
    expect(getAccessToken()).toBeNull()
  })

  it('cancels the previous expiry timer when a newer token is applied', () => {
    const store = useAuthStore()
    const firstToken = makeToken(
      validPayload({ [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 5 }),
    )
    const secondToken = makeToken(
      validPayload({
        [JwtClaimNames.nameIdentifier]: '2',
        [JwtClaimNames.name]: 'admin',
        [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 30,
      }),
    )

    sessionStorage.setItem('demoCrud.accessToken', firstToken)
    store.restoreSession()
    expect(store.user?.userName).toBe('superadmin')

    sessionStorage.setItem('demoCrud.accessToken', secondToken)
    store.restoreSession()
    expect(store.user?.userName).toBe('admin')

    vi.advanceTimersByTime(5_000)

    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.userName).toBe('admin')
    expect(getAccessToken()).toBe(secondToken)

    vi.advanceTimersByTime(25_000)

    expect(store.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('logout clears auth state immediately and prevents a later timer clear race', () => {
    const store = useAuthStore()
    const token = makeToken(
      validPayload({ [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 10 }),
    )

    sessionStorage.setItem('demoCrud.accessToken', token)
    store.restoreSession()
    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()

    vi.advanceTimersByTime(10_000)

    expect(store.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(consumeExplicitLogout()).toBe(true)
  })

  it('does not treat token expiry as an explicit logout', () => {
    const store = useAuthStore()
    const token = makeToken(
      validPayload({ [JwtClaimNames.exp]: Math.floor(Date.now() / 1000) + 5 }),
    )

    sessionStorage.setItem('demoCrud.accessToken', token)
    store.restoreSession()

    vi.advanceTimersByTime(5_000)

    expect(store.isAuthenticated).toBe(false)
    expect(consumeExplicitLogout()).toBe(false)
  })
})
