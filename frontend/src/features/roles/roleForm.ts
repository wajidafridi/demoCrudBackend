import type { RoleRequest } from '@/types/role'

const MAX_NAME_LENGTH = 100

export function validateRoleName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return 'Role name is required.'
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Role name must be at most ${MAX_NAME_LENGTH} characters.`
  }

  return null
}

export function toRoleRequest(name: string): RoleRequest {
  return { name: name.trim() }
}

function normalizeFieldKey(key: string): string {
  const segment = key.split('.').pop() ?? key
  const withoutDollar = segment.startsWith('$') ? segment.slice(1) : segment
  return withoutDollar.toLowerCase()
}

export function roleNameError(errors: Record<string, string[]> | null): string | null {
  if (errors == null) {
    return null
  }

  const messages: string[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (normalizeFieldKey(key) === 'name') {
      messages.push(...value)
    }
  }

  return messages.length > 0 ? messages.join(' ') : null
}

export function describeRoleError(
  message: string,
  errors: Record<string, string[]> | null,
): string {
  if (errors == null) {
    return message
  }

  const extra: string[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (normalizeFieldKey(key) !== 'name') {
      extra.push(...value)
    }
  }

  return extra.length > 0 ? `${message} ${extra.join(' ')}` : message
}

export function parseRoleId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null
  }

  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    return null
  }

  return id
}
