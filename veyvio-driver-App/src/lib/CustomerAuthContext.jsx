import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setCustomer(me);
      }
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    await base44.auth.logout();
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, setCustomer, loading, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}