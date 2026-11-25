# Car Maintenance Tracker

A maintenance-tracking system for cars and motorcycles. Add a vehicle by license plate, see the next required service (parts, actions, estimated cost), get reminders, and keep a full service and expense history. Planned support for garages and service centers.

## Stack
React + Vite + TypeScript + Tailwind · NestJS · PostgreSQL + Prisma · Redis + BullMQ · Docker Compose · GitHub Actions · pnpm workspaces

## Repo structure
```
apps/web            React frontend (Vite)                 → http://localhost:5173
apps/api            NestJS API (+ reminder worker later)  → http://localhost:3000/api
packages/shared     Shared types + the service engine (pure TypeScript)
data/               Service template data (one JSON per vehicle model)
docs/               Proposal, AI prompts, architecture
```

## Prerequisites
- Node.js 22 (see `.nvmrc`)
- pnpm: `corepack enable` (pnpm comes with Node through corepack)
- Docker Desktop
- Git

## Getting started
```bash
git clone https://github.com/OshriPolad/car-maintenance-tracker.git
cd car-maintenance-tracker

cp .env.example .env              # root env (used by docker compose)
cp .env.example apps/api/.env     # API env (used by Prisma and NestJS)

pnpm install                      # install everything (also generates the Prisma client)
pnpm db:up                        # start PostgreSQL + Redis in Docker
pnpm db:migrate                   # create the database tables
pnpm dev                          # run web + api + shared in watch mode
```
On Windows PowerShell use `copy` instead of `cp`.

Then open:
- Web: http://localhost:5173 (should show `API: ok` and `Database: up`)
- API health: http://localhost:3000/api/health
- API docs (Swagger): http://localhost:3000/api/docs

## Common commands
| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build everything |
| `pnpm test` | Run all tests |
| `pnpm lint` | Check code style and common bugs |
| `pnpm typecheck` | TypeScript type check |
| `pnpm format` | Auto-format all files |
| `pnpm db:up` / `pnpm db:down` | Start / stop PostgreSQL and Redis |
| `pnpm db:migrate` | Apply Prisma schema changes to the database |
| `pnpm db:seed` | Seed the database with test user, vehicles, and sample data |
| `pnpm db:studio` | Open a visual database browser |
| `pnpm --filter @cmt/web add <pkg>` | Add a package to one app (`@cmt/api`, `@cmt/shared`) |

## Docs
- [Project proposal (Hebrew)](docs/01-proposal.md)
- [AI prompts per role](docs/ai-prompts/)
- [Service data collection guide](data/service-templates/README.md)
- [Contributing](CONTRIBUTING.md)

## License
MIT

## Test Login (after `pnpm db:seed`)
- **Email:** `test@cmt.local`
- **Password:** `Password123!`
