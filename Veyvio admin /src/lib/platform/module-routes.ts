import { canUse } from '@veyvio/entitlements'
import type { PlatformModule } from '@/lib/platform/modules'

/** Map Command UI path prefixes → PLATFORM_MODULES entitlement keys. */
const ROUTE_MODULE_RULES: Array<{ prefix: string; module: PlatformModule }> = [
  { prefix: '/maintenance', module: 'maintenance' },
  { prefix: '/fleet-resources', module: 'maintenance' },
  { prefix: '/yard', module: 'yard' },
  { prefix: '/defects', module: 'safety' },
  { prefix: '/incidents', module: 'safety' },
  { prefix: '/inspections', module: 'safety' },
  { prefix: '/vehicle-checks', module: 'safety' },
  { prefix: '/vehicle-reports', module: 'safety' },
  { prefix: '/safeguarding', module: 'safety' },
  { prefix: '/risk-assessments', module: 'safety' },
  { prefix: '/corrective-actions', module: 'safety' },
  { prefix: '/compliance', module: 'compliance' },
  { prefix: '/drivers', module: 'workforce' },
  { prefix: '/staff', module: 'workforce' },
  { prefix: '/attendance', module: 'workforce' },
  { prefix: '/time-off', module: 'workforce' },
  { prefix: '/vehicles', module: 'fleet' },
  { prefix: '/depots', module: 'fleet' },
  { prefix: '/customers', module: 'customers' },
  { prefix: '/passengers', module: 'customers' },
  { prefix: '/schools', module: 'customers' },
  { prefix: '/contracts', module: 'commercial' },
  { prefix: '/pricing', module: 'commercial' },
  { prefix: '/bookings', module: 'operations' },
  { prefix: '/dispatch', module: 'operations' },
  { prefix: '/trips', module: 'operations' },
  { prefix: '/runs', module: 'operations' },
  { prefix: '/schedule', module: 'operations' },
  { prefix: '/recurring-transport', module: 'operations' },
  { prefix: '/duties', module: 'operations' },
  { prefix: '/exceptions', module: 'operations' },
  { prefix: '/live-operations', module: 'operations' },
  { prefix: '/availability', module: 'operations' },
  { prefix: '/cancellations', module: 'operations' },
  { prefix: '/handover', module: 'operations' },
  { prefix: '/messages', module: 'communications' },
  { prefix: '/announcements', module: 'communications' },
  { prefix: '/templates', module: 'communications' },
  { prefix: '/notifications', module: 'communications' },
  { prefix: '/communication', module: 'communications' },
  { prefix: '/reports', module: 'reporting' },
  { prefix: '/performance', module: 'reporting' },
  { prefix: '/audit', module: 'audit' },
  { prefix: '/settings/integrations', module: 'integrations' },
]

export function moduleForPath(pathname: string): PlatformModule | null {
  const path = pathname.split('?')[0] || '/'
  if (path === '/' || path === '') return 'operations'
  const match = ROUTE_MODULE_RULES.find((rule) => path === rule.prefix || path.startsWith(`${rule.prefix}/`))
  return match?.module ?? null
}

export function isModuleEnabled(
  enabledModules: string[] | null | undefined,
  moduleKey: PlatformModule | null,
): boolean {
  return canUse(enabledModules, moduleKey)
}

export function filterNavByModules<T extends { href?: string; children?: Array<{ href: string }> }>(
  items: T[],
  enabledModules: string[] | null | undefined,
): T[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = item.children.filter((child) =>
          isModuleEnabled(enabledModules, moduleForPath(child.href)),
        )
        if (!children.length) return null
        return { ...item, children }
      }
      if (item.href && !isModuleEnabled(enabledModules, moduleForPath(item.href))) return null
      return item
    })
    .filter(Boolean) as T[]
}
