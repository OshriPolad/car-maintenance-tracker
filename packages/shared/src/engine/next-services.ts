// Service engine: given a vehicle, its service template and its history,
// calculate when each service is due. Pure function: no I/O, no framework code.
// Owner: Database & Service Engine (Ilay). This is a starting point - extend it with tests.

import type { NextService, ServiceRecord, ServiceTemplateItem, Vehicle } from "../types";

export interface EngineOptions {
  /** Reference date ("today"). Injected so the function stays testable. */
  now: Date;
  /** How close (in km) counts as "due soon". */
  dueSoonKm?: number;
  /** How close (in days) counts as "due soon". */
  dueSoonDays?: number;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getNextServices(
  vehicle: Pick<Vehicle, "currentKm">,
  template: ServiceTemplateItem[],
  history: ServiceRecord[],
  { now, dueSoonKm = 1000, dueSoonDays = 30 }: EngineOptions,
): NextService[] {
  return template
    .map((item) => {
      const last = history.filter((r) => r.serviceKey === item.id).sort((a, b) => b.km - a.km)[0];

      const baseKm = last ? last.km : 0;
      const dueAtKm =
        item.intervalKm === null
          ? null
          : !last && item.firstAtKm
            ? item.firstAtKm
            : baseKm + item.intervalKm;

      const dueAtDate =
        item.intervalMonths !== null && last
          ? addMonths(new Date(last.date), item.intervalMonths)
          : null;

      const kmLeft = dueAtKm === null ? Infinity : dueAtKm - vehicle.currentKm;
      const daysLeft =
        dueAtDate === null ? Infinity : (dueAtDate.getTime() - now.getTime()) / 86_400_000;

      const status: NextService["status"] =
        kmLeft <= 0 || daysLeft <= 0
          ? "overdue"
          : kmLeft <= dueSoonKm || daysLeft <= dueSoonDays
            ? "due-soon"
            : "ok";

      return {
        item,
        dueAtKm,
        dueAtDate: dueAtDate ? dueAtDate.toISOString().slice(0, 10) : null,
        status,
      };
    })
    .sort((a, b) => {
      const rank = { overdue: 0, "due-soon": 1, ok: 2 } as const;
      return rank[a.status] - rank[b.status];
    });
}
