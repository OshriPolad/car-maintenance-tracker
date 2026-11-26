# Auth module

Register, login, token refresh (with rotation) and logout for the API, with JWT access + refresh tokens.
Owner: Backend API & Auth (Roei). Swagger: http://localhost:3000/api/docs (tags `auth`, `users`).

## Endpoints

All paths start with `/api`. Request and response types are in `@cmt/shared` (`packages/shared/src/auth.ts`).

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/auth/register` | `RegisterRequest` `{ email, password }` | `201` `AuthTokens` | `400` invalid email or password not 8-72 chars, `409` email already registered |
| POST | `/auth/login` | `LoginRequest` `{ email, password }` | `200` `AuthTokens` | `401` "Invalid email or password" |
| POST | `/auth/refresh` | `RefreshRequest` `{ refreshToken }` | `200` `AuthTokens` (new pair, the old refresh token stops working) | `401` invalid, expired, already used or revoked refresh token |
| POST | `/auth/logout` | `LogoutRequest` `{ refreshToken }` | `204` (always) | - |
| GET | `/users/me` | - (header `Authorization: Bearer <accessToken>`) | `200` `MeResponse` | `401` missing, invalid or expired access token |

All `/auth/*` routes are rate limited to **10 requests per minute per IP** (`429` when exceeded).

`AuthTokens` is `{ accessToken, refreshToken }`:

| Token | Lifetime | Use |
|---|---|---|
| `accessToken` | 15 minutes | Send on every protected request: `Authorization: Bearer <accessToken>` |
| `refreshToken` | 7 days, **single use** | Send only to `POST /auth/refresh` when a request returns `401`. Replace it with the new one from the response. |

## Token flow

```
register / login  ──>  { accessToken, refreshToken }
        │
        ▼
GET /users/me  (Authorization: Bearer accessToken)  ──>  200
        │
        ▼  after 15 min: 401
POST /auth/refresh { refreshToken }  ──>  new { accessToken, refreshToken }   (old refresh token is now used up)
        │
        ▼  refresh also 401 (7 days passed, token already used/revoked, or user deleted)
send the user to the login page

logout: POST /auth/logout { refreshToken }  ──>  204, the whole session is revoked
```

### Rotation and stolen-token detection

Every refresh token is stored as a `RefreshToken` row (its id is the JWT `jti`) and works **once**.
`/auth/refresh` marks it as used and issues a new one in the same **family** (one family = one login).
If an already-used token is sent again, someone else has a copy of it, so the **whole family is revoked**:
the attacker and the user both have to log in again. Other logins (other devices) are not affected.

## Frontend usage (apps/web)

```ts
import type { AuthTokens, LoginRequest, MeResponse } from "@cmt/shared";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@cmt/shared";

async function login(body: LoginRequest): Promise<AuthTokens> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid email or password" : "Login failed");
  return res.json() as Promise<AuthTokens>;
}

async function getMe(accessToken: string): Promise<MeResponse> {
  const res = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED"); // try /auth/refresh, then login
  return res.json() as Promise<MeResponse>;
}
```

- Use `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` in the register form, so the form and the API use the same rules.
- Show the API's message on `401` as is. It never says whether the email or the password was wrong, on purpose.
- **Token storage rules (security):**
  - Keep the **access token in memory only** (React state / context). Never in `localStorage`.
  - Keep the refresh token in `sessionStorage` for now (cleared when the tab closes). `localStorage` can be read by any XSS bug, and a stolen refresh token gives 7 days of access. Moving it to an `httpOnly` cookie is planned (DevSecOps + Backend).
  - After every `/auth/refresh`, **replace both tokens** - the old refresh token no longer works.
  - Refresh **once at a time**: if several requests get `401` together, let one call `/auth/refresh` and the others wait for it. Two parallel refreshes with the same token make the second one fail.
  - On logout, call `POST /auth/logout` with the refresh token, then clear both tokens.

## Protecting a new route (apps/api)

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiBearerAuth() // shows the lock in Swagger
@UseGuards(JwtAuthGuard) // no valid access token -> 401
@Controller("vehicles")
export class VehiclesController {
  @Get()
  list(@CurrentUser() user: AuthUser) {
    // user = { id, role } from the access token. Always filter data by user.id.
  }
}
```

## Files

| File | What it does |
|---|---|
| `auth.controller.ts` | The 3 `/auth` routes, Swagger docs, rate limit guard |
| `auth.service.ts` | Hashing (bcrypt, 12 rounds), password check, issuing, verifying, rotating and revoking tokens |
| `refresh-tokens.service.ts` | Stores refresh tokens (`RefreshToken` table): create, consume (single use), revoke a family |
| `jwt.strategy.ts` | Validates `Authorization: Bearer` access tokens (passport-jwt, HS256 only) |
| `jwt-auth.guard.ts` | `@UseGuards(JwtAuthGuard)` to protect a route |
| `current-user.decorator.ts` | `@CurrentUser()` gives the route `{ id, role }` |
| `dto/` | Request validation (class-validator) and Swagger schemas |
| `../users/` | `UsersService` (DB access) and `GET /users/me` |

## Configuration

Set in `apps/api/.env` (see `.env.example`). Never commit real values.

| Variable | Notes |
|---|---|
| `JWT_ACCESS_SECRET` | Long random string (at least 32 characters) |
| `JWT_REFRESH_SECRET` | A different long random string |

Generate a secret (PowerShell):

```powershell
$b = New-Object byte[] 64; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

The API fails to start if a secret is missing.

## Security decisions

- Passwords are hashed with bcrypt (cost 12), never stored or logged in plain text. Max 72 characters because bcrypt ignores the rest.
- Emails are stored trimmed and lowercase, so `User@Example.com` and `user@example.com` are one account.
- Login failures always return the same message, and an unknown email still runs a bcrypt compare, so attackers cannot find out which emails are registered.
- Access and refresh tokens use different secrets and a `type` claim, so one can never be used as the other.
- `/users/me` returns an allow-list of fields (`UserResponseDto.fromUser`), so `passwordHash` or new DB columns never leak.
- Refresh tokens rotate (single use) and reuse revokes the whole session; logout revokes the session. Only the token id (`jti`) is stored, never the token.
- The API trusts exactly one proxy hop (`trust proxy` = 1 in `main.ts`), so on Render the rate limit counts the real client IP.

## Known limitations / accepted risks

- `POST /auth/register` returns `409` for an existing email, so someone can check whether an email is registered. Accepted for the MVP (normal for most sign-up forms, and rate limited); recorded in the threat model.
- Access tokens stay valid until they expire (max 15 minutes), even after logout. This is the normal trade-off of stateless access tokens.
- Old `RefreshToken` rows are not deleted yet. Follow-up: a cleanup job in the reminders worker (delete rows where `expiresAt` has passed).
- The refresh token is stored in the browser; moving it to an `httpOnly` cookie is a planned follow-up.

## Tests

```powershell
pnpm --filter @cmt/api test
```

- `auth.service.spec.ts`: register, login, refresh rotation, reuse detection, logout (unit, DB mocked)
- `auth.e2e-spec.ts`: full HTTP flow with Supertest (in-memory fake DB): register, me, login, refresh, single-use tokens, stolen-token detection, logout, 400/401/409/429
- `../users/*.spec.ts`: `UsersService`, and the guard on `GET /users/me`
