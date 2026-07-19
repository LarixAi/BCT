import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CommandShell } from '@/components/layout/CommandShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'
import { OperationalProvider } from '@/lib/context'
import { LoginPage, SelectCompanyPage } from '@/features/auth/AuthPages'
import {
  AcceptContractsPage,
  CompanySetupPage,
  CompanyVerificationPage,
  SignupPage,
  VerifyEmailPage,
} from '@/features/auth/SignupPages'
import {
  AcceptInvitationPage,
  ForgotPasswordPage,
  InviteUsersPage,
  MfaSetupPage,
  ResetPasswordPage,
} from '@/features/auth/InviteAuthPages'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { CreateBookingPage } from '@/features/bookings/CreateBookingPage'
import { UrgentBookingPage } from '@/features/bookings/UrgentBookingPage'
import { EditBookingPage } from '@/features/bookings/EditBookingPage'
import { OperationalTripDetailPage } from '@/features/transfers/OperationalTripDetailPage'
import { BookingDetailPage } from '@/features/bookings/BookingDetailPage'
import { DispatchPage } from '@/features/dispatch/DispatchPage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { LiveOperationsPage } from '@/features/live-operations/LiveOperationsPage'
import { ExceptionsPage } from '@/features/exceptions/ExceptionsPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { RunsPage } from '@/features/runs/RunsPage'
import { RunDetailPage } from '@/features/runs/RunDetailPage'
import { TripsPage } from '@/features/trips/TripsPage'
import { TripDetailPage } from '@/features/trips/TripDetailPage'
import { DriversPage } from '@/features/drivers/DriversPage'
import { DriverDetailPage } from '@/features/drivers/DriverDetailPage'
import { DriverFormPage } from '@/features/drivers/DriverFormPage'
import { DriverOnboardingWizard } from '@/features/drivers/onboarding/DriverOnboardingWizard'
import { VehiclesPage } from '@/features/vehicles/VehiclesPage'
import { VehicleDetailPage } from '@/features/vehicles/VehicleDetailPage'
import { VehicleFormPage } from '@/features/vehicles/VehicleFormPage'
import { VorBoardPage } from '@/features/vehicles/VorBoardPage'
import { FleetCompliancePage } from '@/features/vehicles/FleetCompliancePage'
import { FleetIntelligencePage } from '@/features/vehicles/FleetIntelligencePage'
import { VehicleOnboardingWizard } from '@/features/vehicles/onboarding/VehicleOnboardingWizard'
import { DefectsPage } from '@/features/defects/DefectsPage'
import { DefectDetailPage } from '@/features/defects/DefectDetailPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { AttendancePage } from '@/features/attendance/AttendancePage'
import { TimeOffPage } from '@/features/attendance/TimeOffPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { VehicleChecksPage } from '@/features/vehicle-checks/VehicleChecksPage'
import { CheckDetailPage } from '@/features/vehicle-checks/CheckDetailPage'
import { VehicleReportsPage } from '@/features/vehicle-reports/VehicleReportsPage'
import { VehicleReportDetailPage } from '@/features/vehicle-reports/VehicleReportDetailPage'
import { IncidentsPage } from '@/features/incidents/IncidentsPage'
import { IncidentDetailPage } from '@/features/incidents/IncidentDetailPage'
import { IncidentSettingsPage } from '@/features/incidents/IncidentSettingsPage'
import { ComplianceRulesPage } from '@/features/compliance/ComplianceRulesPage'
import { MessagesPage } from '@/features/messages/MessagesPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { DailyOperationsReportPage } from '@/features/reports/DailyOperationsReportPage'
import { StandardReportPage } from '@/features/reports/StandardReportPage'
import { AnnouncementsPage } from '@/features/announcements/AnnouncementsPage'
import { DepotsPage } from '@/features/depots/DepotsPage'
import { DepotDetailPage } from '@/features/depots/DepotDetailPage'
import { DepotOnboardingWizard } from '@/features/depots/onboarding/DepotOnboardingWizard'
import { CompanySettingsPage } from '@/features/settings/CompanySettingsPage'
import { SecuritySettingsPage } from '@/features/settings/SecuritySettingsPage'
import { UsersPage } from '@/features/settings/UsersPage'
import { IntegrationsPage } from '@/features/settings/IntegrationsPage'
import { RecurringTransportPage } from '@/features/recurring-transport/RecurringTransportPage'
import { PassengersPage } from '@/features/passengers/PassengersPage'
import { StaffPage } from '@/features/staff/StaffPage'
import { StaffDetailPage } from '@/features/staff/StaffDetailPage'
import { StaffFormPage } from '@/features/staff/StaffFormPage'
import { YardOperationsPage } from '@/features/yard/YardOperationsPage'
import { MaintenancePage, MaintenanceWorkOrdersRedirect } from '@/features/maintenance/MaintenancePage'
import { InspectionsPage } from '@/features/inspections/InspectionsPage'
import { InspectionDetailPage } from '@/features/inspections/InspectionDetailPage'
import { FleetResourcesPage } from '@/features/fleet-resources/FleetResourcesPage'
import { SchoolsPage } from '@/features/schools/SchoolsPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { PricingPage } from '@/features/pricing/PricingPage'
import { TemplatesPage } from '@/features/templates/TemplatesPage'
import { PerformancePage } from '@/features/performance/PerformancePage'
import { AuditLogPage } from '@/features/audit/AuditLogPage'
import {
  AvailabilityPage,
  CancellationsPage,
  CommunicationDeliveryPage,
  ComplianceDashboardPage,
  ComplianceExpiriesPage,
  ContractDetailPage,
  ConversationDetailPage,
  CorrectiveActionsPage,
  CustomerDetailPage,
  DutiesPage,
  DutyDetailPage,
  ExportsPage,
  GlobalSearchPage,
  HandoverPage,
  ImportsPage,
  NotificationSettingsPage,
  PassengerDetailPage,
  ProfilePage,
  RiskAssessmentsPage,
  RolesPage,
  SafeguardingPage,
  SchoolDetailPage,
  StaffEditPage,
} from '@/features/roadmap/ResourcePages'
import {
  AccessDeniedPage,
  CompanyUnavailablePage,
  NotFoundPage,
  SessionExpiredPage,
} from '@/features/system/SystemStatePages'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="/select-company" element={<SelectCompanyPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route path="/session-expired" element={<SessionExpiredPage />} />
            <Route path="/company-unavailable" element={<CompanyUnavailablePage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/company-verification" element={<CompanyVerificationPage />} />
              <Route path="/setup/contracts" element={<AcceptContractsPage />} />
              <Route path="/setup/company" element={<CompanySetupPage />} />
              <Route path="/setup/security" element={<MfaSetupPage />} />
              <Route
                element={
                  <OperationalProvider>
                    <CommandShell />
                  </OperationalProvider>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="live-operations" element={<LiveOperationsPage />} />
                <Route path="exceptions" element={<ExceptionsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="bookings/new/urgent" element={<UrgentBookingPage />} />
                <Route path="bookings/new" element={<CreateBookingPage />} />
                <Route path="bookings/:id/edit" element={<EditBookingPage />} />
                <Route path="bookings/:id" element={<BookingDetailPage />} />
                <Route path="live-operations/trips/:id" element={<OperationalTripDetailPage />} />
                <Route path="ops-trips/:id" element={<OperationalTripDetailPage />} />
                <Route path="dispatch" element={<DispatchPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="runs/:id" element={<RunDetailPage />} />
                <Route path="trips" element={<TripsPage />} />
                <Route path="trips/:id" element={<TripDetailPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="duties" element={<DutiesPage />} />
                <Route path="duties/:dutyId" element={<DutyDetailPage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route path="cancellations" element={<CancellationsPage />} />
                <Route path="handover" element={<HandoverPage />} />
                <Route path="recurring-transport" element={<RecurringTransportPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="drivers/new" element={<DriverOnboardingWizard />} />
                <Route path="drivers/:id/onboarding" element={<DriverOnboardingWizard />} />
                <Route path="drivers/:id/account" element={<DriverDetailPage />} />
                <Route path="drivers/:id/edit" element={<DriverFormPage />} />
                <Route path="drivers/:id" element={<DriverDetailPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="staff/new" element={<StaffFormPage />} />
                <Route path="staff/:id/edit" element={<StaffEditPage />} />
                <Route path="staff/:id" element={<StaffDetailPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="time-off" element={<TimeOffPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/vor" element={<VorBoardPage />} />
                <Route path="vehicles/compliance" element={<FleetCompliancePage />} />
                <Route path="vehicles/intelligence" element={<FleetIntelligencePage />} />
                <Route path="vehicles/new" element={<VehicleOnboardingWizard />} />
                <Route path="vehicles/:id/onboarding" element={<VehicleOnboardingWizard />} />
                <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="depots" element={<DepotsPage />} />
                <Route path="depots/new" element={<DepotOnboardingWizard />} />
                <Route path="depots/:id/onboarding" element={<DepotOnboardingWizard />} />
                <Route path="depots/:id" element={<DepotDetailPage />} />
                <Route path="yard" element={<YardOperationsPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="maintenance/work-orders" element={<MaintenanceWorkOrdersRedirect />} />
                <Route path="maintenance/work-orders/:workOrderId" element={<MaintenanceWorkOrdersRedirect />} />
                <Route path="fleet-resources" element={<FleetResourcesPage />} />
                <Route path="vehicle-checks/:checkId" element={<CheckDetailPage />} />
                <Route path="vehicle-checks" element={<VehicleChecksPage />} />
                <Route path="vehicle-reports/:id" element={<VehicleReportDetailPage />} />
                <Route path="vehicle-reports" element={<VehicleReportsPage />} />
                <Route path="defects/:id" element={<DefectDetailPage />} />
                <Route path="defects" element={<DefectsPage />} />
                <Route path="inspections" element={<InspectionsPage />} />
                <Route path="inspections/:inspectionId" element={<InspectionDetailPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/settings" element={<IncidentSettingsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailPage />} />
                <Route path="compliance-rules" element={<ComplianceRulesPage />} />
                <Route path="compliance" element={<ComplianceDashboardPage />} />
                <Route path="compliance/expiries" element={<ComplianceExpiriesPage />} />
                <Route path="safeguarding" element={<SafeguardingPage />} />
                <Route path="risk-assessments" element={<RiskAssessmentsPage />} />
                <Route path="corrective-actions" element={<CorrectiveActionsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:customerId" element={<CustomerDetailPage />} />
                <Route path="passengers" element={<PassengersPage />} />
                <Route path="passengers/:passengerId" element={<PassengerDetailPage />} />
                <Route path="schools" element={<SchoolsPage />} />
                <Route path="schools/:schoolId" element={<SchoolDetailPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="contracts/:contractId" element={<ContractDetailPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="messages/:conversationId" element={<ConversationDetailPage />} />
                <Route path="communication/delivery" element={<CommunicationDeliveryPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/daily-operations" element={<DailyOperationsReportPage />} />
                <Route path="reports/:reportId" element={<StandardReportPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="settings/company" element={<CompanySettingsPage />} />
                <Route path="settings/users" element={<UsersPage />} />
                <Route path="settings/roles" element={<RolesPage />} />
                <Route path="settings/invitations" element={<InviteUsersPage />} />
                <Route path="settings/security" element={<SecuritySettingsPage />} />
                <Route path="settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="settings/integrations" element={<IntegrationsPage />} />
                <Route path="search" element={<GlobalSearchPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="imports" element={<ImportsPage />} />
                <Route path="exports" element={<ExportsPage />} />
              </Route>
            </Route>

            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/not-found" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
