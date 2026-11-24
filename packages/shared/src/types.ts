// Shared domain types used by both apps/api and apps/web.
// Owner: Database & Service Engine (Ilay). Keep in sync with the Prisma schema.

export type UserRole = "PRIVATE" | "BUSINESS";

export type VehicleType = "CAR" | "MOTORCYCLE";
export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "PLUGIN_HYBRID" | "ELECTRIC";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Vehicle {
  id: string;
  userId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  fuelType: FuelType;
  currentKm: number;
  kmUpdatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
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

/** Database representation of a vehicle service template row. */
export interface ServiceTemplate {
  id: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  fuelType: FuelType;
  serviceKey: string;
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  firstAtKm: number | null;
  actions: string[];
  parts: ServicePart[];
  costMin: number | null;
  costMax: number | null;
  source: string;
}

/** A service that was actually performed on a vehicle. */
export interface ServiceRecord {
  id?: string;
  vehicleId?: string;
  serviceKey: string;
  date: string; // ISO date
  km: number;
  cost?: number | null;
  notes?: string | null;
  createdAt?: string;
}

export type ReminderType = "SERVICE" | "TEST" | "INSURANCE" | "UPDATE_KM";
export type ReminderStatus = "PENDING" | "SENT" | "DONE";

export interface Reminder {
  id: string;
  vehicleId: string;
  type: ReminderType;
  dueDate: string | null; // ISO date
  dueKm: number | null;
  status: ReminderStatus;
  sentAt: string | null; // ISO timestamp
  createdAt: string; // ISO timestamp
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
