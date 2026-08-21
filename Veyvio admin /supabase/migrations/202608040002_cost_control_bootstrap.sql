-- Bootstrap Cost Control organisations from Command companies that have FINANCE access.
-- Creates an empty approved budget shell (PENDING) — never Demo CEC amounts.

INSERT INTO cost_control.organisations (id, name, trading_name, currency, timezone)
SELECT
  c.id::text,
  coalesce(nullif(trim(c.legal_name), ''), c.trading_name),
  c.trading_name,
  'GBP',
  'Europe/London'
FROM public.companies c
WHERE EXISTS (
  SELECT 1
  FROM public.company_memberships cm
  INNER JOIN public.membership_application_access maa
    ON maa.membership_id = cm.id
   AND maa.app_type = 'FINANCE'
   AND maa.status = 'active'
  WHERE cm.company_id = c.id
    AND cm.status = 'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  trading_name = EXCLUDED.trading_name,
  updated_at = now();

-- Empty current-year budget shell per organisation (idempotent by code+version).
INSERT INTO cost_control.budgets (
  id,
  organisation_id,
  name,
  code,
  financial_year,
  version,
  currency,
  contingency_minor,
  status
)
SELECT
  'bud_' || o.id || '_current',
  o.id,
  'Company cost budget',
  'PENDING',
  to_char(timezone('Europe/London', now()), 'YYYY')
    || '/'
    || to_char(timezone('Europe/London', now()) + interval '1 year', 'YY'),
  1,
  'GBP',
  0,
  'approved'
FROM cost_control.organisations o
ON CONFLICT (organisation_id, code, version) DO NOTHING;

-- Mirror finance memberships for users with FINANCE app access.
-- Role is resolved from Command role names (finance_* preferred; company owner → finance_admin).
INSERT INTO cost_control.organisation_memberships (
  id,
  organisation_id,
  user_subject,
  role,
  active
)
SELECT
  'ccm_' || cm.id::text,
  cm.company_id::text,
  cm.user_id::text,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'finance_director'
    ) THEN 'finance_director'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'finance_admin'
    ) THEN 'finance_admin'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'finance_manager'
    ) THEN 'finance_manager'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'finance_officer'
    ) THEN 'finance_officer'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) IN ('company_owner', 'company_admin', 'company_administrator')
    ) THEN 'finance_admin'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'cost_approver'
    ) THEN 'cost_approver'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'payroll_cost_reviewer'
    ) THEN 'payroll_cost_reviewer'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'auditor'
    ) THEN 'auditor'
    WHEN EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = ANY (cm.role_ids)
        AND lower(r.name) = 'board_reader'
    ) THEN 'board_reader'
    ELSE 'finance_manager'
  END,
  true
FROM public.company_memberships cm
INNER JOIN public.membership_application_access maa
  ON maa.membership_id = cm.id
 AND maa.app_type = 'FINANCE'
 AND maa.status = 'active'
WHERE cm.status = 'active'
ON CONFLICT (organisation_id, user_subject) DO UPDATE
SET
  role = EXCLUDED.role,
  active = true,
  updated_at = now();
