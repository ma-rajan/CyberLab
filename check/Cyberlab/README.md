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
| Phase 4 — Lab Engine Infrastructure | ✅ Completed |
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

## Phase 4 — Lab Engine Infrastructure

Phase 4 adds the secure runtime boundary for future isolated labs without adding intentionally
vulnerable behavior to the CyberLab platform. Published lab definitions now expose an objective,
instructions, and hints. An authenticated user can start one idempotent, user-owned `LabSession`,
retrieve that session and their per-lab progress, and submit an attempt through a server-side
validator registry.

The current validator is a safe placeholder. It accepts only the explicit `CYBERLAB_READY`
confirmation used to exercise the engine; it does not execute submitted code, SQL, shell commands,
or JavaScript. Points and completion timestamps are read from the server-side lab record, and a
session can only complete after its validator returns a completed result.

### Lab Engine API

* `GET /api/labs` — published lab catalog.
* `GET /api/labs/:slug` — safe published lab detail.
* `POST /api/labs/:slug/start` — authenticated, CSRF-protected, idempotent session start.
* `GET /api/labs/:slug/session` — the authenticated user's session only.
* `GET /api/labs/:slug/progress` — the authenticated user's progress only.
* `POST /api/labs/:slug/submit` — authenticated, CSRF-protected attempt validation.
* `POST /api/labs/:slug/complete` — compatibility endpoint that only returns progress after validated completion.
* `GET /api/labs/progress` — all progress belonging to the authenticated user.

The session record stores `user`, `lab`, `startedAt`, `lastActivityAt`, `completedAt`, and an
`ACTIVE`, `COMPLETED`, or `EXPIRED` status. One `(user, lab)` session is enforced by a database
unique constraint. All protected operations derive identity from the existing authenticated session;
client-supplied user IDs, points, and completion state are ignored or rejected.

### Future isolated lab architecture

The platform remains the secure control plane:

```text
CyberLab Platform
├── Secure API / Frontend
├── Lab Engine
│   ├── Lab Runtime
│   │   ├── Isolated SQLi Lab
│   │   ├── Isolated XSS Lab
│   │   ├── Isolated Auth Lab
│   │   └── Other Labs
│   └── Progress
```

Future lab-specific `start`, `validate`, and `complete` implementations should be registered
behind the lab engine and run in isolated targets. Intentionally vulnerable code must never be
added to the secure main API or shared application database.

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
