import { describe, expect, it } from "vitest";
import { getNextServices } from "./next-services";
import type { ServiceTemplateItem } from "../types";

const oilChange: ServiceTemplateItem = {
  id: "oil-change",
  name: "Oil change",
  intervalKm: 15000,
  intervalMonths: 12,
  actions: ["Replace oil", "Replace oil filter"],
  parts: [],
};

const now = new Date("2026-06-01");

describe("getNextServices", () => {
  it("is ok when far from the next interval", () => {
    const [result] = getNextServices(
      { currentKm: 20000 },
      [oilChange],
      [{ serviceId: "oil-change", date: "2026-01-01", km: 15000 }],
      { now },
    );
    expect(result.dueAtKm).toBe(30000);
    expect(result.dueAtDate).toBe("2027-01-01");
    expect(result.status).toBe("ok");
  });

  it("is overdue when the km interval passed", () => {
    const [result] = getNextServices(
      { currentKm: 31000 },
      [oilChange],
      [{ serviceId: "oil-change", date: "2026-01-01", km: 15000 }],
      { now },
    );
    expect(result.status).toBe("overdue");
  });

  it("is overdue when the time interval passed, even with low km", () => {
    const [result] = getNextServices(
      { currentKm: 16000 },
      [oilChange],
      [{ serviceId: "oil-change", date: "2025-01-01", km: 15000 }],
      { now },
    );
    expect(result.status).toBe("overdue");
  });

  it("is due soon close to the km interval", () => {
    const [result] = getNextServices(
      { currentKm: 29500 },
      [oilChange],
      [{ serviceId: "oil-change", date: "2026-05-01", km: 15000 }],
      { now },
    );
    expect(result.status).toBe("due-soon");
  });
});
