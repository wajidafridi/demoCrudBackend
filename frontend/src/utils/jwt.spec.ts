import { describe, expect, it } from 'vitest'

import { JwtClaimNames, decodeAccessToken } from '@/utils/jwt'

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

describe('decodeAccessToken', () => {
  const futureExp = () => Math.floor(Date.now() / 1000) + 60 * 30
  const pastExp = () => Math.floor(Date.now() / 1000) - 60

  it('decodes ASCII payloads and repeated permission claims', () => {
    const decoded = decodeAccessToken(
      makeToken({
        [JwtClaimNames.nameIdentifier]: '1',
        [JwtClaimNames.name]: 'superadmin',
        [JwtClaimNames.role]: 'SuperAdmin',
        [JwtClaimNames.permission]: ['User_View', 'Role_Edit'],
        [JwtClaimNames.exp]: futureExp(),
      }),
    )

    expect(decoded).not.toBeNull()
    expect(decoded?.userId).toBe(1)
    expect(decoded?.userName).toBe('superadmin')
    expect(decoded?.roleName).toBe('SuperAdmin')
    expect(decoded?.permissions).toEqual(['User_View', 'Role_Edit'])
  })

  it('decodes a Unicode username', () => {
    const decoded = decodeAccessToken(
      makeToken({
        [JwtClaimNames.nameIdentifier]: '3',
        [JwtClaimNames.name]: '用户名αβ',
        [JwtClaimNames.role]: 'User',
        [JwtClaimNames.permission]: 'User_View',
        [JwtClaimNames.exp]: futureExp(),
      }),
    )

    expect(decoded).not.toBeNull()
    expect(decoded?.userName).toBe('用户名αβ')
  })

  it('rejects malformed tokens and invalid JSON payloads', () => {
    expect(decodeAccessToken('')).toBeNull()
    expect(decodeAccessToken('not-a-jwt')).toBeNull()
    expect(decodeAccessToken('a.b')).toBeNull()
    expect(decodeAccessToken('aaa.!!!not-base64!!!.ccc')).toBeNull()

    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
    const badJson = Buffer.from('{not-json', 'utf8').toString('base64url')
    expect(decodeAccessToken(`${header}.${badJson}.sig`)).toBeNull()
  })

  it('rejects expired tokens', () => {
    expect(
      decodeAccessToken(
        makeToken({
          [JwtClaimNames.nameIdentifier]: '1',
          [JwtClaimNames.name]: 'superadmin',
          [JwtClaimNames.role]: 'SuperAdmin',
          [JwtClaimNames.permission]: ['User_View'],
          [JwtClaimNames.exp]: pastExp(),
        }),
      ),
    ).toBeNull()
  })
})
