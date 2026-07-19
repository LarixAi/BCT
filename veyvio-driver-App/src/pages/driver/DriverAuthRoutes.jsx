import { Navigate, Route, Routes } from "react-router-dom";
import DriverLaunchGate from "@/components/driver/launch/DriverLaunchGate";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import DriverAuthEntry from "./DriverAuthEntry";
import DriverAuthVerify from "./DriverAuthVerify";
import DriverPhoneVerify from "./DriverPhoneVerify";
import DriverSignUp from "./DriverSignUp";
import DriverForgotPassword from "./DriverForgotPassword";
import DriverCheckEmail from "./DriverCheckEmail";
import DriverResetPassword from "./DriverResetPassword";

export default function DriverAuthRoutes({ login, refresh }) {
  return (
    <DriverLaunchGate>
      <Routes>
        <Route path={DRIVER_AUTH_PATH} element={<DriverAuthEntry onLogin={login} />} />
        <Route path="/auth/verify-phone" element={<DriverPhoneVerify onVerified={refresh} />} />
        <Route path="/auth/sign-up" element={<DriverSignUp />} />
        <Route path="/auth/check-email" element={<DriverCheckEmail />} />
        <Route path="/auth/forgot-password" element={<DriverForgotPassword />} />
        <Route path="/auth/reset-password" element={<DriverResetPassword />} />
        <Route path="/auth/verify" element={<DriverAuthVerify onVerified={refresh} />} />
        <Route path="*" element={<Navigate to={DRIVER_AUTH_PATH} replace />} />
      </Routes>
    </DriverLaunchGate>
  );
}
