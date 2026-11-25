# Contributing

## Workflow
1. Every task starts as a GitHub issue, assigned to its owner.
2. `git checkout main && git pull`, then create a branch: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>` or `data/<short-name>`.
3. Small commits with clear messages.
4. Before pushing, run `pnpm lint`, `pnpm test` and `pnpm typecheck`.
5. Push and open a pull request. Write `Closes #<issue>` in the description.
6. CI must pass and Oshri must approve before merging (**Squash and merge**).
7. Post a short update in the WhatsApp group so everyone knows to `git pull`.

## Ownership
| Area | Owner | Folders |
|---|---|---|
| Frontend | Lior | `apps/web` |
| Backend API & Auth | Roei | `apps/api/src` (modules, auth) |
| Database & Service Engine | Ilay | `apps/api/prisma`, `packages/shared`, `data/` |
| Integrations & Reminders | Daniel | `apps/api/src/integrations`, `apps/api/src/reminders` |
| DevSecOps & team lead (CI/CD, deployment, security, QA, reviews) | Oshri | `docker-compose.yml`, `.github/`, `render.yaml`, `vercel.json`, root config, security config |

Changing a folder you don't own is fine, but tag its owner on the PR.

## Rules
- Never commit secrets. Use `.env` (ignored by git) and add new variables to `.env.example`.
- Shared types go in `packages/shared`, not duplicated in web and api.
- Changing the database schema = a Prisma migration in the same PR.
