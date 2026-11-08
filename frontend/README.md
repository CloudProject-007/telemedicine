# TeleCare frontend

Vite + React 19 + TypeScript SPA for the TeleCare backend (`../backend`).

## Run

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api/v1
npm install               # run again after pulling: socket.io-client is a new dependency
npm run dev               # http://localhost:5173
```

Start the backend first (`../backend`, `npm run dev`). Backend CORS must allow `http://localhost:5173`.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Structure

```
src/
  app/          router, providers, route guards
  components/   ui/ (primitives), layout/ (shells, logo, footer)
  config/       env validation, constants
  features/     auth, landing, doctors, appointments, doctor, admin (one folder per feature)
  lib/          api client, formatting, helpers
  styles/       Tailwind theme tokens
  types/        API types
```

## Auth

The access token lives in memory; the refresh token in `localStorage`. Refresh is single-flight and
guarded by a Web Lock across tabs, because the backend revokes every session if a refresh token is
reused.

## Roles and routes

| Role    | Lands on   | Screens                                                                   |
| ------- | ---------- | ------------------------------------------------------------------------- |
| Patient | `/doctors` | find a doctor, book a time, `/appointments`                               |
| Doctor  | `/doctor`  | schedule (confirm, decline, complete), `/doctor/slots`, `/doctor/profile` |
| Admin   | `/admin`   | overview, `/admin/doctors`, `/admin/doctors/new`, `/admin/appointments`   |

`RoleOnly` sends anyone who opens another role's URL to their own home. The backend enforces the
same rules, so hiding a link is never the only protection.

## Trying the doctor and admin screens

`npm run db:seed` in the backend creates demo accounts (the admin's email and password can be
changed with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`):

| Role    | Email                     | Password        |
| ------- | ------------------------- | --------------- |
| Admin   | `admin@telemed.local`     | `Admin@12345`   |
| Doctor  | `dr.sharma@telemed.local` | `Doctor@12345`  |
| Patient | `patient@telemed.local`   | `Patient@12345` |

Sign in as the admin to add a doctor, then as a doctor to add open times.

## Consultation room

`/consultations/:appointmentId` is shared by the appointment's patient and doctor. It has three parts:

- **Video call**: WebRTC, with Socket.IO carrying the signalling. It follows the "perfect negotiation"
  pattern (`src/lib/realtime/call-session.ts`), so both people can connect at the same moment.
  The call opens 15 minutes before the start and closes 30 minutes after the end. Both limits are
  enforced by the server too.
- **Chat**: history over REST, new messages over the socket. After a dropped connection it joins
  again and reloads, so nothing is missed.
- **Prescription**: the doctor writes and edits it, the patient reads and prints it. The patient's
  page checks for a new one every 15 seconds.

The socket connects to the origin of `VITE_API_URL`. Set `VITE_SOCKET_URL` only if it lives elsewhere.

### Trying it on one computer

1. Doctor: add an open time that starts in about 10 minutes (**Open times**).
2. Patient (a private window or another browser): book that time.
3. Doctor: confirm it on **Schedule**.
4. Both: choose **Open visit** and join the video call.

Two browsers on one computer often cannot share a single camera. If the second one says the camera
is in use, test with a phone, or join one side with the camera turned off.

Calls across different networks may need a TURN server. Set `TURN_URLS` and `TURN_SECRET` in the
backend; without them only STUN is used, which works on most home and office networks.

## Not built yet

Medical documents (uploads), appointment reminders and a Hindi translation.
