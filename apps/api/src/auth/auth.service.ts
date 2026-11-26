import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import type { AuthTokensDto } from "./dto/auth-tokens.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

/** bcrypt cost factor. 12 is a common default: slow for attackers, ~250ms for us. */
export const BCRYPT_ROUNDS = 12;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * A valid bcrypt hash of a random string. When the email does not exist we still compare
 * against it, so "unknown email" and "wrong password" take the same time to answer.
 */
const DUMMY_PASSWORD_HASH = "$2b$12$2JQhunGdUy7SdCNfKBPnqeKjIHwJTJ0oysyLlBszYI7GxaN8rQzua";

/** Same message for every login failure - never reveal whether the email or the password was wrong. */
const INVALID_CREDENTIALS = "Invalid email or password";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  type: "access" | "refresh";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Creates the user and logs them in. Throws 409 if the email is already registered. */
  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({ email: dto.email, passwordHash });
    return this.issueTokens(user);
  }

  /** Throws 401 with the same message for an unknown email and for a wrong password. */
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(dto.email);
    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordOk) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueTokens(user);
  }

  /** Returns a new token pair for a valid, unexpired refresh token. */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // The user may have been deleted since the token was issued.
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const base = { sub: user.id, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, type: "access" } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      }),
      this.jwt.signAsync({ ...base, type: "refresh" } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
