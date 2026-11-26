import type { AuthTokens } from "@cmt/shared";
import { ApiProperty } from "@nestjs/swagger";

/** Response body of register, login and refresh. */
export class AuthTokensDto implements AuthTokens {
  @ApiProperty({
    description: "Short-lived token (15 min). Send as: Authorization: Bearer <token>",
  })
  accessToken!: string;

  @ApiProperty({ description: "Long-lived token (7 days). Send to POST /api/auth/refresh" })
  refreshToken!: string;
}
