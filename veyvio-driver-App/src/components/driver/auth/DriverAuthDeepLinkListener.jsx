import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { installDriverAuthDeepLink } from "@/lib/driverAuthDeepLink";

/** Wires Capacitor appUrlOpen → auth callbacks and operational deep links (sync, duty, …). */
export default function DriverAuthDeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    return installDriverAuthDeepLink((path) => {
      navigate(path, { replace: true });
    });
  }, [navigate]);

  return null;
}
