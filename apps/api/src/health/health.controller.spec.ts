import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthController", () => {
  async function createController(dbWorks: boolean) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: dbWorks
              ? jest.fn().mockResolvedValue([1])
              : jest.fn().mockRejectedValue(new Error("no db")),
          },
        },
      ],
    }).compile();
    return moduleRef.get(HealthController);
  }

  it("reports db up when the database answers", async () => {
    const controller = await createController(true);
    await expect(controller.check()).resolves.toMatchObject({ status: "ok", db: "up" });
  });

  it("reports db down but still responds when the database is unreachable", async () => {
    const controller = await createController(false);
    await expect(controller.check()).resolves.toMatchObject({ status: "ok", db: "down" });
  });
});
