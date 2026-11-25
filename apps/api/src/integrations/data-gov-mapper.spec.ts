import carFixture from "./__fixtures__/car-response.json";
import motorcycleFixture from "./__fixtures__/motorcycle-response.json";
import { mapDataGovRecord, mapFuelType, normalizePlate } from "./data-gov-mapper";

describe("data-gov-mapper", () => {
  it("normalizes plate numbers by removing dashes, spaces, and non-digits", () => {
    expect(normalizePlate("220-12-602")).toBe("22012602");
    expect(normalizePlate(" 572 081 04 ")).toBe("57208104");
  });

  it("maps a real private car record using kinuy_mishari when present", () => {
    const record = carFixture.result.records[0];
    const mapped = mapDataGovRecord(record, "CAR", "22012602");

    expect(mapped).toEqual({
      plate: "22012602",
      make: "טויוטה צרפת",
      model: "YARIS",
      year: 2020,
      vehicleType: "CAR",
      fuelType: "PETROL",
    });
  });

  it("maps a real motorcycle record using degem_nm when kinuy_mishari is absent", () => {
    const record = motorcycleFixture.result.records[0];
    const mapped = mapDataGovRecord(record, "MOTORCYCLE", "57208104");

    expect(mapped).toEqual({
      plate: "57208104",
      make: "אס ווי אמ טאיו",
      model: "TL",
      year: 2026,
      vehicleType: "MOTORCYCLE",
      fuelType: "PETROL",
    });
  });

  it("maps known Hebrew/English fuel types accurately", () => {
    expect(mapFuelType("בנזין")).toBe("PETROL");
    expect(mapFuelType("דיזל")).toBe("DIESEL");
    expect(mapFuelType("חשמל")).toBe("ELECTRIC");
    expect(mapFuelType("היברידי")).toBe("HYBRID");
    expect(mapFuelType("פלאג-אין")).toBe("PLUGIN_HYBRID");
  });
});
