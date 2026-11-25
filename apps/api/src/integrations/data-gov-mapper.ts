import type { FuelType, VehicleType } from "@cmt/shared";

export interface DataGovVehicleRecord {
  mispar_rechev?: number | string;
  tozeret_nm?: string;
  kinuy_mishari?: string;
  degem_nm?: string;
  shnat_yitzur?: number | string;
  sug_delek_nm?: string;
}

export interface VehicleLookupResult {
  plate: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  fuelType: FuelType;
}

export function normalizePlate(rawPlate: string): string {
  return rawPlate.replace(/\D/g, "");
}

export function mapFuelType(rawFuel?: string): FuelType {
  const normalized = (rawFuel ?? "").trim().toLowerCase();

  if (
    normalized.includes("פלאג") ||
    normalized.includes("plug") ||
    normalized.includes("היבריד נטען")
  ) {
    return "plugin-hybrid";
  }

  if (normalized.includes("היבריד") || normalized.includes("hybrid")) {
    return "hybrid";
  }

  if (normalized.includes("דיזל") || normalized.includes("diesel")) {
    return "diesel";
  }

  if (
    normalized.includes("חשמל") ||
    normalized.includes("electric") ||
    normalized.includes("ev")
  ) {
    return "electric";
  }

  return "petrol";
}

export function mapDataGovRecord(
  record: DataGovVehicleRecord,
  vehicleType: VehicleType,
  fallbackPlate: string,
): VehicleLookupResult {
  const rawPlate =
    record.mispar_rechev !== undefined ? String(record.mispar_rechev) : fallbackPlate;
  const plate = normalizePlate(rawPlate) || normalizePlate(fallbackPlate);

  const make = (record.tozeret_nm ?? "").trim() || "Unknown";

  const commercialName = (record.kinuy_mishari ?? "").trim();
  const modelCode = (record.degem_nm ?? "").trim();
  const model = commercialName || modelCode || "Unknown";

  const parsedYear = Number(record.shnat_yitzur);
  const year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : 0;

  const fuelType = mapFuelType(record.sug_delek_nm);

  return {
    plate,
    make,
    model,
    year,
    vehicleType,
    fuelType,
  };
}