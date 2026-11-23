import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@cmt/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    let db: HealthResponse["db"] = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return { status: "ok", db, timestamp: new Date().toISOString() };
  }
}
