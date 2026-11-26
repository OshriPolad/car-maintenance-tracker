import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import type { User } from "@prisma/client";
import request from "supertest";
import type { JwtPayload } from "../auth/auth.service";
import { JwtStrategy } from "../auth/jwt.strategy";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/**
 * Runs GET /users/me through a real HTTP request (Supertest), so the real
 * JwtAuthGuard + JwtStrategy are tested. Only the database (UsersService) is mocked.
 */
describe("UsersController (GET /users/me)", () => {
  let app: INestApplication;
  const jwt = new JwtService();
  // Test-only secrets - never real values.
  const ACCESS_SECRET = "test-access-secret";
  const REFRESH_SECRET = "test-refresh-secret";
  const usersMock = { findById: jest.fn() };

  const user: User = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "user@example.com",
    passwordHash: "hashed-password",
    role: "PRIVATE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [UsersController],
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersMock },
        { provide: ConfigService, useValue: { getOrThrow: () => ACCESS_SECRET } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usersMock.findById.mockReset();
  });

  function token(type: JwtPayload["type"], secret: string, expiresIn = 60): string {
    return jwt.sign({ sub: user.id, role: user.role, type } satisfies JwtPayload, {
      secret,
      expiresIn,
    });
  }

  it("returns the user without passwordHash for a valid access token", async () => {
    usersMock.findById.mockResolvedValue(user);

    const res = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("access", ACCESS_SECRET)}`)
      .expect(200);

    expect(res.body).toEqual({
      id: user.id,
      email: user.email,
      role: "PRIVATE",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(usersMock.findById).toHaveBeenCalledWith(user.id);
  });

  it("returns 401 without a token", async () => {
    await request(app.getHttpServer()).get("/users/me").expect(401);
    expect(usersMock.findById).not.toHaveBeenCalled();
  });

  it("returns 401 for a token signed with another secret", async () => {
    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("access", "some-other-secret")}`)
      .expect(401);
  });

  it("returns 401 for an expired access token", async () => {
    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("access", ACCESS_SECRET, -10)}`)
      .expect(401);
  });

  it("returns 401 for a refresh token used as an access token", async () => {
    // Even if both secrets were (wrongly) set to the same value, the "type" claim blocks it.
    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("refresh", ACCESS_SECRET)}`)
      .expect(401);
    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("refresh", REFRESH_SECRET)}`)
      .expect(401);
  });

  it("returns 401 when the user was deleted after the token was issued", async () => {
    usersMock.findById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${token("access", ACCESS_SECRET)}`)
      .expect(401);
  });
});
