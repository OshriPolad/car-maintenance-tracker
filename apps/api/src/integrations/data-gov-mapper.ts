import type { FuelType, VehicleLookupResult, VehicleType } from "@cmt/shared";

export type { VehicleLookupResult };

export interface DataGovVehicleRecord {
  mispar_rechev?: number | string;
  tozeret_nm?: string;
  kinuy_mishari?: string;
  degem_nm?: string;
  shnat_yitzur?: number | string;
  sug_delek_nm?: string;
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
    return "PLUGIN_HYBRID";
  }

  if (normalized.includes("היבריד") || normalized.includes("hybrid")) {
    return "HYBRID";
  }

  if (normalized.includes("דיזל") || normalized.includes("diesel")) {
    return "DIESEL";
  }

  if (normalized.includes("חשמל") || normalized.includes("electric")) {
    return "ELECTRIC";
  }

  return "PETROL";
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
