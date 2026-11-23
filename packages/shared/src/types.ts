// Shared domain types used by both apps/api and apps/web.
// Owner: Database & Service Engine (Ilay). Keep in sync with the Prisma schema.

export type VehicleType = "car" | "motorcycle";
export type FuelType = "petrol" | "diesel" | "hybrid" | "plugin-hybrid" | "electric";

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  fuelType: FuelType;
  currentKm: number;
}

export interface ServicePart {
  name: string;
  partNumber?: string;
  quantity: number;
  spec?: string;
}

/** One recurring service item, e.g. "oil change every 15,000 km or 12 months". */
export interface ServiceTemplateItem {
  id: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  firstAtKm?: number | null;
  actions: string[];
  parts: ServicePart[];
  costMin?: number;
  costMax?: number;
  notes?: string;
}

/** A service that was actually performed on a vehicle. */
export interface ServiceRecord {
  serviceId: string;
  date: string; // ISO date
  km: number;
}

export type DueStatus = "ok" | "due-soon" | "overdue";

export interface NextService {
  item: ServiceTemplateItem;
  dueAtKm: number | null;
  dueAtDate: string | null; // ISO date
  status: DueStatus;
}

export interface HealthResponse {
  status: "ok";
  db: "up" | "down";
  timestamp: string;
}
