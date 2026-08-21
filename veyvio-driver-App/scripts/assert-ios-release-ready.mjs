#!/usr/bin/env node
/**
 * PROD-6 — iOS release scaffolding assert (no Apple secrets required).
 *   node scripts/assert-ios-release-ready.mjs           # allow ExportOptions placeholders
 *   node scripts/assert-ios-release-ready.mjs --strict  # reject REPLACE_WITH_* (post keychain rewrite)
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const strict = process.argv.includes('--strict')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iosApp = join(root, 'ios/App/App')
const errors = []

function mustExist(rel) {
  const p = join(root, rel)
  if (!existsSync(p)) errors.push(`missing ${rel}`)
  return p
}

mustExist('ios/ExportOptions.plist')
mustExist('ios/App/App/PrivacyInfo.xcprivacy')
mustExist('ios/App/App/Info.plist')
mustExist('scripts/assert-release-config.mjs')
mustExist('scripts/ios-keychain-import.sh')

const pbx = join(root, 'ios/App/App.xcodeproj/project.pbxproj')
if (existsSync(pbx)) {
  const src = readFileSync(pbx, 'utf8')
  if (!src.includes('uk.veyvio.driver')) {
    errors.push('ios project.pbxproj must contain PRODUCT_BUNDLE_IDENTIFIER uk.veyvio.driver')
  }
} else {
  errors.push('missing ios/App/App.xcodeproj/project.pbxproj')
}

const exportOpts = readFileSync(join(root, 'ios/ExportOptions.plist'), 'utf8')
if (!/app-store|app-store-connect/i.test(exportOpts)) {
  errors.push('ExportOptions.plist must target app-store / TestFlight method')
}
if (strict && /REPLACE_WITH_/.test(exportOpts)) {
  errors.push('ExportOptions.plist still has REPLACE_WITH_* placeholders (run ios-keychain-import.sh first)')
}

if (errors.length) {
  console.error('assert-ios-release-ready: FAIL')
  for (const e of errors) console.error(`- ${e}`)
  process.exit(1)
}
console.log(
  strict
    ? 'assert-ios-release-ready: ok (strict — export options rewritten)'
    : 'assert-ios-release-ready: ok (scaffolding present; Apple signing still operator-owned)',
)
