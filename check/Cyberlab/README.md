# CyberLab

CyberLab is a local-only Mini Bug Bounty Training Platform for learning web security.

## Current scope

This repository includes the React/Vite and Express foundation, secure server-side session
authentication, a lab-management catalog, and isolated local challenge targets.
It contains no scanners or external-target functionality.

Authentication uses unique usernames and normalized unique email addresses, bcrypt password hashes,
opaque `httpOnly` cookies, server-side SQLite sessions, a double-submit CSRF token, and rate
limiting. The browser first requests
`GET /api/auth/csrf`; it receives a readable CSRF cookie/token and supplies that token in
the `X-CSRF-Token` header for state-changing authentication requests. The session cookie
is `httpOnly` and is never accessible to JavaScript or stored in localStorage.

## Project Structure

```text
client/src/
├── app/                    # Application routes and shell setup
├── components/             # Shared layout and UI components
├── features/
│   ├── auth/               # Authentication pages and session context
│   ├── dashboard/          # Learner dashboard
│   ├── home/               # Public home page
│   ├── labs/               # Lab catalog, detail page, and lab UI helpers
│   └── challenges/         # Challenge catalog placeholder
├── lib/                    # API client and shared frontend data types
├── styles/                 # Global styles
└── test/                   # Frontend test setup

server/src/
├── config/                 # Environment validation
├── lib/                    # Prisma client
├── middleware/             # Authentication, CSRF, rate limiting, and errors
├── modules/
│   ├── auth/               # Authentication controller, service, repository, and validators
│   └── labs/               # Lab API, engine, repository, service, and validators
│       └── isolated-targets/ # One bounded implementation per training target
├── routes/                 # HTTP route and middleware composition
├── types/                  # Express request augmentation
└── utils/                  # Shared server helpers

server/tests/
├── api/                    # API health tests
├── auth/                   # Authentication tests
├── helpers/                # Shared lab test fixtures and database reset
└── labs/                   # Catalog, progress, and per-target tests

prisma/
├── migrations/             # Versioned database migrations
├── schema.prisma           # Shared SQLite data model
└── seed.ts                 # Published lab catalog and seed data
```

Root package scripts coordinate the client and server workspaces. The Prisma schema and
migrations remain at the repository root and are shared by the server and seed command.

## Development progress

| Phase                               | Status       |
| ----------------------------------- | ------------ |
| Phase 1 — Project Foundation        | ✅ Completed |
| Phase 2 — Secure Authentication     | ✅ Completed |
| Phase 3 — Lab Management Foundation | ✅ Completed |
| Phase 4 — Lab Engine Infrastructure | ✅ Completed |
| Phase 5 — Challenge Content Engine  | ✅ Completed |
| Phase 6 — Isolated XSS Challenge    | ✅ Completed |
| Phase 7 — Isolated IDOR Challenge   | ✅ Completed |
| Phase 8 — Isolated Authentication Challenge | ✅ Completed |
| Phase 9 — Isolated Function Authorization Challenge | ✅ Completed |
| Phase 10 — Isolated SSRF Challenge | ✅ Completed |
| Phase 11 — Isolated SQL Injection Challenge | ✅ Completed |
| Phase 12 — Isolated File Upload Validation Challenge | ✅ Completed |
| Phase 13 — Isolated CSRF Challenge | ✅ Completed |
| Phase 14 — Isolated Path Traversal Challenge | ✅ Completed |
| Phase 15 — Isolated SSTI Training Lab | ✅ Completed |
| Phase 16 — File Upload Storage Quotas and Lifecycle Controls | ✅ Completed |
| Phase 17 — Isolated CORS Policy Lab | ✅ Completed |
| Phase 19 — Isolated Command Injection Lab | ✅ Completed |
| Phase 20 — Isolated Business Logic Race Condition Lab | ✅ Completed |

## Phase 3 — Lab Management Foundation

Phase 3 adds secure platform infrastructure for future labs:

- Prisma `Lab` metadata with categories, difficulty levels, publication state, and learning estimates.
- User-owned `LabProgress` records with database-enforced one-record-per-user-and-lab constraints.
- Repeatable placeholder seed data for five upcoming labs; it stores metadata only.
- Public APIs for published lab listings and details, plus authenticated APIs for starting,
  completing, and viewing only the current user's progress.
