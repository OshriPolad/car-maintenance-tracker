import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { RefreshToken, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { AuthService, BCRYPT_ROUNDS, type JwtPayload } from "./auth.service";
import { RefreshTokensService } from "./refresh-tokens.service";

// bcrypt is mocked so tests are fast and do not depend on real hashing.
jest.mock("bcrypt");
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

// Test-only secrets - never real values.
const TEST_SECRETS: Record<string, string> = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
};

describe("AuthService", () => {
  let service: AuthService;
  const jwt = new JwtService();
  const usersMock = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };
  const tokensMock = {
    create: jest.fn(),
    findById: jest.fn(),
    consume: jest.fn(),
    revokeFamily: jest.fn(),
  };

  const user: User = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "user@example.com",
    passwordHash: "hashed-password",
    role: "PRIVATE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
        { provide: RefreshTokensService, useValue: tokensMock },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => TEST_SECRETS[key] },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    // Every issued refresh token gets a stored row; its id becomes the JWT "jti".
    tokensMock.create.mockImplementation((userId: string, familyId: string, expiresAt: Date) =>
      Promise.resolve(storedToken({ userId, familyId, expiresAt })),
    );
  });

  let nextTokenId = 1;
  function storedToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
    return {
      id: `token-${nextTokenId++}`,
      userId: user.id,
      familyId: "family-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function decode(token: string, secret: string): Promise<JwtPayload> {
    return jwt.verifyAsync<JwtPayload>(token, { secret });
  }

  describe("register", () => {
    it("hashes the password, creates the user and returns valid tokens", async () => {
      (bcryptMock.hash as jest.Mock).mockResolvedValue("hashed-password");
      usersMock.create.mockResolvedValue(user);

      const tokens = await service.register({
        email: "user@example.com",
        password: "a-long-password",
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith("a-long-password", BCRYPT_ROUNDS);
      expect(usersMock.create).toHaveBeenCalledWith({
        email: "user@example.com",
        passwordHash: "hashed-password",
      });
      await expect(decode(tokens.accessToken, "test-access-secret")).resolves.toMatchObject({
        sub: user.id,
        role: "PRIVATE",
        type: "access",
      });
      await expect(decode(tokens.refreshToken, "test-refresh-secret")).resolves.toMatchObject({
        sub: user.id,
        type: "refresh",
      });
    });

    it("passes on 409 when the email is already registered", async () => {
      (bcryptMock.hash as jest.Mock).mockResolvedValue("hashed-password");
      usersMock.create.mockRejectedValue(new ConflictException());

      await expect(
        service.register({ email: "user@example.com", password: "a-long-password" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("returns tokens for the right email and password", async () => {
      usersMock.findByEmail.mockResolvedValue(user);
      (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

      const tokens = await service.login({ email: user.email, password: "a-long-password" });

      expect(bcryptMock.compare).toHaveBeenCalledWith("a-long-password", "hashed-password");
      await expect(decode(tokens.accessToken, "test-access-secret")).resolves.toMatchObject({
        sub: user.id,
      });
    });

    it("throws 401 for a wrong password", async () => {
      usersMock.findByEmail.mockResolvedValue(user);
      (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: user.email, password: "wrong-password" }),
      ).rejects.toThrow(new UnauthorizedException("Invalid email or password"));
    });

    it("throws the same 401 for an unknown email, and still runs bcrypt (same timing)", async () => {
      usersMock.findByEmail.mockResolvedValue(null);
      (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "missing@example.com", password: "a-long-password" }),
      ).rejects.toThrow(new UnauthorizedException("Invalid email or password"));
      expect(bcryptMock.compare).toHaveBeenCalledTimes(1);
    });
  });

  describe("refresh", () => {
    async function sign(
      payload: JwtPayload,
      secret: string,
      { expiresIn = 60, jwtid }: { expiresIn?: number; jwtid?: string } = {},
    ): Promise<string> {
      return jwt.signAsync(payload, { secret, expiresIn, ...(jwtid ? { jwtid } : {}) });
    }
    const refreshPayload: JwtPayload = { sub: user.id, role: "PRIVATE", type: "refresh" };

    it("rotates: consumes the old token and returns a new pair in the same family", async () => {
      const stored = storedToken({ id: "old-token", familyId: "family-9" });
      tokensMock.findById.mockResolvedValue(stored);
      tokensMock.consume.mockResolvedValue(true);
      usersMock.findById.mockResolvedValue(user);
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "old-token" });

      const tokens = await service.refresh(token);

      expect(tokensMock.consume).toHaveBeenCalledWith("old-token");
      expect(tokensMock.create).toHaveBeenCalledWith(user.id, "family-9", expect.any(Date));
      const newRefresh = await decode(tokens.refreshToken, "test-refresh-secret");
      expect(newRefresh.jti).toBeDefined();
      expect(newRefresh.jti).not.toBe("old-token");
      await expect(decode(tokens.accessToken, "test-access-secret")).resolves.toMatchObject({
        sub: user.id,
        type: "access",
      });
    });

    it("detects reuse of an already-used token and revokes the whole family", async () => {
      tokensMock.findById.mockResolvedValue(
        storedToken({ id: "used-token", familyId: "family-7", revokedAt: new Date() }),
      );
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "used-token" });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
      expect(tokensMock.revokeFamily).toHaveBeenCalledWith("family-7");
      expect(tokensMock.create).not.toHaveBeenCalled();
    });

    it("rejects when another request used the token at the same moment", async () => {
      tokensMock.findById.mockResolvedValue(storedToken({ id: "racing-token" }));
      tokensMock.consume.mockResolvedValue(false);
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "racing-token" });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
      expect(tokensMock.create).not.toHaveBeenCalled();
    });

    it("rejects a token that is not in the database", async () => {
      tokensMock.findById.mockResolvedValue(null);
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "unknown" });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a token whose stored owner is a different user", async () => {
      tokensMock.findById.mockResolvedValue(storedToken({ id: "t", userId: "someone-else" }));
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "t" });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a refresh token without a jti (issued before rotation existed)", async () => {
      const token = await sign(refreshPayload, "test-refresh-secret");

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
      expect(tokensMock.findById).not.toHaveBeenCalled();
    });

    it("rejects an access token used as a refresh token", async () => {
      const accessToken = await sign(
        { sub: user.id, role: "PRIVATE", type: "access" },
        "test-access-secret",
      );

      await expect(service.refresh(accessToken)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a token signed with the right secret but marked as access", async () => {
      const token = await sign(
        { sub: user.id, role: "PRIVATE", type: "access" },
        "test-refresh-secret",
        { jwtid: "t" },
      );

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an expired refresh token", async () => {
      const token = await sign(refreshPayload, "test-refresh-secret", {
        expiresIn: -10,
        jwtid: "t",
      });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a refresh token of a user that no longer exists", async () => {
      tokensMock.findById.mockResolvedValue(storedToken({ id: "t" }));
      tokensMock.consume.mockResolvedValue(true);
      usersMock.findById.mockResolvedValue(null);
      const token = await sign(refreshPayload, "test-refresh-secret", { jwtid: "t" });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("revokes the family of a valid refresh token", async () => {
      tokensMock.findById.mockResolvedValue(storedToken({ id: "t", familyId: "family-3" }));
      const token = await jwt.signAsync(
        { sub: user.id, role: "PRIVATE", type: "refresh" } satisfies JwtPayload,
        { secret: "test-refresh-secret", expiresIn: 60, jwtid: "t" },
      );

      await service.logout(token);

      expect(tokensMock.revokeFamily).toHaveBeenCalledWith("family-3");
    });

    it("does nothing and does not throw for an invalid token", async () => {
      await expect(service.logout("not-a-real-token")).resolves.toBeUndefined();
      expect(tokensMock.revokeFamily).not.toHaveBeenCalled();
    });
  });
});
