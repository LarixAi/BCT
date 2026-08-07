import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CommunityTransportLandingPage } from "@/pages/CommunityTransportLandingPage";
import { CommunityTransportPage } from "@/pages/CommunityTransportPage";
import { CommandPage } from "@/pages/CommandPage";
import { ContactPage } from "@/pages/ContactPage";
import { DemoPage } from "@/pages/DemoPage";
import { DialARidePage } from "@/pages/DialARidePage";
import { DriverPage } from "@/pages/DriverPage";
import { FleetSafetyCompliancePage } from "@/pages/FleetSafetyCompliancePage";
import { HomePage } from "@/pages/HomePage";
import { HomeToSchoolPage } from "@/pages/HomeToSchoolPage";
import { IndustriesPage } from "@/pages/IndustriesPage";
import { LocalAuthoritiesPage } from "@/pages/LocalAuthoritiesPage";
import { MultiDepotPage } from "@/pages/MultiDepotPage";
import { PlatformPage } from "@/pages/PlatformPage";
import { PlannedPage } from "@/pages/PlannedPage";
import { PricingPage } from "@/pages/PricingPage";
import { SendTransportPage } from "@/pages/SendTransportPage";
import { SignInRedirect, TierOnePage } from "@/pages/TierOnePage";
import { SolutionsPage } from "@/pages/SolutionsPage";
import { TransportOperationsPage } from "@/pages/TransportOperationsPage";
import { VehicleReadinessPage } from "@/pages/VehicleReadinessPage";
import { YardPage } from "@/pages/YardPage";

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="sign-in" element={<SignInRedirect />} />
        <Route path="community-transport" element={<CommunityTransportLandingPage />} />

        {/* Tier 1 — blueprint Part F.1 */}
        <Route path="platform" element={<PlatformPage />} />
        <Route path="platform/command" element={<CommandPage />} />
        <Route path="platform/driver" element={<DriverPage />} />
        <Route path="platform/yard" element={<YardPage />} />
        <Route path="platform/*" element={<TierOnePage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="solutions/transport-operations" element={<TransportOperationsPage />} />
        <Route path="solutions/fleet-safety-compliance" element={<FleetSafetyCompliancePage />} />
        <Route path="solutions/vehicle-readiness" element={<VehicleReadinessPage />} />
        <Route path="solutions/multi-depot" element={<MultiDepotPage />} />
        <Route path="solutions/*" element={<TierOnePage />} />
        <Route path="integrations" element={<TierOnePage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="trust" element={<TierOnePage />} />
        <Route path="trust/*" element={<TierOnePage />} />
        <Route path="implementation" element={<TierOnePage />} />
        <Route path="pilot-programme" element={<TierOnePage />} />
        <Route path="resources" element={<TierOnePage />} />
        <Route path="resources/*" element={<TierOnePage />} />
        <Route path="support" element={<TierOnePage />} />
        <Route path="status" element={<TierOnePage />} />
        <Route path="industries" element={<IndustriesPage />} />
        <Route path="industries/community-transport" element={<CommunityTransportPage />} />
        <Route path="industries/dial-a-ride" element={<DialARidePage />} />
        <Route path="industries/home-to-school" element={<HomeToSchoolPage />} />
        <Route path="industries/local-authorities" element={<LocalAuthoritiesPage />} />
        <Route path="industries/send-transport" element={<SendTransportPage />} />
        <Route path="industries/*" element={<TierOnePage />} />
        <Route path="legal/*" element={<TierOnePage />} />

        {/* Tier 2 — company pages */}
        <Route path="about" element={<TierOnePage />} />
        <Route path="mission" element={<TierOnePage />} />
        <Route path="partners" element={<TierOnePage />} />
        <Route path="careers" element={<TierOnePage />} />
        <Route path="customer-success" element={<TierOnePage />} />
        <Route path="release-notes" element={<TierOnePage />} />

        <Route path="*" element={<PlannedPage />} />
      </Route>
    </Routes>
  );
}
