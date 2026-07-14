export const IMMEDIATE_CAUSE_OPTIONS = [
  'Driver action',
  'Passenger action',
  'Vehicle failure',
  'Equipment failure',
  'Environmental condition',
  'Road condition',
  'Depot condition',
  'Communication failure',
] as const

export const CONTRIBUTING_FACTOR_OPTIONS = [
  'Fatigue',
  'Time pressure',
  'Inadequate training',
  'Poor route planning',
  'Incomplete passenger information',
  'Inadequate supervision',
  'Incorrect vehicle allocation',
  'Missing equipment',
  'Defect not escalated',
  'Procedure not followed',
  'Procedure unclear',
  'System or app failure',
] as const

export const UNDERLYING_CAUSE_OPTIONS = [
  'Policy gap',
  'Training gap',
  'Resource constraint',
  'Weak compliance control',
  'Poor ownership',
  'Inadequate risk assessment',
  'Repeated maintenance failure',
  'Procurement or equipment issue',
  'Scheduling design',
  'Culture or reporting concern',
] as const

export type ImmediateCause = (typeof IMMEDIATE_CAUSE_OPTIONS)[number]
export type ContributingFactor = (typeof CONTRIBUTING_FACTOR_OPTIONS)[number]
export type UnderlyingCause = (typeof UNDERLYING_CAUSE_OPTIONS)[number]
