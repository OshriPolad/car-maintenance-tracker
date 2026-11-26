import type { RefreshRequest } from "@cmt/shared";
import { ApiProperty } from "@nestjs/swagger";
import { IsJWT } from "class-validator";

export class RefreshDto implements RefreshRequest {
  @ApiProperty({ description: "The refresh token returned by register / login" })
  @IsJWT()
  refreshToken!: string;
}
