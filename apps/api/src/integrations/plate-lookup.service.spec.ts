import { BadGatewayException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import carFixture from "./__fixtures__/car-response.json";
import motorcycleFixture from "./__fixtures__/motorcycle-response.json";
import { PlateLookupService } from "./plate-lookup.service";

describe("PlateLookupService", () => {
  let service: PlateLookupService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PlateLookupService],
    }).compile();

    service = moduleRef.get(PlateLookupService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns mapped car data when found in the cars dataset", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(carFixture),
    } as unknown as Response);

    const result = await service.lookup("220-12-602");
    expect(result).toEqual({
      plate: "22012602",
      make: "טויוטה צרפת",
      model: "YARIS",
      year: 2020,
      vehicleType: "CAR",
      fuelType: "PETROL",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to motorcycles dataset when not found in cars dataset", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, result: { records: [] } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(motorcycleFixture),
      } as unknown as Response);

    const result = await service.lookup("57208104");
    expect(result).toEqual({
      plate: "57208104",
      make: "אס ווי אמ טאיו",
      model: "TL",
      year: 2026,
      vehicleType: "MOTORCYCLE",
      fuelType: "PETROL",
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws NotFoundException when plate is not found in either dataset", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, result: { records: [] } }),
    } as unknown as Response);

    await expect(service.lookup("9999999")).rejects.toThrow(NotFoundException);
  });

  it("throws BadGatewayException when data.gov.il fails or times out", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(service.lookup("22012602")).rejects.toThrow(BadGatewayException);
  });
});