# Telemedicine API (backend)

TypeScript · Node.js 24 · Express 5 · PostgreSQL + Prisma · Socket.IO · JWT

## Quick start

```bash
cd backend
nvm use                       # Node 24 (see .nvmrc)
cp .env.example .env          # then set JWT_ACCESS_SECRET (32+ chars)
docker compose -f ../docker-compose.yml up -d     # postgres + minio
npm install
npx prisma migrate dev --name init                # creates the first migration + applies it
npm run db:seed                                   # admin + demo patient/doctors/slots
npm run dev                                       # http://localhost:4000
```

Verify everything: `npm run lint && npm run typecheck && npm test && npm run build`.

## Folder structure

```
backend/
├── prisma/            schema.prisma, seed.ts (migrations/ appears after the first migrate)
├── src/
│   ├── config/        env.ts - zod-validated environment, fails fast at boot
│   ├── infrastructure/  prisma client, pino logger, storage port + S3 adapter
│   ├── modules/       one folder per feature, each: schemas -> service -> controller -> routes
│   │   ├── auth/  doctors/  slots/  appointments/  prescriptions/
│   │   └── documents/  messages/  webrtc/  health/
│   ├── routes/        composes module routers under /api/v1
│   ├── shared/        errors, http helpers, auth (jwt/password/refresh), middleware, types
│   ├── sockets/       Socket.IO: auth, chat, call signalling, rate limiter, Redis adapter
│   ├── app.ts         builds the Express app (no listen - testable)
│   └── server.ts      process entrypoint, graceful shutdown
└── tests/             vitest + supertest + socket.io-client
```

Layering rule: controllers parse input (zod) and call services; services hold business rules and are
the only layer that talks to Prisma; shared/ and infrastructure/ never import from modules/.

## API (base `/api/v1`, success `{ data, meta? }`, error `{ error: { code, message, details? } }`)

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| POST | /auth/register, /auth/login, /auth/refresh, /auth/logout | public | patient sign-up, tokens (refresh rotates) |
| GET | /auth/me | any | current user |
| GET | /doctors?specialty=&q=&page=&limit= | any | search doctors |
| GET | /doctors/specialties, /doctors/:id | any | filters, profile |
| POST | /doctors | ADMIN | create doctor account + profile |
| PATCH | /doctors/me | DOCTOR | update own profile |
| GET | /doctors/:doctorId/slots?from=&to=&onlyAvailable= | any | availability |
| POST / DELETE | /slots, /slots/:id | DOCTOR | publish / remove own slots |
| POST | /appointments | PATIENT | book a slot (race-safe) |
| GET | /appointments, /appointments/:id | any | own appointments (admin: all metadata) |
| PATCH | /appointments/:id/status | PATIENT, DOCTOR | confirm / complete / cancel |
| PUT / GET | /appointments/:id/prescription | DOCTOR / participants | write / read prescription |
| GET | /appointments/:id/messages?cursor=&limit= | participants | chat history |
| POST | /documents/upload-url, then POST /documents | PATIENT | S3 pre-signed upload, then register |
| GET | /documents, /documents/:id/download-url | PATIENT, DOCTOR | list / pre-signed download |
| DELETE | /documents/:id | PATIENT | delete own file |
| GET | /webrtc/ice-servers | PATIENT, DOCTOR | STUN + short-lived TURN credentials |
| GET | /health, /health/ready (root, not under /api/v1) | public | liveness / readiness |

## Realtime (Socket.IO, WebSocket transport)

Connect with `io(url, { auth: { token: accessToken }, transports: ['websocket'] })`.
Every client event takes an ack callback returning `{ ok: true, data } | { ok: false, error }`.

| Client emits | Payload | Server emits to the other peer |
| --- | --- | --- |
| `chat:join` / `chat:leave` | `{ appointmentId }` | - |
| `chat:send` | `{ appointmentId, text }` | `chat:message` (to everyone in the chat room) |
| `call:join` / `call:leave` | `{ appointmentId }` | `call:peer-joined` / `call:peer-left` |
| `webrtc:offer` / `answer` / `ice-candidate` | `{ appointmentId, data }` | same event, with `{ appointmentId, from, data }` |

Calls need a CONFIRMED appointment and are open from `CALL_JOIN_EARLY_MINUTES` before the start until
`CALL_JOIN_LATE_MINUTES` after the end (raise both in `.env` for demos).

## Design decisions worth knowing

- **No double booking**: the slot is claimed with `UPDATE ... WHERE isBooked = false` inside the booking
  transaction; `slotId` is unique on appointments and cleared on cancellation.
- **Privacy**: chat, prescriptions, calls and documents are visible to the two participants only
  (admins get 404). Non-participants always get 404, never 403, so ids cannot be probed.
- **Tokens**: 15-minute JWT access tokens; opaque refresh tokens stored as SHA-256, rotated on every
  use, with reuse detection that revokes all of the user's sessions.
- **Scaling**: the app is stateless. For more than one instance set `REDIS_URL` (Socket.IO adapter).
  Uploads go straight to S3 via pre-signed URLs, so API instances never proxy files.
- **Not included yet**: payments, email/SMS reminders (planned: EventBridge + Lambda + SES/SNS),
  refresh-token cleanup job, OpenAPI spec.
