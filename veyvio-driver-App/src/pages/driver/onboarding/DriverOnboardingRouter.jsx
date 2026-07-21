import { Navigate, Route, Routes } from "react-router-dom";
import { DriverOnboardingProvider } from "@/contexts/DriverOnboardingContext";
import DriverOnboardingHomeScreen from "@/pages/driver/onboarding/DriverOnboardingHomeScreen";
import {
  DriverAddressEmergencyScreen,
  DriverDefectPolicyScreen,
  DriverDbsSafeguardingScreen,
  DriverDqcCpcScreen,
  DriverDvlaCheckScreen,
  DriverLicenceScreen,
  DriverMedicalDeclarationScreen,
  DriverOnboardingReviewScreen,
  DriverPolicyAcknowledgementScreen,
  DriverProfileDetailsScreen,
  DriverRightToWorkScreen,
  DriverTachographCardScreen,
  DriverTrainingChecklistScreen,
} from "@/pages/driver/onboarding/DriverOnboardingTaskScreens";

/**
 * Nested under `/onboarding/*` from DriverApp — routes are relative to that prefix.
 */
export default function DriverOnboardingRouter({ driver, organisationId, onSubmitted, onRefresh }) {
  return (
    <DriverOnboardingProvider driver={driver} organisationId={organisationId} onRefresh={onRefresh}>
      <Routes>
        <Route index element={<DriverOnboardingHomeScreen />} />
        <Route path="profile" element={<DriverProfileDetailsScreen />} />
        <Route path="address-emergency" element={<DriverAddressEmergencyScreen />} />
        <Route path="licence" element={<DriverLicenceScreen />} />
        <Route path="dvla" element={<DriverDvlaCheckScreen />} />
        <Route path="dqc" element={<DriverDqcCpcScreen />} />
        <Route path="tachograph" element={<DriverTachographCardScreen />} />
        <Route path="dbs" element={<DriverDbsSafeguardingScreen />} />
        <Route path="right-to-work" element={<DriverRightToWorkScreen />} />
        <Route path="medical" element={<DriverMedicalDeclarationScreen />} />
        <Route path="handbook" element={<DriverPolicyAcknowledgementScreen />} />
        <Route path="training" element={<DriverTrainingChecklistScreen />} />
        <Route path="defect-policy" element={<DriverDefectPolicyScreen />} />
        <Route path="review" element={<DriverOnboardingReviewScreen onSubmitted={onSubmitted} />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </DriverOnboardingProvider>
  );
}
