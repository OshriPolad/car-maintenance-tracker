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
    const mapped = mapDataGovRecord(record, "car", "22012602");

    expect(mapped).toEqual({
      plate: "22012602",
      make: "טויוטה צרפת",
      model: "YARIS",
      year: 2020,
      vehicleType: "car",
      fuelType: "petrol",
    });
  });

  it("maps a real motorcycle record using degem_nm when kinuy_mishari is absent", () => {
    const record = motorcycleFixture.result.records[0];
    const mapped = mapDataGovRecord(record, "motorcycle", "57208104");

    expect(mapped).toEqual({
      plate: "57208104",
      make: "אס ווי אמ טאיו",
      model: "TL",
      year: 2026,
      vehicleType: "motorcycle",
      fuelType: "petrol",
    });
  });

  it("maps known Hebrew/English fuel types accurately", () => {
    expect(mapFuelType("בנזין")).toBe("petrol");
    expect(mapFuelType("דיזל")).toBe("diesel");
    expect(mapFuelType("חשמל")).toBe("electric");
    expect(mapFuelType("היברידי")).toBe("hybrid");
    expect(mapFuelType("פלאג-אין")).toBe("plugin-hybrid");
  });
});
