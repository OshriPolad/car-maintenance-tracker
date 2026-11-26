import { Controller, Get, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: "Missing, invalid or expired access token" })
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOkResponse({ type: UserResponseDto, description: "The logged-in user" })
  async me(@CurrentUser() authUser: AuthUser): Promise<UserResponseDto> {
    const user = await this.users.findById(authUser.id);
    // The token is valid but the user was deleted since it was issued.
    if (!user) {
      throw new UnauthorizedException();
    }
    return UserResponseDto.fromUser(user);
  }
}
