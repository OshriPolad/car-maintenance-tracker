# Auth module

Register, login and token refresh for the API, with JWT access + refresh tokens.
Owner: Backend API & Auth (Roei). Swagger: http://localhost:3000/api/docs (tags `auth`, `users`).

## Endpoints

All paths start with `/api`. Request and response types are in `@cmt/shared` (`packages/shared/src/auth.ts`).

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/auth/register` | `RegisterRequest` `{ email, password }` | `201` `AuthTokens` | `400` invalid email or password not 8-72 chars, `409` email already registered |
| POST | `/auth/login` | `LoginRequest` `{ email, password }` | `200` `AuthTokens` | `401` "Invalid email or password" |
| POST | `/auth/refresh` | `RefreshRequest` `{ refreshToken }` | `200` `AuthTokens` (new pair) | `401` invalid or expired refresh token |
| GET | `/users/me` | - (header `Authorization: Bearer <accessToken>`) | `200` `MeResponse` | `401` missing, invalid or expired access token |

All `/auth/*` routes are rate limited to **10 requests per minute per IP** (`429` when exceeded).

`AuthTokens` is `{ accessToken, refreshToken }`:

| Token | Lifetime | Use |
|---|---|---|
| `accessToken` | 15 minutes | Send on every protected request: `Authorization: Bearer <accessToken>` |
| `refreshToken` | 7 days | Send only to `POST /auth/refresh` when a request returns `401` |

## Token flow

```
register / login  ──>  { accessToken, refreshToken }
        │
        ▼
GET /users/me  (Authorization: Bearer accessToken)  ──>  200
        │
        ▼  after 15 min: 401
POST /auth/refresh { refreshToken }  ──>  new { accessToken, refreshToken }
        │
        ▼  refresh also 401 (7 days passed, or user deleted)
send the user to the login page
```

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
- Token storage: keep the access token in memory (for example React state or context). Anything in `localStorage` can be read by an XSS attack, so avoid storing tokens there if possible. Moving the refresh token to an `httpOnly` cookie is a possible follow-up (coordinate with Backend).

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
| `auth.service.ts` | Hashing (bcrypt, 12 rounds), password check, issuing and verifying tokens |
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

## Known limitations

- Refresh tokens are stateless: there is no logout or revocation yet. Needs a DB table (coordinate with Database).
- Rate limiting uses the client IP. Behind Render's proxy, `trust proxy` must be configured (coordinate with DevSecOps).

## Tests

```powershell
pnpm --filter @cmt/api test
```

- `auth.service.spec.ts`: register, login, refresh (unit, DB mocked)
- `auth.e2e-spec.ts`: full HTTP flow with Supertest (in-memory fake DB): register, me, login, refresh, 400/401/409/429
- `../users/*.spec.ts`: `UsersService`, and the guard on `GET /users/me`