- A protected Labs dashboard, filtering, lab details, and server-authoritative progress UI.

The catalog retains the existing placeholder labs and now includes SQL Injection, XSS, IDOR, and
authentication challenges. Information-disclosure remains future-ready metadata.

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
│   │   ├── Feedback Search XSS target (sandboxed document)
│   │   ├── Profile Access IDOR target (fixed synthetic profiles)
│   │   ├── Training Login authentication target (fixed synthetic account)
│   │   ├── Training Workspace function-authorization target (fixed synthetic reports)
│   │   ├── Mock Fetch SSRF target (fixed in-memory path map)
│   │   ├── Mock User Directory SQLi target (fixed synthetic records)
│   │   ├── Training File Viewer Path Traversal target (fixed virtual documents)
│   │   ├── Training Template SSTI target (allowlisted expressions and fixed data)
│   │   ├── CORS Policy target (local synthetic policy evaluation)
│   │   ├── Synthetic Diagnostics command-injection target (fixed in-memory parser)
│   │   ├── Synthetic Store coupon race target (per-session in-memory state)
│   │   └── Other Labs
│   └── Progress
```

Targets are session-gated and use only target-specific fixed data. The secure platform's
authentication, authorization, sessions, progress, and SQLite database are never used as a
vulnerability target. Future challenge types register behind the existing engine and must keep
that separation.

## Phase 6 — Isolated XSS Challenge

The seed command upgrades `xss-fundamentals` into **Reflected XSS Basics**, using Feedback Search
at `GET /api/labs/xss-fundamentals/target/feedback?feedback=<text>`. The route requires both an
authenticated user and that user's existing lab session. It returns a target-only document and no
platform records, private validator fields, or lab flag.

The React application never renders that untrusted document as page HTML. It presents it only in
an iframe with `sandbox="allow-scripts"`, which gives the target an opaque origin. The target's CSP
blocks network access and external resources, while its deliberate reflection remains available for
harmless local training input. A successful training marker yields a non-secret completion value;
the existing server-side bcrypt validator and progress/session completion flow verify it.

Challenge definitions remain keyed by `challengeType`, so new isolated target modules can reuse the
same catalog, session, progress, submission, and validator infrastructure without duplicating it.

## Phase 7 — Isolated IDOR Challenge

The seed command upgrades `idor-fundamentals` into **Profile Access — IDOR Basics**. Its target is
`GET /api/labs/idor-fundamentals/target/profile?id=<profileId>` and is available only after the
authenticated learner has started their own lab session.

Profile Access deliberately omits an ownership check only for two fixed synthetic target profiles.
Changing the profile ID demonstrates broken object-level authorization without reading the CyberLab
`User` table, platform database records, or any real account data. The normal platform authorization,
session, progress, and submission endpoints remain unchanged and protected.

The target returns a training-only completion value after the intended synthetic-profile interaction.
The existing bcrypt-backed server validator, rather than the browser, validates it and records the
existing session/progress completion state.

## Phase 8 — Isolated Authentication Challenge

The seed command adds **Authentication Bypass Basics** at
`POST /api/labs/authentication-bypass-basics/target/login`. The endpoint requires both the normal
CyberLab authenticated user and that user’s existing lab session, including the standard CSRF check.

Training Login is a deliberately flawed, fixed in-memory authentication check. It uses no Prisma
user records, platform passwords, cookies, authentication sessions, or external services. Its
response is target-only synthetic state; it cannot sign a learner into CyberLab or alter the platform
session. The challenge produces a non-secret completion value only after the intended synthetic
bypass, and the existing bcrypt-backed server validator records completion.

Hints guide learners from observing the login decision, to testing unexpected values, to reasoning
about the flawed condition without disclosing the training flag in metadata or documentation.

## Phase 9 — Isolated Function Authorization Challenge

The existing `broken-access-control` catalog entry is now **Broken Function-Level Authorization**.
After a learner starts their own lab session, Training Workspace is available at
`GET /api/labs/broken-access-control/target/report?section=<section>`. The fixed in-memory target
deliberately omits an administrator-role check for `section=admin-audit`, illustrating a
function-level authorization failure. It uses no CyberLab users, roles, database records, or
platform-session state beyond the session gate that protects the lab itself. The target returns a
non-secret completion value only after the intended synthetic interaction, and the existing
bcrypt-backed validator records completion.

## Phase 10 — Isolated SSRF Challenge

**Server-Side Request Forgery** is available at
`GET /api/labs/ssrf/fetch?url=<mock-path>` after the learner starts their own lab session. The
learning flow starts with `/public/status` and demonstrates how a server-side fetch feature can
expose `/internal/admin-config` when it omits an authorization check for a protected destination.

This is deliberately not a network proxy: the target uses an exact in-memory allowlist containing
only those two mock paths. It creates no HTTP client, sockets, DNS lookups, port scans, filesystem
reads, environment-variable reads, Prisma queries, or requests to host, localhost, LAN, cloud
metadata, or external services. Scheme URLs, protocol-relative URLs, addresses, hosts, ports, and
all paths outside the fixed map are rejected. The internal mock response is synthetic and provides
a non-secret completion value that the existing bcrypt-backed validator verifies.

The server API tests cover authentication/session gates, public and internal mock responses,
network-like input rejection, data isolation, and successful/failed completion. The frontend test
covers mock request rendering, rejected-input feedback, and flag submission.

## Phase 11 — Isolated SQL Injection Challenge

**SQL Injection** is available at `GET /api/labs/sqli/search?q=<query>` after the learner starts
their own lab session. The Mock User Directory contains only fixed synthetic records for `alice`,
`bob`, and an internal `auditor` record. A normal public-name lookup returns its matching public
record. A narrowly controlled boolean-tautology pattern demonstrates how unsafe string-based query
construction can alter the intended comparison and expose the protected synthetic record.

The target is a deterministic in-memory evaluator, not a SQL engine: it never calls Prisma or
SQLite, parses general SQL, accesses CyberLab users/sessions/roles, reads files or environment
values, or contacts a network or external database. Stacked-query markers and mutating, DDL, and
other unsupported SQL-like constructs are rejected. The protected result contains only the
training completion value, which the existing bcrypt-backed validator verifies.

Server tests cover access gates, normal and controlled-injection responses, unsupported-input
rejection, data isolation, metadata privacy, and completion. The frontend test covers query entry,
response rendering, rejected-input feedback, and flag submission.

## Phase 12 — Isolated File Upload Validation Challenge

**Unrestricted File Upload** is available after starting the lab at
`POST /api/labs/file-upload-validation/target/upload`. The target accepts bounded raw bytes with
`X-Upload-Filename` and `X-Upload-Mime-Type` request headers, making the client-controlled metadata
visible for inspection. `GET /api/labs/file-upload-validation/target/files/:filename` retrieves a
stored training upload.

The isolated target deliberately makes its acceptance decision from the claimed image extension and
MIME type, so harmless text presented as an image can demonstrate the weakness. It stores uploads
only beneath a target-specific lab-storage directory, uses generated identifiers rather than client
paths, rejects path traversal, and never executes, parses, renders, or serves content with the
claimed MIME type. Every retrieval is a `nosniff` attachment with an octet-stream content type.
The dedicated validator requires both the existing bcrypt-backed completion value and a verified
mismatched upload owned by the learner, so guessing the value alone cannot complete the lab.

Storage is bounded to 10 files and 256 KiB of stored data per learner, with a 16 MiB global
stored-data limit. Uploads expire 24 hours after creation; the server removes expired uploads at
startup and during an hourly cleanup sweep. These defaults can be changed with
`LAB_UPLOAD_MAX_FILES_PER_LEARNER`, `LAB_UPLOAD_MAX_BYTES_PER_LEARNER`,
`LAB_UPLOAD_MAX_BYTES_GLOBAL`, and `LAB_UPLOAD_TTL_HOURS`. Quota decisions and writes are serialized
within the current Node process. The current server starts one process; deployments using multiple
workers must add a shared transactional quota lock before enabling shared storage.

Server tests cover normal image upload, the accepted harmless content/type mismatch, stored-file
retrieval, malformed upload requests, learner isolation, path traversal rejection, storage confined
to the training directory, per-learner and global quotas, concurrent quota boundaries, partial-write
cleanup, expiration of abandoned uploads, preservation of fresh uploads, and validator completion.
Tests use isolated temporary storage. The frontend test covers file selection, upload feedback, and
completion submission. Phase 12 verification passed with 58 server tests, 11
client tests, workspace type-checking, and the production build.

## Phase 13 — Isolated CSRF Challenge

**CSRF** is available after starting the lab at
`GET /api/labs/csrf/target/settings`. The training victim setting can be changed through the
deliberately tokenless, form-style target route
`POST /api/labs/csrf/target/settings`; the comparison route
`POST /api/labs/csrf/target/settings/secure` retains CyberLab's normal CSRF-token validation.

The `CSRF` challenge type keeps the exercise bounded to per-user in-memory training settings. Both
routes require the learner's authenticated CyberLab session and an owned active lab session, but
only the intentionally vulnerable target route omits CSRF validation. A completion is recorded
only when the server verifies the bcrypt-backed completion value and confirms that this learner's
training notification setting was changed without a valid CSRF token. The target never changes
platform account settings or exposes private validator data through catalog, detail, progress, or
session APIs.

The lab page's attacker-request simulator models a cross-origin form submission against this local
target; it does not contact an external site. The protected comparison control uses CyberLab's
normal CSRF-token flow. Tests cover both request paths, incomplete and incorrect submissions,
per-learner isolation, and ensuring the CSRF target cannot affect unrelated labs. The frontend test
covers the local attacker simulation and protected comparison. Verification passed with 60 server
tests, 11 client tests, type-checking, production build, and lint.

## Phase 14 — Isolated Path Traversal Challenge

**Path Traversal** is available after starting the lab at
`GET /api/labs/path-traversal/read?file=<relative-path>`. The training file viewer starts from
the virtual `/public` directory and normalizes the supplied relative path without enforcing that
the resolved path remains in that directory. Learners first read the public `readme.txt`, then
use a parent directory segment to retrieve a synthetic note from `/private/maintenance.txt`.
The remediation is to resolve against a fixed base directory and verify the canonical result
remains beneath it, or map user choices to fixed file identifiers instead of accepting paths.

The target uses a fixed in-memory map and `node:path` path normalization only. It never opens,
stats, or reads a host file; arbitrary and unmapped paths return a not-found response. Authentication
and the learner's active lab session are required. The existing validator additionally checks that
the same learner read the restricted synthetic note before accepting the completion value. Tests
cover metadata privacy, publication state, authentication and session gates, normal and traversed
paths, malformed and host-file-like inputs, per-learner isolation, and completion. The frontend
provides a local path input and renders only the returned virtual document as text. Verification
passed with 64 server tests, 12 client tests, workspace type-checking, lint, production build,
Prisma validation, and Git whitespace checks.

## Phase 15 — Isolated SSTI Training Lab

**Server-Side Template Injection** is available after starting the lab at
`GET /api/labs/ssti-basics/render?input=<text>`. The vulnerable training preview parses a
deliberately small template syntax so learners can compare `{{7*7}}` becoming `49` with the secure
preview displaying those braces literally. Other supported examples use fixed context values such
as `learner.name` and concatenations of quoted strings. The only synthetic completion value is
available from the fixed `training.completion` key.

This is a hand-written allowlist evaluator, not a template engine: it supports bounded binary
arithmetic, exact fixed context keys, and concatenated JSON string literals. Unsupported, malformed,
zero-division, oversized, and code-like expressions are rejected. It has no filesystem, process,
environment, network, or database access. The secure comparison always treats the input as data.
In a real application, keep templates fixed and pass user input as a value, for example
`const safePreview = renderFixedTemplate(userInput);`; do not concatenate untrusted input into
template source. Authentication and an owned lab session gate the target. Completion also requires
the learner's own arithmetic and training-context interactions, verified by the existing server
validator. Tests cover target gates, metadata privacy, allowed and rejected expressions, literal
secure rendering, side-effect spies for filesystem and network APIs, per-learner isolation, and the
frontend workflow. Verification passed with 73 server tests, 13 client tests, workspace type
checking, lint, production build, Prisma validation, and Git whitespace checks.

## Phase 17 — Isolated CORS Policy Lab

**CORS Policy Misconfiguration** is available after starting the lab at
`POST /api/labs/cors-policy/target/cors/simulate`. The simulator compares permissive origin
reflection, an explicit allowlist that trusts only `https://app.training.test`, and a wildcard
response that also advertises credentials. Inputs contain only an origin string, method, optional
headers, and a credential setting. The server evaluates these values locally against fixed
synthetic response data; it does not contact the entered origin or test actual browser behavior.

