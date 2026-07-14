export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  status: "active" | "suspended";
}

export interface Depot {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
  vehiclesOnSite: number;
  vehiclesVor: number;
  openDefects: number;
  outstandingChecks: number;
  activeAlerts: number;
}

export interface TenancyContext {
  companyId: string | null;
  companyName: string | null;
  depotId: string | null;
  depotName: string | null;
  depotCode: string | null;
  role: string | null;
}
