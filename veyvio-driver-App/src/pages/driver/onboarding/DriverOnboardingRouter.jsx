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

export default function DriverOnboardingRouter({ driver, organisationId, onSubmitted, onRefresh }) {
  return (
    <DriverOnboardingProvider driver={driver} organisationId={organisationId} onRefresh={onRefresh}>
      <Routes>
        <Route path="/onboarding" element={<DriverOnboardingHomeScreen />} />
        <Route path="/onboarding/profile" element={<DriverProfileDetailsScreen />} />
        <Route path="/onboarding/address-emergency" element={<DriverAddressEmergencyScreen />} />
        <Route path="/onboarding/licence" element={<DriverLicenceScreen />} />
        <Route path="/onboarding/dvla" element={<DriverDvlaCheckScreen />} />
        <Route path="/onboarding/dqc" element={<DriverDqcCpcScreen />} />
        <Route path="/onboarding/tachograph" element={<DriverTachographCardScreen />} />
        <Route path="/onboarding/dbs" element={<DriverDbsSafeguardingScreen />} />
        <Route path="/onboarding/right-to-work" element={<DriverRightToWorkScreen />} />
        <Route path="/onboarding/medical" element={<DriverMedicalDeclarationScreen />} />
        <Route path="/onboarding/handbook" element={<DriverPolicyAcknowledgementScreen />} />
        <Route path="/onboarding/training" element={<DriverTrainingChecklistScreen />} />
        <Route path="/onboarding/defect-policy" element={<DriverDefectPolicyScreen />} />
        <Route path="/onboarding/review" element={<DriverOnboardingReviewScreen onSubmitted={onSubmitted} />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </DriverOnboardingProvider>
  );
}
