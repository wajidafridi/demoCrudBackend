import { describe, expect, it } from 'vitest'

import { resolveSafeInternalPath } from '@/utils/safeRedirect'

describe('resolveSafeInternalPath', () => {
  it('returns a safe internal path', () => {
    expect(resolveSafeInternalPath('/users')).toBe('/users')
    expect(resolveSafeInternalPath('/users/create?x=1')).toBe('/users/create?x=1')
  })

  it('falls back for missing or unsafe redirects', () => {
    expect(resolveSafeInternalPath(undefined, '/')).toBe('/')
    expect(resolveSafeInternalPath(null, '/home')).toBe('/home')
    expect(resolveSafeInternalPath('https://evil.example', '/')).toBe('/')
    expect(resolveSafeInternalPath('//evil.example', '/')).toBe('/')
    expect(resolveSafeInternalPath('users', '/')).toBe('/')
  })
})
