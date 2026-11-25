import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type DataGovVehicleRecord,
  type VehicleLookupResult,
  mapDataGovRecord,
  normalizePlate,
} from "./data-gov-mapper";

const DATA_GOV_ENDPOINT = "https://data.gov.il/api/3/action/datastore_search";
const CARS_RESOURCE_ID = "053cea08-09bc-40ec-8f7a-156f0677aff3";
const MOTORCYCLES_RESOURCE_ID = "bf9df4e2-d90d-4c0a-a400-19e15af8e95f";
const REQUEST_TIMEOUT_MS = 6000;

interface DataGovSearchResponse {
  success?: boolean;
  result?: {
    records?: DataGovVehicleRecord[];
  };
}

@Injectable()
export class PlateLookupService {
  async lookup(rawPlate: string): Promise<VehicleLookupResult> {
    const plate = normalizePlate(rawPlate);

    if (plate.length < 5 || plate.length > 9) {
      throw new BadRequestException("Invalid license plate number");
    }

    const carRecord = await this.queryDataset(CARS_RESOURCE_ID, plate);
    if (carRecord) {
      return mapDataGovRecord(carRecord, "car", plate);
    }

    const motorcycleRecord = await this.queryDataset(MOTORCYCLES_RESOURCE_ID, plate);
    if (motorcycleRecord) {
      return mapDataGovRecord(motorcycleRecord, "motorcycle", plate);
    }

    throw new NotFoundException(`Vehicle with plate ${plate} was not found`);
  }

  private async queryDataset(
    resourceId: string,
    plate: string,
  ): Promise<DataGovVehicleRecord | null> {
    const url = new URL(DATA_GOV_ENDPOINT);
    url.searchParams.set("resource_id", resourceId);
    url.searchParams.set("filters", JSON.stringify({ mispar_rechev: Number(plate) }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new BadGatewayException(`data.gov.il responded with status ${response.status}`);
      }

      const data = (await response.json()) as DataGovSearchResponse;
      if (!data.success || !Array.isArray(data.result?.records)) {
        throw new BadGatewayException("Unexpected response format from data.gov.il");
      }

      return data.result.records[0] ?? null;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadGatewayException("Failed to fetch vehicle data from data.gov.il");
    } finally {
      clearTimeout(timer);
    }
  }
}