The exercise shows how scheme, host, and port form an origin, when a request requires a simulated
`OPTIONS` preflight, and whether the requested method and headers pass each policy. Its results
separate response headers and whether the modeled browser would expose the response to JavaScript.
The wildcard-plus-credentials example remains unreadable to JavaScript. The lab also explains that
CORS is not authentication or authorization and does not prevent every cross-origin request. The
production CORS middleware remains origin-restricted and is not changed by this training target.

The target requires authentication, an owned lab session, and the platform CSRF token. Completion
requires a learner-owned simple-request exposure comparison and a preflight comparison, then
server-side validation of the synthetic completion value. Tests cover metadata privacy, target
gates, origin parsing, method and header policy, wildcard credentials, learner isolation, and
completion validation. Verification passed with 94 server tests and 14 client tests, server and
client type checks, lint, production builds, Prisma schema validation, and Git whitespace checks.

## Phase 19 — Isolated Command Injection Lab

**Command Injection** is available after starting the lab at
`POST /api/labs/command-injection/target/command-injection/simulate`. The vulnerable mode models a
diagnostics status command with a deliberately weak semicolon filter. Its tiny in-memory parser
recognizes only the synthetic `&& audit` token, allowing learners to compare the baseline status
result with an added mock audit operation. Unsupported syntax and operations are rejected.

