export const AUTH_FLOW_TOTAL_STEPS = 5;

export const AUTH_FLOW_STEPS = {
  signIn: 1,
  mfa: 2,
  company: 3,
  depot: 4,
  sync: 5,
} as const;
