import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CommandShell } from '@/components/layout/CommandShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'
import { OperationalProvider } from '@/lib/context'
import { LoginPage, SelectCompanyPage } from '@/features/auth/AuthPages'
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
import { VehiclesPage } from '@/features/vehicles/VehiclesPage'
import { VehicleDetailPage } from '@/features/vehicles/VehicleDetailPage'
import { VehicleFormPage } from '@/features/vehicles/VehicleFormPage'
import { VorBoardPage } from '@/features/vehicles/VorBoardPage'
import { FleetCompliancePage } from '@/features/vehicles/FleetCompliancePage'
import { FleetIntelligencePage } from '@/features/vehicles/FleetIntelligencePage'
import { VehicleOnboardingPage } from '@/features/vehicles/VehicleOnboardingPage'
import { DefectsPage } from '@/features/defects/DefectsPage'
import { DefectDetailPage } from '@/features/defects/DefectDetailPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { VehicleChecksPage } from '@/features/vehicle-checks/VehicleChecksPage'
import { CheckDetailPage } from '@/features/vehicle-checks/CheckDetailPage'
import { IncidentsPage } from '@/features/incidents/IncidentsPage'
import { IncidentDetailPage } from '@/features/incidents/IncidentDetailPage'
import { IncidentSettingsPage } from '@/features/incidents/IncidentSettingsPage'
import { ComplianceRulesPage } from '@/features/compliance/ComplianceRulesPage'
import { MessagesPage } from '@/features/messages/MessagesPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AnnouncementsPage } from '@/features/announcements/AnnouncementsPage'
import { DepotsPage } from '@/features/depots/DepotsPage'
import { CompanySettingsPage } from '@/features/settings/CompanySettingsPage'
import { UsersPage } from '@/features/settings/UsersPage'
import { IntegrationsPage } from '@/features/settings/IntegrationsPage'
import { RecurringTransportPage } from '@/features/recurring-transport/RecurringTransportPage'
import { PassengersPage } from '@/features/passengers/PassengersPage'
import { StaffPage } from '@/features/staff/StaffPage'
import { StaffDetailPage } from '@/features/staff/StaffDetailPage'
import { StaffFormPage } from '@/features/staff/StaffFormPage'
import { YardOperationsPage } from '@/features/yard/YardOperationsPage'
import { MaintenancePage } from '@/features/maintenance/MaintenancePage'
import { InspectionsPage } from '@/features/inspections/InspectionsPage'
import { SchoolsPage } from '@/features/schools/SchoolsPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { PricingPage } from '@/features/pricing/PricingPage'
import { TemplatesPage } from '@/features/templates/TemplatesPage'
import { PerformancePage } from '@/features/performance/PerformancePage'
import { AuditLogPage } from '@/features/audit/AuditLogPage'

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
            <Route path="/select-company" element={<SelectCompanyPage />} />

            <Route element={<ProtectedRoute />}>
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
                <Route path="ops-trips/:id" element={<OperationalTripDetailPage />} />
                <Route path="dispatch" element={<DispatchPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="runs/:id" element={<RunDetailPage />} />
                <Route path="trips" element={<TripsPage />} />
                <Route path="trips/:id" element={<TripDetailPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="recurring-transport" element={<RecurringTransportPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="drivers/new" element={<DriverFormPage />} />
                <Route path="drivers/:id/edit" element={<DriverFormPage />} />
                <Route path="drivers/:id" element={<DriverDetailPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="staff/new" element={<StaffFormPage />} />
                <Route path="staff/:id" element={<StaffDetailPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/vor" element={<VorBoardPage />} />
                <Route path="vehicles/compliance" element={<FleetCompliancePage />} />
                <Route path="vehicles/intelligence" element={<FleetIntelligencePage />} />
                <Route path="vehicles/new" element={<VehicleFormPage />} />
                <Route path="vehicles/:id/onboarding" element={<VehicleOnboardingPage />} />
                <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="depots" element={<DepotsPage />} />
                <Route path="yard" element={<YardOperationsPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="vehicle-checks/:checkId" element={<CheckDetailPage />} />
                <Route path="vehicle-checks" element={<VehicleChecksPage />} />
                <Route path="defects/:id" element={<DefectDetailPage />} />
                <Route path="defects" element={<DefectsPage />} />
                <Route path="inspections" element={<InspectionsPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/settings" element={<IncidentSettingsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailPage />} />
                <Route path="compliance-rules" element={<ComplianceRulesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="passengers" element={<PassengersPage />} />
                <Route path="schools" element={<SchoolsPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="settings/company" element={<CompanySettingsPage />} />
                <Route path="settings/users" element={<UsersPage />} />
                <Route path="settings/integrations" element={<IntegrationsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
