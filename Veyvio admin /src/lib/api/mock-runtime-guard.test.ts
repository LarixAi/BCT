import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('production api bundle must not import hybrid mock layer', () => {
  it('index does not wire hybrid-api', () => {
    const index = readFileSync(resolve('src/lib/api/index.ts'), 'utf8')
    expect(index).not.toContain('hybrid-api')
    expect(index).not.toContain('withOperationsMock')
  })

  it('real-client does not fall back to attendance or body-condition mocks', () => {
    const realClient = readFileSync(resolve('src/lib/api/real-client.ts'), 'utf8')
    expect(realClient).not.toContain('mock-hub')
    expect(realClient).not.toContain('mock-body-condition')
    expect(realClient).toContain('empty-hub')
  })
})
