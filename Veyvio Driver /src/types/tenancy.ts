export interface Company {
  id: string;
  name: string;
  status: "active" | "suspended";
}

export interface Depot {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
}

export interface TenancyContext {
  companyId: string | null;
  companyName: string | null;
  depotId: string | null;
  depotName: string | null;
  depotCode: string | null;
  driverId: string | null;
  role: string | null;
}
