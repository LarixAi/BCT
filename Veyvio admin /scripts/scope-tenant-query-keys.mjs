#!/usr/bin/env node
/**
 * Prefix React Query keys with tenant scope: ['company', companyId, ...originalKey]
 * Skips keys already scoped. Adds useActiveCompanyId import + hook where needed.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SRC = join(ROOT, 'src')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'api' && dir.endsWith('/lib')) continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

function transform(content, filePath) {
  if (!content.includes('queryKey:')) return content
  if (content.includes("queryKey: tenantKeys.") || content.includes('queryKey: tKey(')) return content
  if (content.includes("['company',") && content.includes('useActiveCompanyId')) return content

  let next = content

  if (!next.includes('useActiveCompanyId')) {
    if (next.includes("from '@/lib/auth-context'")) {
      next = next.replace(
        /import\s*\{([^}]+)\}\s*from\s*'@\/lib\/auth-context'/,
        (m, imports) => {
          const parts = imports.split(',').map((s) => s.trim()).filter(Boolean)
          if (!parts.includes('useActiveCompanyId')) parts.push('useActiveCompanyId')
          return `import { ${parts.join(', ')} } from '@/lib/auth-context'`
        },
      )
    } else if (next.includes('useQuery') || next.includes('useMutation') || next.includes('useInfiniteQuery')) {
      const authImport = "import { useActiveCompanyId } from '@/lib/auth-context'\n"
      const lastImport = [...next.matchAll(/^import .+$/gm)].pop()
      if (lastImport) {
        const idx = lastImport.index + lastImport[0].length
        next = next.slice(0, idx) + '\n' + authImport + next.slice(idx)
      }
    }
  }

  if (!next.includes('useTenantQueryKey')) {
    if (!next.includes("from '@/lib/tenant/use-tenant-query-key'")) {
      const hookImport = "import { useTenantQueryKey } from '@/lib/tenant/use-tenant-query-key'\n"
      const lastImport = [...next.matchAll(/^import .+$/gm)].pop()
      if (lastImport) {
        const idx = lastImport.index + lastImport[0].length
        next = next.slice(0, idx) + '\n' + hookImport + next.slice(idx)
      }
    }
  }

  // Add tKey hook in each function component that uses queryKey
  const fnPattern = /export function (\w+)[^{]*\{/
  if (next.includes('queryKey:') && !next.includes('const tKey = useTenantQueryKey()')) {
    next = next.replace(
      /(export function \w+[^{]*\{)\n(\s*)(const |let |var |\/\/|if |return |\w)/,
      (m, open, indent, after) => {
        if (m.includes('const tKey = useTenantQueryKey()')) return m
        return `${open}\n${indent}const tKey = useTenantQueryKey()\n${indent}${after}`
      },
    )
  }

  next = next.replace(/queryKey:\s*\[([^\]]+)\]/g, (match, inner) => {
    if (inner.includes('company') && inner.includes('companyId')) return match
    return `queryKey: tKey([${inner}])`
  })

  next = next.replace(
    /invalidateQueries\(\{\s*queryKey:\s*\[([^\]]+)\]/g,
    (match, inner) => {
      if (inner.includes('tKey')) return match
      return `invalidateQueries({ queryKey: tKey([${inner}])`
    },
  )

  if (next !== content) {
    console.log('scoped', relative(ROOT, filePath))
  }
  return next
}

let changed = 0
for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8')
  const after = transform(before, file)
  if (after !== before) {
    writeFileSync(file, after)
    changed++
  }
}
console.log(`Done. Updated ${changed} files.`)
