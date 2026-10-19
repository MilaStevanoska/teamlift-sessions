# TeamLift Sessions

A booking app for **1:1 AI coaching sessions**. An instructor publishes their available times, and AI Champions book one, pick what they want to work on, and get a personal confirmation from **Teamo**, an AI assistant powered by Gemini.

**Live app:** _coming soon_ · **API:** _coming soon_

> The API runs on Render's free tier, which sleeps when idle. The first request can take up to a minute; the app shows a "waking up the server" message while it waits.

![Booking page](docs/booking.png)

## Why coaching sessions?

The brief allowed a twist, so I chose one close to TeamLift's own product. TeamLift's Champions book recurring 1:1 sessions with an instructor, and Teamo supports them in between. This app is a small version of that flow:

- **Champions** (`/#/`) choose a day and time, enter their name and email, and pick a **session focus** such as *Build an automation* or *Prompting deep-dive*. They can add an optional note for the coach.
- **The instructor** (`/#/instructor`) publishes sessions, including several back-to-back sessions at once, and sees who booked what, with their focus and note. Open sessions can be removed. Booked sessions are protected.
- **Teamo** writes a short confirmation with two prep tips based on the Champion's focus and note.

## Features

- Create sessions with date, start time and length. You can publish up to 8 back-to-back sessions at once, with a live preview.
- Browse sessions by day. Each day shows how many slots are open, and booked slots are shown struck through.
- Book with name, email, focus and an optional note.
- **No double bookings, guaranteed by the database.** If two people book the same slot at the same moment, one succeeds. The other sees *"Sorry, someone just booked this session"*, the list refreshes, and their form input is kept.
- Overlap protection: the instructor can't publish a session that overlaps an existing one.
- Validation on both sides: no past sessions, a fixed set of durations, valid emails, and length limits.
- Times are stored in UTC and shown in the viewer's own time zone.
- Availability refreshes when the tab regains focus.
- Responsive layout down to phone width, with keyboard and screen-reader support.

## Tech stack

| Part     | Choice                                                     |
| -------- | ---------------------------------------------------------- |
| Frontend | React 19 + TypeScript, Vite, plain CSS (no UI library)    |
| Backend  | NestJS 12 (TypeScript, ESM), class-validator               |
| Database | PostgreSQL via Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| AI       | Google Gemini via `@google/genai` (free tier)              |
| Hosting  | Vercel (frontend), Render (API), Neon (Postgres)           |

## How it works

```
client/                React app
  src/api.ts           Typed API client, the only place that calls fetch
  src/pages/           BookPage (Champion flow), HostPage (instructor dashboard)
  src/components/      TeamoNote, LoadState, Icon
  src/lib/             Date helpers, useAsync hook
server/                NestJS API, mounted under /api
  prisma/schema.prisma Slot and Booking models
  src/slots/           GET/POST/DELETE /slots  (overlap checks)
  src/bookings/        POST /bookings, POST /bookings/:id/confirmation
  src/teamo/           The Gemini call, with a template fallback
  scripts/smoke-test.mjs  End-to-end API checks, including a booking race
```

### Preventing double bookings

`Booking.slotId` has a **unique index**. The service checks whether the slot is free so it can return a friendly error, but the guarantee comes from the database. If two requests pass the check at the same time, Postgres accepts exactly one insert. The other fails with `P2002`, which the API returns as `409 Conflict`. The smoke test fires 10 simultaneous bookings at one slot and checks that exactly one succeeds.

### The AI endpoint

