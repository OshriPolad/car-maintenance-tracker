import type { Role } from "@prisma/client";

/** What JwtStrategy puts on request.user for a valid access token. */
export interface AuthUser {
  id: string;
  role: Role;
}
