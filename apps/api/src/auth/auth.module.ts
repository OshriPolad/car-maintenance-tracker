import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { RefreshTokensService } from "./refresh-tokens.service";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Secrets and expiry are passed per token in AuthService (access and refresh use different secrets).
    JwtModule.register({}),
    // Max 10 requests per minute per IP on the auth endpoints.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  // JwtStrategy registers the "jwt" strategy that JwtAuthGuard uses in any module.
  providers: [AuthService, RefreshTokensService, JwtStrategy],
})
export class AuthModule {}
