import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "./auth.service";
import type { AuthUser } from "./auth-user";

/**
 * Checks the "Authorization: Bearer <accessToken>" header.
 * passport-jwt verifies the signature and expiry; validate() runs only for a valid token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      algorithms: ["HS256"],
    });
  }

  /** The return value becomes request.user. */
  validate(payload: JwtPayload): AuthUser {
    // A refresh token must never work as an access token.
    if (payload.type !== "access") {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, role: payload.role };
  }
}
