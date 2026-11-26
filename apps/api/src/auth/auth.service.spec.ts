import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { AuthService, BCRYPT_ROUNDS, type JwtPayload } from "./auth.service";

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
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => TEST_SECRETS[key] },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

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
    async function sign(payload: JwtPayload, secret: string, expiresIn = 60): Promise<string> {
      return jwt.signAsync(payload, { secret, expiresIn });
    }

    it("returns a new token pair for a valid refresh token", async () => {
      usersMock.findById.mockResolvedValue(user);
      const token = await sign(
        { sub: user.id, role: "PRIVATE", type: "refresh" },
        "test-refresh-secret",
      );

      const tokens = await service.refresh(token);

      expect(usersMock.findById).toHaveBeenCalledWith(user.id);
      await expect(decode(tokens.accessToken, "test-access-secret")).resolves.toMatchObject({
        sub: user.id,
        type: "access",
      });
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
      );

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an expired refresh token", async () => {
      const token = await sign(
        { sub: user.id, role: "PRIVATE", type: "refresh" },
        "test-refresh-secret",
        -10,
      );

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a refresh token of a user that no longer exists", async () => {
      usersMock.findById.mockResolvedValue(null);
      const token = await sign(
        { sub: user.id, role: "PRIVATE", type: "refresh" },
        "test-refresh-secret",
      );

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });
  });
});
