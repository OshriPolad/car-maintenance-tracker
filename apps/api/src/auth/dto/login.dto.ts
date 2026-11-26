import { PASSWORD_MAX_LENGTH, type LoginRequest } from "@cmt/shared";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // No MinLength here: login must not hint at the password rules.
  @ApiProperty({ example: "a-long-password" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
