import {
  FuelType,
  PrismaClient,
  ReminderStatus,
  ReminderType,
  Role,
  VehicleType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Test user
  const user = await prisma.user.upsert({
    where: { email: "test@cmt.local" },
    update: {},
    create: {
      email: "test@cmt.local",
      passwordHash,
      role: Role.PRIVATE,
    },
  });

  // 2. Sample service templates (placeholder dev seed until manual JSON files are loaded)
  await prisma.serviceTemplate.upsert({
    where: {
      make_model_yearFrom_yearTo_fuelType_serviceKey: {
        make: "Toyota",
        model: "Corolla Hybrid",
        yearFrom: 2019,
        yearTo: 2024,
        fuelType: FuelType.HYBRID,
        serviceKey: "oil-change",
      },
    },
    update: {},
    create: {
      make: "Toyota",
      model: "Corolla Hybrid",
      yearFrom: 2019,
      yearTo: 2024,
      fuelType: FuelType.HYBRID,
      serviceKey: "oil-change",
      name: "החלפת שמן מנוע ומסנן שמן",
      intervalKm: 15000,
      intervalMonths: 12,
      firstAtKm: null,
      actions: ["ריקון שמן מנוע", "החלפת מסנן שמן", "מילוי שמן חדש", "בדיקת דליפות"],
      parts: [
        { name: "שמן מנוע", partNumber: "", quantity: 4.2, spec: "0W-20" },
        { name: "מסנן שמן", partNumber: "", quantity: 1, spec: "" },
      ],
      costMin: 450,
      costMax: 700,
      source: "DEV SEED PLACEHOLDER - replace with verified manual data",
    },
  });

  await prisma.serviceTemplate.upsert({
    where: {
      make_model_yearFrom_yearTo_fuelType_serviceKey: {
        make: "Yamaha",
        model: "NMAX 125",
        yearFrom: 2020,
        yearTo: 2024,
        fuelType: FuelType.PETROL,
        serviceKey: "oil-change",
      },
    },
    update: {},
    create: {
      make: "Yamaha",
      model: "NMAX 125",
      yearFrom: 2020,
      yearTo: 2024,
      fuelType: FuelType.PETROL,
      serviceKey: "oil-change",
      name: "החלפת שמן מנוע",
      intervalKm: 6000,
      intervalMonths: 12,
      firstAtKm: 1000,
      actions: ["ריקון שמן מנוע", "ניקוי מסנן רשת", "מילוי שמן 10W-40"],
      parts: [{ name: "שמן מנוע קטנוע", partNumber: "", quantity: 0.9, spec: "10W-40 JASO MB" }],
      costMin: 200,
      costMax: 350,
      source: "DEV SEED PLACEHOLDER - replace with verified manual data",
    },
  });

  // 3. Two test vehicles
  const corolla = await prisma.vehicle.upsert({
    where: {
      userId_plate: {
        userId: user.id,
        plate: "12345678",
      },
    },
    update: {},
    create: {
      userId: user.id,
      plate: "12345678",
      make: "Toyota",
      model: "Corolla Hybrid",
      year: 2021,
      vehicleType: VehicleType.CAR,
      fuelType: FuelType.HYBRID,
      currentKm: 42500,
      kmUpdatedAt: new Date("2026-11-20T10:00:00.000Z"),
    },
  });

  const nmax = await prisma.vehicle.upsert({
    where: {
      userId_plate: {
        userId: user.id,
        plate: "9876543",
      },
    },
    update: {},
    create: {
      userId: user.id,
      plate: "9876543",
      make: "Yamaha",
      model: "NMAX 125",
      year: 2022,
      vehicleType: VehicleType.MOTORCYCLE,
      fuelType: FuelType.PETROL,
      currentKm: 11200,
      kmUpdatedAt: new Date("2026-11-20T10:00:00.000Z"),
    },
  });

  // 4. Service records (only insert if vehicle has none yet so seed stays idempotent)
  const existingCorollaRecords = await prisma.serviceRecord.count({
    where: { vehicleId: corolla.id },
  });

  if (existingCorollaRecords === 0) {
    await prisma.serviceRecord.createMany({
      data: [
        {
          vehicleId: corolla.id,
          serviceKey: "oil-change",
          date: new Date("2025-05-10T08:00:00.000Z"),
          km: 15000,
          cost: 550,
          notes: "טיפול 15,000 ראשון",
        },
        {
          vehicleId: corolla.id,
          serviceKey: "oil-change",
          date: new Date("2026-03-15T08:00:00.000Z"),
          km: 30000,
          cost: 620,
          notes: "טיפול 30,000 + בדיקת בלמים",
        },
      ],
    });
  }

  const existingNmaxRecords = await prisma.serviceRecord.count({
    where: { vehicleId: nmax.id },
  });

  if (existingNmaxRecords === 0) {
    await prisma.serviceRecord.create({
      data: {
        vehicleId: nmax.id,
        serviceKey: "oil-change",
        date: new Date("2026-06-01T09:00:00.000Z"),
        km: 6000,
        cost: 260,
        notes: "טיפול 6,000 ק״מ",
      },
    });
  }

  // 5. Sample reminders
  const existingReminders = await prisma.reminder.count({
    where: { vehicleId: corolla.id },
  });

  if (existingReminders === 0) {
    await prisma.reminder.createMany({
      data: [
        {
          vehicleId: corolla.id,
          type: ReminderType.SERVICE,
          dueDate: new Date("2027-03-15T08:00:00.000Z"),
          dueKm: 45000,
          status: ReminderStatus.PENDING,
        },
        {
          vehicleId: nmax.id,
          type: ReminderType.SERVICE,
          dueDate: new Date("2027-06-01T09:00:00.000Z"),
          dueKm: 12000,
          status: ReminderStatus.PENDING,
        },
      ],
    });
  }

  console.log("Seed completed:", { user: user.email, vehicles: [corolla.plate, nmax.plate] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
