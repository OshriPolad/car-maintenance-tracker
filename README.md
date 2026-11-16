# Car Maintenance Tracker

A maintenance-tracking system for cars and motorcycles. Add a vehicle by license plate, see the next required service (parts, actions, estimated cost), get reminders, and keep a full service and expense history. Planned support for garages and service centers.

## Docs
- [Project proposal (Hebrew)](docs/01-proposal.md)

## Planned stack
React + Vite + TypeScript · Node.js + Express · PostgreSQL + Prisma · Docker Compose · GitHub Actions

## Repo structure
```
apps/web         React frontend
apps/api         Express API + reminder scheduler
packages/shared  Shared types and the service engine
docs             Proposal, architecture, API spec
```

## Contributing
- `main` is protected: work on a feature branch and open a pull request.
- Branch names: `feature/<short-name>`, `fix/<short-name>`.
- Every PR needs one approving review.

## License
MIT
