import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateUserInput {
  email: string;
  /** Already hashed (bcrypt). UsersService never sees or stores plain passwords. */
  passwordHash: string;
  role?: Role;
}

/**
 * Data access for users. Used by AuthModule (register / login) and by GET /api/users/me.
 * Returns the full Prisma User, including passwordHash - never send it to the client as is.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emails are stored trimmed and lowercase, so "A@x.com" and "a@x.com" are the same account. */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: UsersService.normalizeEmail(email) },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: UsersService.normalizeEmail(input.email),
          passwordHash: input.passwordHash,
          role: input.role,
        },
      });
    } catch (error) {
      // P2002 = unique constraint failed (the email is already registered).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Email is already registered");
      }
      throw error;
    }
  }
}
