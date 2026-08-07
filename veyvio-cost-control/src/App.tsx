import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import {
  RequireFinancePage,
  RequireFinanceWorkspace,
  RequireIdentity,
} from './auth/RouteGuards'
import { AppShell } from './components/AppShell'
import { CostStoreProvider } from './data/CostStore'
import { AuditWorkspacePage } from './pages/AuditWorkspacePage'
import { AccountingExportsPage } from './pages/AccountingExportsPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { BankPage } from './pages/BankPage'
import { BoardPackPage } from './pages/BoardPackPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { BudgetLineDetailPage } from './pages/BudgetLineDetailPage'
import { CashFlowPage } from './pages/CashFlowPage'
import { CostsPage } from './pages/CostsPage'
import { CostBreakdownPage } from './pages/CostBreakdownPage'
import { GovernancePage } from './pages/GovernancePage'
import { HomePage } from './pages/HomePage'
import { ImportsPage } from './pages/ImportsPage'
import { ManagementAccountsPage } from './pages/ManagementAccountsPage'
import {
  AuditSecuritySettingsPage,
  FinancialControlsSettingsPage,
  GeneralSettingsPage,
  IntegrationsSettingsPage,
  NotificationsSettingsPage,
  PeopleSettingsPage,
  SettingsHubPage,
} from './pages/SettingsPages'
import { OperatingCostsPage } from './pages/OperatingCostsPage'
import { OrganisationPage } from './pages/OrganisationPage'
import { PersonFinanceProfilePage } from './pages/PersonFinanceProfilePage'
import {
  PayPeriodsPage,
  PayrollCostOverviewPage,
} from './pages/PayrollCostOverviewPage'
import { QuarterlyReviewPage } from './pages/QuarterlyReviewPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { VehiclesPage, VehicleDetailPage } from './pages/VehiclesPage'
import { WageApprovalPage } from './pages/WageApprovalPage'
import { WageHoursPage } from './pages/WageHoursPage'
import {
  AcceptInvitationPage,
  AuthUnavailablePage,
  CompanySelectionPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
} from './pages/AuthPages'
import {
  CommitmentsPage,
  ForecastPage,
  ReportsPage,
  SuppliersPage,
} from './pages/SecondaryPages'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="auth">
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="unavailable" element={<AuthUnavailablePage />} />
          <Route element={<RequireIdentity />}>
            <Route path="company" element={<CompanySelectionPage />} />
          </Route>
        </Route>

        <Route element={<RequireIdentity />}>
          <Route element={<RequireFinanceWorkspace />}>
            <Route element={<FinanceWorkspace />}>
              <Route index element={<RequireFinancePage page="overview"><HomePage /></RequireFinancePage>} />
              <Route path="access-denied" element={<AccessDeniedPage />} />
              <Route path="overview" element={<Navigate to="/" replace />} />
              <Route path="all-costs" element={<Navigate to="/costs" replace />} />
              <Route path="budget-forecast" element={<Navigate to="/budgets" replace />} />
              <Route path="cash-bank" element={<Navigate to="/bank" replace />} />
              <Route path="cost-breakdown" element={<RequireFinancePage page="breakdown"><CostBreakdownPage /></RequireFinancePage>} />
              <Route path="quarterly-board" element={<Navigate to="/budgets/quarterly" replace />} />
              <Route path="audit-evidence" element={<RequireFinancePage page="audit"><AuditWorkspacePage /></RequireFinancePage>} />
              <Route path="accounting-exports" element={<RequireFinancePage page="accounting_exports"><AccountingExportsPage /></RequireFinancePage>} />
              <Route path="costs" element={<RequireFinancePage page="costs"><CostsPage /></RequireFinancePage>} />
              <Route path="fuel" element={<RequireFinancePage page="costs"><CostsPage title="Fuel" filterCategory="fuel" /></RequireFinancePage>} />
              <Route path="vehicles">
                <Route index element={<RequireFinancePage page="costs"><VehiclesPage /></RequireFinancePage>} />
                <Route path=":vehicleId" element={<RequireFinancePage page="costs"><VehicleDetailPage /></RequireFinancePage>} />
              </Route>
              <Route
                path="maintenance"
                element={<RequireFinancePage page="costs"><CostsPage title="Maintenance" filterCategory="maintenance" /></RequireFinancePage>}
              />
              {/* Nested so /wages/* never falls through the index-only wages match */}
              <Route path="wages">
                <Route index element={<RequireFinancePage page="wages"><PayrollCostOverviewPage /></RequireFinancePage>} />
                <Route path="organisation" element={<RequireFinancePage page="wages"><OrganisationPage /></RequireFinancePage>} />
                <Route path="people/:personId" element={<RequireFinancePage page="wages"><PersonFinanceProfilePage /></RequireFinancePage>} />
                <Route path="hours" element={<RequireFinancePage page="wages"><WageHoursPage /></RequireFinancePage>} />
                <Route path="approval" element={<RequireFinancePage page="wages"><WageApprovalPage /></RequireFinancePage>} />
                <Route path="periods" element={<RequireFinancePage page="wages"><PayPeriodsPage /></RequireFinancePage>} />
                <Route
                  path="ledger"
                  element={<RequireFinancePage page="wages"><CostsPage title="Wage cost ledger" filterCategory="wages" /></RequireFinancePage>}
                />
              </Route>
              <Route path="operating" element={<RequireFinancePage page="costs"><OperatingCostsPage /></RequireFinancePage>} />
              <Route path="budgets">
                <Route index element={<RequireFinancePage page="budgets"><BudgetsPage /></RequireFinancePage>} />
                <Route path="quarterly" element={<RequireFinancePage page="quarterly"><QuarterlyReviewPage /></RequireFinancePage>} />
                <Route path="lines/:lineId" element={<RequireFinancePage page="budgets"><BudgetLineDetailPage /></RequireFinancePage>} />
              </Route>
              <Route path="forecast" element={<RequireFinancePage page="budgets"><ForecastPage /></RequireFinancePage>} />
              <Route path="cash-flow" element={<RequireFinancePage page="bank"><CashFlowPage /></RequireFinancePage>} />
              <Route path="management-accounts" element={<RequireFinancePage page="reports"><ManagementAccountsPage /></RequireFinancePage>} />
              <Route path="board-pack" element={<RequireFinancePage page="quarterly"><BoardPackPage /></RequireFinancePage>} />
              <Route path="governance" element={<RequireFinancePage page="governance"><GovernancePage /></RequireFinancePage>} />
              <Route path="audit" element={<Navigate to="/audit-evidence" replace />} />
              <Route path="commitments" element={<RequireFinancePage page="costs"><CommitmentsPage /></RequireFinancePage>} />
              <Route path="suppliers" element={<RequireFinancePage page="costs"><SuppliersPage /></RequireFinancePage>} />
              <Route path="reviews" element={<RequireFinancePage page="reviews"><ReviewsPage /></RequireFinancePage>} />
              <Route path="bank" element={<RequireFinancePage page="bank"><BankPage /></RequireFinancePage>} />
              <Route path="reports" element={<RequireFinancePage page="reports"><ReportsPage /></RequireFinancePage>} />
              <Route path="imports" element={<RequireFinancePage page="imports"><ImportsPage /></RequireFinancePage>} />
              <Route path="settings">
                <Route index element={<RequireFinancePage page="settings_general"><SettingsHubPage /></RequireFinancePage>} />
                <Route path="general" element={<RequireFinancePage page="settings_general"><GeneralSettingsPage /></RequireFinancePage>} />
                <Route path="financial-controls" element={<RequireFinancePage page="settings_financial"><FinancialControlsSettingsPage /></RequireFinancePage>} />
                <Route path="people" element={<RequireFinancePage page="settings_people"><PeopleSettingsPage /></RequireFinancePage>} />
                <Route path="integrations" element={<RequireFinancePage page="settings_integrations"><IntegrationsSettingsPage /></RequireFinancePage>} />
                <Route path="notifications" element={<RequireFinancePage page="settings_notifications"><NotificationsSettingsPage /></RequireFinancePage>} />
                <Route path="audit-security" element={<RequireFinancePage page="settings_audit"><AuditSecuritySettingsPage /></RequireFinancePage>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

function FinanceWorkspace() {
  return (
    <CostStoreProvider>
      <AppShell />
    </CostStoreProvider>
  )
}
