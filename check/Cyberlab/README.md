# CyberLab

CyberLab is a local-only Mini Bug Bounty Training Platform for learning web security.

## Current scope

This repository includes the React/Vite and Express foundation, secure server-side session
authentication, and a lab-management catalog. It contains no vulnerable labs, scanners, or
external-target functionality.

Authentication uses unique usernames and normalized unique email addresses, bcrypt password hashes,
opaque `httpOnly` cookies, server-side SQLite sessions, a double-submit CSRF token, and rate
limiting. The browser first requests
`GET /api/auth/csrf`; it receives a readable CSRF cookie/token and supplies that token in
the `X-CSRF-Token` header for state-changing authentication requests. The session cookie
is `httpOnly` and is never accessible to JavaScript or stored in localStorage.

## Development progress

| Phase | Status |
| --- | --- |
| Phase 1 — Project Foundation | ✅ Completed |
| Phase 2 — Secure Authentication | ✅ Completed |
| Phase 3 — Lab Management Foundation | ✅ Completed |
| Phase 4 — Lab Runtime | ⏳ Planned |
| Phase 5 — Vulnerable Labs | ⏳ Planned |

## Phase 3 — Lab Management Foundation

Phase 3 adds secure platform infrastructure for future labs:

* Prisma `Lab` metadata with categories, difficulty levels, publication state, and learning estimates.
* User-owned `LabProgress` records with database-enforced one-record-per-user-and-lab constraints.
* Repeatable placeholder seed data for five upcoming labs; it stores metadata only.
* Public APIs for published lab listings and details, plus authenticated APIs for starting,
  completing, and viewing only the current user's progress.
* A protected Labs dashboard, filtering, lab details, and server-authoritative progress UI.

Actual vulnerable labs have **not** been implemented. The listed labs are coming-soon metadata;
there are no SQL injection, XSS, IDOR, or other vulnerable endpoints in this phase.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:3001`.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
```
