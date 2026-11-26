import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  // Mock data only - no real users.
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
      providers: [UsersService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe("findByEmail", () => {
    it("looks up the normalized (trimmed, lowercase) email", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(service.findByEmail("  User@Example.COM ")).resolves.toBe(user);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });
    });

    it("returns null when no user has this email", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail("missing@example.com")).resolves.toBeNull();
    });
  });

  describe("findById", () => {
    it("looks up the user by id", async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(service.findById(user.id)).resolves.toBe(user);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
    });
  });

  describe("create", () => {
    it("stores the normalized email and the given hash", async () => {
      prismaMock.user.create.mockResolvedValue(user);

      await expect(
        service.create({ email: "User@Example.com", passwordHash: "hashed-password" }),
      ).resolves.toBe(user);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { email: "user@example.com", passwordHash: "hashed-password", role: undefined },
      });
    });

    it("throws 409 Conflict when the email is already registered", async () => {
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      await expect(
        service.create({ email: "user@example.com", passwordHash: "hashed-password" }),
      ).rejects.toThrow(ConflictException);
    });

    it("rethrows any other database error", async () => {
      prismaMock.user.create.mockRejectedValue(new Error("db down"));

      await expect(
        service.create({ email: "user@example.com", passwordHash: "hashed-password" }),
      ).rejects.toThrow("db down");
    });
  });
});
