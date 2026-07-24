#!/usr/bin/env node
/** Normalize tenant query imports: use global tKey from tenant-query-scope. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SRC = join(ROOT, 'src')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

const SCOPE_IMPORT = "import { tKey } from '@/lib/tenant/tenant-query-scope'"

for (const file of walk(SRC)) {
  let content = readFileSync(file, 'utf8')
  if (!content.includes('tKey([') && !content.includes('useTenantQueryKey')) continue

  let next = content
  next = next.replace(/\nimport \{ useTenantQueryKey \} from '@\/lib\/tenant\/use-tenant-query-key'\n/g, '\n')
  next = next.replace(/\nimport \{ useActiveCompanyId \} from '@\/lib\/auth-context'\n/g, (m) => {
    if (next.includes('useActiveCompanyId(')) return m
    return ''
  })
  next = next.replace(/\n\s*const tKey = useTenantQueryKey\(\)\n/g, '\n')

  if (next.includes('tKey([') && !next.includes("from '@/lib/tenant/tenant-query-scope'")) {
    const lastImport = [...next.matchAll(/^import .+$/gm)].pop()
    if (lastImport) {
      const idx = lastImport.index + lastImport[0].length
      next = next.slice(0, idx) + '\n' + SCOPE_IMPORT + next.slice(idx)
    }
  }

  if (next !== content) writeFileSync(file, next)
}
console.log('Normalized tenant query scope imports.')
