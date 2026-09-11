# CyberLab

CyberLab is a local-only Mini Bug Bounty Training Platform for learning web security.

## Phase 1

This repository currently contains the project foundation only: React/Vite, Express,
Prisma/SQLite, Tailwind, linting, formatting, and tests. It contains no authentication,
vulnerable labs, scanners, or external-target functionality.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:3001`.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
