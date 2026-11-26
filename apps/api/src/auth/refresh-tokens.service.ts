import { Injectable } from "@nestjs/common";
import type { RefreshToken } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Stores issued refresh tokens so they can be rotated and revoked.
 * The row id is the refresh JWT's "jti" claim. The token itself is never stored.
 */
@Injectable()
export class RefreshTokensService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, familyId: string, expiresAt: Date): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: { userId, familyId, expiresAt } });
  }

  findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  /**
   * Marks a token as used. Returns false if it was already used - for example two requests
   * racing with the same token - so only one of them gets a new token pair.
   */
  async consume(id: string): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count === 1;
  }

  /** Revokes every token from the same login (logout, or a stolen token was detected). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
