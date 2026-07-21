import { Navigate, Route, Routes } from "react-router-dom";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import DriverAuthEntry from "./DriverAuthEntry";
import DriverAuthVerify from "./DriverAuthVerify";
import DriverPhoneVerify from "./DriverPhoneVerify";
import DriverSignUp from "./DriverSignUp";
import DriverForgotPassword from "./DriverForgotPassword";
import DriverCheckEmail from "./DriverCheckEmail";
import DriverResetPassword from "./DriverResetPassword";

/** Auth shell only — splash/welcome live on DriverApp via DriverLaunchGate. */
export default function DriverAuthRoutes({ login, loginWithBiometrics, refresh }) {
  return (
    <Routes>
      <Route
        path={DRIVER_AUTH_PATH}
        element={<DriverAuthEntry onLogin={login} onBiometricLogin={loginWithBiometrics} />}
      />
      <Route path="/auth/verify-phone" element={<DriverPhoneVerify onVerified={refresh} />} />
      <Route path="/auth/sign-up" element={<DriverSignUp />} />
      <Route path="/auth/check-email" element={<DriverCheckEmail />} />
      <Route path="/auth/forgot-password" element={<DriverForgotPassword />} />
      <Route path="/auth/reset-password" element={<DriverResetPassword />} />
      <Route path="/auth/verify" element={<DriverAuthVerify onVerified={refresh} />} />
      <Route path="/" element={<Navigate to={DRIVER_AUTH_PATH} replace />} />
      <Route path="*" element={<Navigate to={DRIVER_AUTH_PATH} replace />} />
    </Routes>
  );
}
