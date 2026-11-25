# Team

| Member | Role | GitHub | Owns |
|---|---|---|---|
| **Oshri Polad** | DevSecOps Engineer + Team Lead | @OshriPolad | CI/CD, deployment, environments and secrets, security (reviews, hardening, scanning), QA, sprint planning, reviews every PR |
| **Roei Linik** | Backend Developer - API & Auth | @roilinik | `apps/api` modules, authentication and authorization, API contract (Swagger) |
| **Ilay Morden** | Database Engineer - Data & Service Engine | @elaymor-d | Prisma schema, migrations and seed, `packages/shared` (types + service engine), `data/` |
| **Daniel Zehavi** | Integrations Engineer - External APIs & Reminders | @danielzehavi | data.gov.il integration, reminders worker (BullMQ + Redis), email |
| **Lior Ben Adiva** | Frontend Developer | @liorbenadiva | `apps/web` - screens, UX, API connection |

## Progress

| Sprint | Oshri | Roei | Ilay | Daniel | Lior |
|---|---|---|---|---|---|
| **0 - Foundation** | ✅ Proposal, AI prompts, monorepo, CI, Docker, branch protection (#1-#4) | - | - | - | - |
| **1 - Building blocks** | ✅ Deployment (Vercel + Render + Neon) + Sentry (#7), reviews of #5 and #6 | ⏳ Auth module | ✅ Database schema, migrations, seed, shared types (#5) | ✅ Plate lookup via data.gov.il (#6) | ⏳ Layout + auth pages (mock data) |

Each member's detailed responsibilities and progress are in [`docs/ai-prompts/`](ai-prompts/). Update your row and your prompt file when a PR is merged.
