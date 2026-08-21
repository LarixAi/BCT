#!/usr/bin/env node
/**
 * Bump Veyvio Driver Android + iOS version fields.
 *
 * Usage:
 *   node scripts/bump-driver-version.mjs patch
 *   node scripts/bump-driver-version.mjs minor
 *   node scripts/bump-driver-version.mjs major
 *   node scripts/bump-driver-version.mjs --set 1.2.0 --code 12
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const gradlePath = path.join(root, 'android/app/build.gradle')
const pbxPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.writeFileSync(file, content)
}

function parseVersion(name) {
  const parts = String(name).split('.').map((n) => Number(n) || 0)
  return { major: parts[0] ?? 0, minor: parts[1] ?? 0, patch: parts[2] ?? 0 }
}

function formatVersion({ major, minor, patch }) {
  return patch > 0 || String(minor).includes('.')
    ? `${major}.${minor}.${patch}`
    : `${major}.${minor}`
}

function bump(name, kind) {
  const v = parseVersion(name)
  if (kind === 'major') return formatVersion({ major: v.major + 1, minor: 0, patch: 0 })
  if (kind === 'minor') return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0 })
  return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1 })
}

const args = process.argv.slice(2)
const setIdx = args.indexOf('--set')
const codeIdx = args.indexOf('--code')
const explicitVersion = setIdx >= 0 ? args[setIdx + 1] : null
const explicitCode = codeIdx >= 0 ? Number(args[codeIdx + 1]) : null
const kind = explicitVersion ? null : (args[0] ?? 'patch')

if (!['patch', 'minor', 'major'].includes(kind) && !explicitVersion) {
  console.error('Usage: bump-driver-version.mjs [patch|minor|major] or --set X.Y.Z --code N')
  process.exit(1)
}

const gradle = read(gradlePath)
const versionNameMatch = gradle.match(/versionName\s+"([^"]+)"/)
const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/)
if (!versionNameMatch || !versionCodeMatch) {
  console.error('Could not parse android/app/build.gradle versions')
  process.exit(1)
}

const currentName = versionNameMatch[1]
const currentCode = Number(versionCodeMatch[1])
const nextName = explicitVersion ?? bump(currentName, kind)
const nextCode = explicitCode ?? currentCode + 1

let nextGradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${nextName}"`)
write(gradlePath, nextGradle)

let pbx = read(pbxPath)
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nextName};`)
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextCode};`)
write(pbxPath, pbx)

console.log(`Driver version: ${currentName} (${currentCode}) → ${nextName} (${nextCode})`)
console.log('Updated:', path.relative(root, gradlePath), path.relative(root, pbxPath))
