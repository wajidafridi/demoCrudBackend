const ACCESS_TOKEN_KEY = 'demoCrud.accessToken'

/** Centralized access-token persistence (sessionStorage). Used by the auth store only. */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
