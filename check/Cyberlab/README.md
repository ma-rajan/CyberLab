# CyberLab

CyberLab is a local-only Mini Bug Bounty Training Platform for learning web security.

## Current scope

This repository includes the React/Vite and Express foundation plus secure, server-side
session authentication. It contains no vulnerable labs, scanners, or external-target functionality.

Authentication uses unique usernames and normalized unique email addresses, bcrypt password hashes,
opaque `httpOnly` cookies, server-side SQLite sessions, a double-submit CSRF token, and rate
limiting. The browser first requests
`GET /api/auth/csrf`; it receives a readable CSRF cookie/token and supplies that token in
the `X-CSRF-Token` header for state-changing authentication requests. The session cookie
is `httpOnly` and is never accessible to JavaScript or stored in localStorage.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
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
