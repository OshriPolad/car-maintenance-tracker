import type { MeResponse } from "@cmt/shared";
import { ApiProperty } from "@nestjs/swagger";
import { Role, type User } from "@prisma/client";

/** The user as the client sees it (shared type: MeResponse). Never includes passwordHash. */
export class UserResponseDto implements MeResponse {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.PRIVATE })
  role!: Role;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  /** Copies only the allowed fields (an allow-list), so new DB columns never leak by accident. */
  static fromUser(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
