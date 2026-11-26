// Auth API contract, shared by apps/api (DTOs) and apps/web (forms + API calls).
// Owner: Backend API & Auth (Roei). Must match the endpoints in apps/api/src/auth.

import type { User } from "./types";

/** Password rules. bcrypt ignores bytes after 72, so longer passwords are rejected. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** POST /api/auth/register - 201 AuthTokens, 400 invalid input, 409 email already registered. */
export interface RegisterRequest {
  email: string;
  password: string;
}

/** POST /api/auth/login - 200 AuthTokens, 401 invalid email or password. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/auth/refresh - 200 AuthTokens, 401 invalid, expired, already used or revoked token.
 * Rotation: each refresh token works ONCE - always replace the stored one with the new pair.
 */
export interface RefreshRequest {
  refreshToken: string;
}

/** POST /api/auth/logout - always 204. Revokes the session of this refresh token. */
export type LogoutRequest = RefreshRequest;

/**
 * Returned by register, login and refresh.
 * accessToken: 15 min, send as "Authorization: Bearer <accessToken>".
 * refreshToken: 7 days, send to POST /api/auth/refresh when the access token expires (401).
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** GET /api/users/me (requires Authorization header) - 200 the logged-in user, 401 otherwise. */
export type MeResponse = User;