`POST /api/bookings/:id/confirmation` sends the booking (first name, time in the booker's time zone, focus and note) to Gemini with a short system prompt that defines Teamo's voice and limits. Design decisions:

- **Separate from booking.** Booking stays fast and never depends on the LLM. The confirmation loads afterwards with a typing indicator.
- **Cached in the database.** The message is saved on the booking, so refreshing doesn't spend free-tier quota.
- **Always has an answer.** With no API key, or if a call fails or times out (15s), Teamo uses a template message, so the flow never breaks.
- **Configurable model.** `GEMINI_MODEL` defaults to the `gemini-flash-latest` alias, so the app keeps working as Google retires model versions.

### API

| Method | Path                               | Description                                         |
| ------ | ---------------------------------- | --------------------------------------------------- |
| GET    | `/api/slots`                       | Upcoming sessions with `isBooked` (no personal data) |
| GET    | `/api/slots?view=host`             | Same, plus booking details for the instructor       |
| POST   | `/api/slots`                       | `{ startsAt, durationMinutes, count? }`             |
| DELETE | `/api/slots/:id`                   | Remove an open session (409 if booked)              |
| POST   | `/api/bookings`                    | `{ slotId, name, email, focus, note? }` (409 if taken) |
| POST   | `/api/bookings/:id/confirmation`   | Teamo's message: `{ message, source }`              |
| GET    | `/api/options`                     | Durations and focus areas (single source of truth)  |
| GET    | `/api/health`                      | Health check                                        |

## Running locally

**Requirements:** Node 22+ and a Postgres database. The easiest options are a free [Neon](https://neon.tech) database or a local Postgres. Without either, you can run an in-memory Postgres with no install:

```bash
npx @electric-sql/pglite-socket --port=5433 --max-connections=10
# DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable"
```

**1. API**

```bash
cd server
cp .env.example .env          # set DATABASE_URL, optionally GEMINI_API_KEY
npm install
npx prisma migrate deploy     # create the tables
npm run start:dev             # http://localhost:3000/api
```

**2. Frontend** (in a second terminal)

```bash
cd client
cp .env.example .env          # VITE_API_URL=http://localhost:3000
npm install
npm run dev                   # http://localhost:5173
```

Open `http://localhost:5173/#/instructor` to publish a few sessions, then book one from `http://localhost:5173`.

**Smoke test** (with the API running against a throwaway database): `cd server && npm run smoke`

**Gemini key (optional):** create a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `server/.env`. Without it, Teamo uses the template message.

## Deployment

- **Database:** Neon free tier. Copy the pooled connection string.
- **API:** Render web service from `render.yaml` (root `server/`). Set `DATABASE_URL`, `CLIENT_ORIGIN` (the Vercel URL) and `GEMINI_API_KEY`. Migrations run on start with `prisma migrate deploy`.
- **Frontend:** Vercel project with root `client/` and `VITE_API_URL` set to the Render URL.

## How I used AI tools

I built this with **Claude Code**, an AI coding agent in my terminal and VS Code:

- **Research and planning.** It researched TeamLift's product (AI Champions, 1:1 instructors, Teamo) and asked me to choose the theme, stack, AI extra and hosting before writing code.
- **Scaffolding and boilerplate.** It generated the NestJS modules, DTOs, Prisma schema and migration, and the React components. I reviewed the structure and naming.
- **Verification, not just generation.** It wrote the smoke test (including the 10-way booking race) and drove a headless browser through the real UI: happy path, losing a race, and a mobile layout check. That testing caught real issues:
  - A stale slot list right after booking.
  - Lost form input after a conflict.
  - Horizontal overflow on phones.
  - A missing "everything is booked" state.
- **Keeping up with changes.** It checked current versions, which led to the Gemini 2.5 retirement, the switch to `gemini-flash-latest`, and Prisma 7's new driver-adapter setup.

My decisions included the coaching theme, enforcing no double bookings in the database rather than only in application code, keeping the LLM call separate from booking (with a fallback), and avoiding a UI library so every part of the frontend is code I can explain.

## What I'd improve with more time

- **Instructor auth.** The instructor view is open, as the brief allows. I'd add a login or at least a secret link.
- **Email and calendar invites.** Send a real confirmation email with an `.ics` file and a video link.
- **Cancel and reschedule** links for Champions, so a slot can be released again.
- **Recurring availability**, such as "every Tuesday 9–12", instead of one-off sessions.
- **Google Calendar sync** to hide slots that clash with the coach's existing events.
- **Automated tests in CI.** Turn the smoke test into Vitest + Supertest against a test database, and add Playwright for the UI.
- **Several coaches**, each with their own booking page.
