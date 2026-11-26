import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, type RegisterRequest } from "@cmt/shared";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto implements RegisterRequest {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // bcrypt only uses the first 72 bytes of a password, so longer ones are rejected.
  @ApiProperty({
    example: "a-long-password",
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
