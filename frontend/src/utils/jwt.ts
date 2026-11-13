/**
 * Claim names written by backend `TokenService` / `Permissions.ClaimType`.
 * TokenService passes .NET `ClaimTypes.*` into `JwtSecurityToken` directly, so the
 * long URIs appear in the payload (not the short inbound-mapped names).
 */
export const JwtClaimNames = {
  nameIdentifier: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  permission: 'permission',
  exp: 'exp',
} as const

export interface DecodedAccessToken {
  userId: number
  userName: string
  roleName: string
  permissions: string[]
  /** UTC expiry from the standard JWT `exp` claim (seconds → Date). */
  expiresAtUtc: Date
}

const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

/** Browser-compatible base64url → UTF-8 string (throws on bad base64 / invalid UTF-8). */
function decodeBase64UrlToUtf8(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return utf8Decoder.decode(bytes)
}

function readStringClaim(payload: Record<string, unknown>, claim: string): string | null {
  const value = payload[claim]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Supports a single string or a JSON array when the claim is repeated. */
export function readStringClaims(payload: Record<string, unknown>, claim: string): string[] {
  const value = payload[claim]
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  return []
}

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null for missing, malformed, or expired tokens.
 */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null
  }

  try {
    const json = decodeBase64UrlToUtf8(parts[1])
    const payload = JSON.parse(json) as Record<string, unknown>

    const userIdText = readStringClaim(payload, JwtClaimNames.nameIdentifier)
    const userName = readStringClaim(payload, JwtClaimNames.name)
    const roleName = readStringClaim(payload, JwtClaimNames.role)
    const exp = payload[JwtClaimNames.exp]

    if (userIdText == null || userName == null || roleName == null || typeof exp !== 'number') {
      return null
    }

    const userId = Number(userIdText)
    if (!Number.isInteger(userId) || userId <= 0) {
      return null
    }

    const expiresAtUtc = new Date(exp * 1000)
    if (Number.isNaN(expiresAtUtc.getTime()) || expiresAtUtc.getTime() <= Date.now()) {
      return null
    }

    return {
      userId,
      userName,
      roleName,
      permissions: readStringClaims(payload, JwtClaimNames.permission),
      expiresAtUtc,
    }
  } catch {
    return null
  }
}
