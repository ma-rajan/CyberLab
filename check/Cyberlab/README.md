# CyberLab

CyberLab is a local-only Mini Bug Bounty Training Platform for learning web security.

## Current scope

This repository includes the React/Vite and Express foundation, secure server-side session
authentication, a lab-management catalog, and one local, beginner-friendly challenge target.
It contains no scanners or external-target functionality.

Authentication uses unique usernames and normalized unique email addresses, bcrypt password hashes,
opaque `httpOnly` cookies, server-side SQLite sessions, a double-submit CSRF token, and rate
limiting. The browser first requests
`GET /api/auth/csrf`; it receives a readable CSRF cookie/token and supplies that token in
the `X-CSRF-Token` header for state-changing authentication requests. The session cookie
is `httpOnly` and is never accessible to JavaScript or stored in localStorage.

## Development progress

| Phase                               | Status       |
| ----------------------------------- | ------------ |
| Phase 1 — Project Foundation        | ✅ Completed |
| Phase 2 — Secure Authentication     | ✅ Completed |
| Phase 3 — Lab Management Foundation | ✅ Completed |
| Phase 4 — Lab Engine Infrastructure | ✅ Completed |
| Phase 5 — Challenge Content Engine  | ✅ Completed |

## Phase 3 — Lab Management Foundation

Phase 3 adds secure platform infrastructure for future labs:

- Prisma `Lab` metadata with categories, difficulty levels, publication state, and learning estimates.
- User-owned `LabProgress` records with database-enforced one-record-per-user-and-lab constraints.
- Repeatable placeholder seed data for five upcoming labs; it stores metadata only.
- Public APIs for published lab listings and details, plus authenticated APIs for starting,
  completing, and viewing only the current user's progress.
- A protected Labs dashboard, filtering, lab details, and server-authoritative progress UI.

The catalog retains the existing placeholder labs and now includes one available SQL Injection
challenge. XSS, IDOR, authentication, and information-disclosure categories remain represented
by future-ready metadata rather than partially implemented targets.

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

- `GET /api/labs` — published lab catalog.
- `GET /api/labs/:slug` — safe published lab detail.
- `POST /api/labs/:slug/start` — authenticated, CSRF-protected, idempotent session start.
- `GET /api/labs/:slug/session` — the authenticated user's session only.
- `GET /api/labs/:slug/progress` — the authenticated user's progress only.
- `POST /api/labs/:slug/submit` — authenticated, CSRF-protected attempt validation.
- `POST /api/labs/:slug/complete` — compatibility endpoint that only returns progress after validated completion.
- `GET /api/labs/progress` — all progress belonging to the authenticated user.

The session record stores `user`, `lab`, `startedAt`, `lastActivityAt`, `completedAt`, and an
`ACTIVE`, `COMPLETED`, or `EXPIRED` status. One `(user, lab)` session is enforced by a database
unique constraint. All protected operations derive identity from the existing authenticated session;
client-supplied user IDs, points, and completion state are ignored or rejected.

## Phase 5 — Challenge Content Engine

`Lab` remains the single challenge record: its existing metadata, objective, instructions, hints,
publication state, user progress, and sessions are reused. Phase 5 adds public `target` and
`challengeType` fields plus private `validatorType` and bcrypt `flagHash` fields. Private validator
data is deliberately omitted from catalog, detail, progress, and session API responses.

The seed command reproducibly upgrades `sql-injection-basics` into **Product Search**, a beginner
SQL Injection exercise. After starting their own session, a learner can use the local target at
`GET /api/labs/sql-injection-basics/target/products?search=<term>`, discover the hidden note, and
submit its flag through the existing server-side submission endpoint.

The target is a deliberately limited, fixed-data emulator of unsafe SQL query construction. It
does not execute supplied text as SQL and cannot access the CyberLab platform database. This keeps
the exercise local and safe while preserving the learning flow.

### Security separation

The platform remains the secure control plane:

```text
Secure CyberLab Platform
├── Secure API / Frontend
├── Lab Engine
│   ├── Isolated target modules
│   │   ├── Product Search SQLi target (fixed data only)
│   │   ├── Future XSS Lab
│   │   ├── Isolated Auth Lab
│   │   └── Other Labs
│   └── Progress
```

Targets are session-gated and use only target-specific fixed data. The secure platform's
authentication, authorization, sessions, progress, and SQLite database are never used as a
vulnerability target. Future challenge types register behind the existing engine and must keep
that separation.

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
DATABASE_URL='file:./dev.db' npx prisma validate
```
