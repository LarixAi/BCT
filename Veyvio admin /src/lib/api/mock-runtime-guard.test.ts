import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('production api bundle must not import hybrid mock layer', () => {
  it('index does not wire hybrid-api', () => {
    const index = readFileSync(resolve('src/lib/api/index.ts'), 'utf8')
    expect(index).not.toContain('hybrid-api')
    expect(index).not.toContain('withOperationsMock')
  })

  it('config defaults mock to opt-in only', () => {
    const config = readFileSync(resolve('src/lib/api/config.ts'), 'utf8')
    expect(config).toContain("import.meta.env.VITE_MOCK_API === 'true'")
    expect(config).not.toContain("!== 'false'")
  })
})
