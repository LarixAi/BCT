export interface NavLink {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  children: NavLink[]
}

export type NavEntry = NavLink | NavGroup

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

export const COMMAND_NAV: NavEntry[] = [
  {
    label: 'Command',
    children: [
      { label: 'Control centre', href: '/' },
      { label: 'Live Operations', href: '/live-operations' },
      { label: 'Exceptions', href: '/exceptions' },
      { label: 'Notifications', href: '/notifications' },
    ],
  },
  {
    label: 'Operations',
    children: [
      { label: 'Bookings', href: '/bookings' },
      { label: 'Dispatch', href: '/dispatch' },
      { label: 'Runs', href: '/runs' },
      { label: 'Trips', href: '/trips' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Recurring Transport', href: '/recurring-transport' },
    ],
  },
  {
    label: 'People and Fleet',
    children: [
      { label: 'Drivers', href: '/drivers' },
      { label: 'Staff', href: '/staff' },
      { label: 'Vehicles', href: '/vehicles' },
      { label: 'Depots', href: '/depots' },
      { label: 'Yard Operations', href: '/yard' },
      { label: 'Maintenance', href: '/maintenance' },
      { label: 'Fleet Resources', href: '/fleet-resources' },
    ],
  },
  {
    label: 'Safety and Compliance',
    children: [
      { label: 'Vehicle Checks', href: '/vehicle-checks' },
      { label: 'Defects', href: '/defects' },
      { label: 'Inspections', href: '/inspections' },
      { label: 'Incidents', href: '/incidents' },
      { label: 'Compliance Rules', href: '/compliance-rules' },
    ],
  },
  {
    label: 'Customers and Commercial',
    children: [
      { label: 'Customers', href: '/customers' },
      { label: 'Passengers', href: '/passengers' },
      { label: 'Schools', href: '/schools' },
      { label: 'Contracts', href: '/contracts' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    label: 'Communication',
    children: [
      { label: 'Messages', href: '/messages' },
      { label: 'Announcements', href: '/announcements' },
      { label: 'Templates', href: '/templates' },
    ],
  },
  {
    label: 'Intelligence',
    children: [
      { label: 'Reports', href: '/reports' },
      { label: 'Performance', href: '/performance' },
      { label: 'Audit Log', href: '/audit' },
    ],
  },
  {
    label: 'Administration',
    children: [
      { label: 'Company Settings', href: '/settings/company' },
      { label: 'Users and Roles', href: '/settings/users' },
      { label: 'Invitations', href: '/settings/invitations' },
      { label: 'Integrations', href: '/settings/integrations' },
    ],
  },
]
