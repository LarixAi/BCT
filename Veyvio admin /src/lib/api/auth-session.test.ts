import { describe, expect, it } from 'vitest'
import { isAccessTokenExpired } from '@/lib/api/auth-session'

function jwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
  return `${header}.${payload}.sig`
}

describe('isAccessTokenExpired', () => {
  it('returns false for a token that expires in the future', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(isAccessTokenExpired(jwtWithExp(exp))).toBe(false)
  })

  it('returns true for a token that already expired', () => {
    const exp = Math.floor(Date.now() / 1000) - 3600
    expect(isAccessTokenExpired(jwtWithExp(exp))).toBe(true)
  })
})