The secure mode selects only the fixed `status` operation and treats the same input as display data.
The simulator never calls a process API or shell, executes an operating-system command, reads host
files or environment values, accesses Prisma data, or makes network requests. Inputs are limited to
120 characters; target access requires authentication, an active learner-owned lab session, and the
normal CSRF token. Interaction state is keyed by that lab session. Completion is recorded only after
the server observes both the vulnerable interaction and its secure comparison, then validates the
learner's explicit verification request. No completion value is returned by the target.

Server tests cover authentication, CSRF and active-session gates, bounded syntax, secure-mode data
handling, learner isolation, completion conditions, metadata privacy, and the absence of process,
filesystem, and fetch calls by the simulator. The frontend test covers target loading, validation
feedback, both modes, and server-validated completion.

## Phase 20 — Isolated Business Logic Race Condition Lab

**Business Logic Race Condition** uses a synthetic store with one fixed training product and a
`SAVE-ONCE` coupon limited to one redemption. In vulnerable mode, learners explicitly prepare two
valid attempts before recording either. Both preparation steps observe zero redemptions; recording
both saved eligibility results then violates the one-use invariant. Replaying a recorded attempt or
reusing an attempt ID is rejected, separating the race from an unbounded duplicate-request bug.

The secure comparison applies two synthetic attempts through a deterministic atomic state transition:
the first reserves the single use, and the second is rejected. This is a controlled interleaving in
an in-memory simulator, not actual database concurrency and not evidence of production transaction
isolation. A production workflow needs a transaction, conditional update, unique reservation, or
equivalent mechanism that enforces the invariant atomically. Input validation remains useful for
request shape but cannot repair a gap between a valid eligibility check and a later state update.

All product, coupon, and redemption state is fixed and isolated by active lab-session ID. The target
does not use payments, customer records, platform account data, or Prisma. Authenticated requests
retain the platform CSRF requirement, and server-side completion requires the learner's session to
demonstrate both the stale-check violation and secure comparison. Tests cover deterministic state
transitions, replay and invalid-transition handling, concurrency modeling, learner isolation,
completion, and unchanged platform account/session records; the client test covers loading, errors,
both workflows, and verification.

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
