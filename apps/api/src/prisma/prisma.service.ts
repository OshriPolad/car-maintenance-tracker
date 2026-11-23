import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client. Inject it in any service:
 *   constructor(private readonly prisma: PrismaService) {}
 * Prisma connects lazily on the first query, so the API can start even if the DB is down.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
