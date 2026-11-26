import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import type { AuthTokensDto } from "./dto/auth-tokens.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { RefreshTokensService } from "./refresh-tokens.service";

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
const INVALID_REFRESH_TOKEN = "Invalid refresh token";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  type: "access" | "refresh";
  /** Refresh tokens only: id of the RefreshToken row (set through the "jwtid" sign option). */
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokensService,
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

  /**
   * Rotation: every refresh token works once. It is exchanged for a new pair in the same family.
   * Reuse detection: if an already-used token comes back, it was probably stolen, so the whole
   * family (that login session) is revoked and both the attacker and the user must log in again.
   */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const stored = await this.refreshTokens.findById(payload.jti);
    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    if (stored.revokedAt) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    if (!(await this.refreshTokens.consume(stored.id))) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // The user may have been deleted since the token was issued.
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    return this.issueTokens(user, stored.familyId);
  }

  /**
   * Revokes the login session of this refresh token. Always succeeds (idempotent),
   * so the response never tells an attacker whether a token was valid.
   */
  async logout(refreshToken: string): Promise<void> {
    let payload: Required<JwtPayload>;
    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }
    const stored = await this.refreshTokens.findById(payload.jti);
    if (stored && stored.userId === payload.sub) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }
  }

  /** Checks signature, expiry, token type and the jti claim. Throws 401 otherwise. */
  private async verifyRefreshToken(token: string): Promise<Required<JwtPayload>> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        algorithms: ["HS256"],
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    if (payload.type !== "refresh" || !payload.jti) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    return payload as Required<JwtPayload>;
  }

  /** Signs a new access + refresh pair and stores the refresh token (new family = new login). */
  private async issueTokens(user: User, familyId: string = randomUUID()): Promise<AuthTokensDto> {
    const stored = await this.refreshTokens.create(
      user.id,
      familyId,
      new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    );
    const base = { sub: user.id, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, type: "access" } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        algorithm: "HS256",
      }),
      this.jwt.signAsync({ ...base, type: "refresh" } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        algorithm: "HS256",
        jwtid: stored.id,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
