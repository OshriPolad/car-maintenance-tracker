import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import { Prisma, type User } from "@prisma/client";
import request from "supertest";
import { PrismaService } from "../prisma/prisma.service";
import { UsersController } from "../users/users.controller";
import { UsersService } from "../users/users.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

// Test-only secrets - never real values.
const TEST_SECRETS: Record<string, string> = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
};

/** A tiny in-memory stand-in for the users table, so these tests need no database. */
function createFakePrisma() {
  const users = new Map<string, User>();
  let nextId = 1;
  return {
    user: {
      findUnique: ({ where }: { where: { id?: string; email?: string } }) =>
        Promise.resolve(
          [...users.values()].find((u) => u.id === where.id || u.email === where.email) ?? null,
        ),
      create: ({ data }: { data: Pick<User, "email" | "passwordHash"> }) => {
        if ([...users.values()].some((u) => u.email === data.email)) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
              code: "P2002",
              clientVersion: "test",
            }),
          );
        }
        const now = new Date();
        const user: User = {
          id: `00000000-0000-0000-0000-${String(nextId++).padStart(12, "0")}`,
          email: data.email,
          passwordHash: data.passwordHash,
          role: "PRIVATE",
          createdAt: now,
          updatedAt: now,
        };
        users.set(user.id, user);
        return Promise.resolve(user);
      },
    },
  };
}

/**
 * Builds the auth + users HTTP layer like the real app (same ValidationPipe), with real
 * AuthService, UsersService, bcrypt, JWT and guards. Only the database is faked.
 */
async function createApp(rateLimit: number): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      PassportModule,
      JwtModule.register({}),
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: rateLimit }]),
    ],
    controllers: [AuthController, UsersController],
    providers: [
      AuthService,
      UsersService,
      JwtStrategy,
      { provide: PrismaService, useValue: createFakePrisma() },
      { provide: ConfigService, useValue: { getOrThrow: (key: string) => TEST_SECRETS[key] } },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe("Auth API (e2e, fake database)", () => {
  let app: INestApplication;
  const credentials = { email: "user@example.com", password: "a-long-password" };

  beforeAll(async () => {
    app = await createApp(100);
  });

  afterAll(async () => {
    await app.close();
  });

  it("register -> /users/me -> login -> refresh -> /users/me", async () => {
    const server = app.getHttpServer();

    const registered = await request(server).post("/auth/register").send(credentials).expect(201);
    expect(registered.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const me = await request(server)
      .get("/users/me")
      .set("Authorization", `Bearer ${registered.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email: credentials.email, role: "PRIVATE" });
    expect(me.body).not.toHaveProperty("passwordHash");

    // Login is case-insensitive on the email.
    const loggedIn = await request(server)
      .post("/auth/login")
      .send({ ...credentials, email: "User@Example.com" })
      .expect(200);

    const refreshed = await request(server)
      .post("/auth/refresh")
      .send({ refreshToken: loggedIn.body.refreshToken })
      .expect(200);

    await request(server)
      .get("/users/me")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
  });

  it("returns 409 when the email is already registered", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "taken@example.com", password: "a-long-password" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "Taken@Example.com", password: "another-password" })
      .expect(409);
  });

  it("returns 400 for an invalid email or a short password", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "not-an-email", password: "a-long-password" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "new@example.com", password: "short" })
      .expect(400);
  });

  it("gives the same 401 message for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: credentials.email, password: "wrong-password" })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "a-long-password" })
      .expect(401);

    expect(wrongPassword.body.message).toBe("Invalid email or password");
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it("rejects an access token sent to /auth/refresh", async () => {
    const loggedIn = await request(app.getHttpServer())
      .post("/auth/login")
      .send(credentials)
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: loggedIn.body.accessToken })
      .expect(401);
  });
});

describe("Auth API rate limit (e2e)", () => {
  it("returns 429 after too many requests", async () => {
    const app = await createApp(3);
    const login = () =>
      request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "nobody@example.com", password: "a-long-password" });

    for (let i = 0; i < 3; i++) {
      await login().expect(401);
    }
    await login().expect(429);
    await app.close();
  });
});
