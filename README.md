# Branch Appointment Booking — Backend

Node.js API and PostgreSQL service. The Next.js frontend lives in `../capitec-schedule-system-frontend`.

## Run the whole application

For the development workflow, start only infrastructure with `docker compose up -d db mailpit`. Then run the API, email worker, and frontend locally in separate terminals; see the local development steps below. Open <http://localhost:3000> for the app and <http://localhost:8025> for the Mailpit inbox.

To run the entire application in containers instead, use `docker compose up --build`.

The database schema, sample branches, and departments load on first startup. Run `npm run db:migrate` after starting PostgreSQL to apply versioned updates to an existing database. Each branch starts with Monday–Friday hours of 09:00–16:00 and 30-minute slots. Global public holidays and branch-specific closures are stored in `branch_closures`. The API generates slots for the next 90 days from each branch's hours, excluding closed dates; refreshes preserve booked slots and reconcile available slots when schedules change. After changing operating hours or closures directly in the database, run `npm run availability:refresh` to apply the new schedule immediately. Add future public holidays with a database migration when they are officially announced. Reset the local database with `docker compose down -v`.

## Local API development

Requires Node.js 20+, npm, and Docker Desktop. Start PostgreSQL and Mailpit with `docker compose up -d db mailpit`, copy `.env.example` to `.env` once, and run `npm install` in this directory. Apply database changes with `npm run db:migrate`. Start the API with `npm run dev` and the email worker with `npm run start:worker`, each in its own terminal. In `../capitec-schedule-system-frontend`, run `npm install` once and `npm run dev` in another terminal. The API and worker load their local `.env`; Next.js loads `../capitec-schedule-system-frontend/.env.local`. The Mailpit inbox is at <http://localhost:8025>.

## Code quality and tests

- `npm run lint` runs ESLint on backend source files.
- `npm test` runs Jest tests using Node's ESM support.
- `npm run test:watch` runs Jest in watch mode.

The frontend has matching `npm run lint`, `npm test`, and `npm run test:watch` commands in its project directory.

## Design

The API generates a rolling 90-day window of open slots when it starts and refreshes it daily. Calendar dates and times come from these slot rows; a conditional PostgreSQL update reserves a selected slot and writes the booking and email outbox event in one transaction. Concurrent attempts receive one success and a `409 Conflict`. The worker claims outbox rows with `FOR UPDATE SKIP LOCKED`; stale processing jobs become claimable after five minutes. It delivers confirmations to the configured SMTP server (Mailpit in the local Compose setup). The API validates customer input; authentication and booking lookup are out of scope.

## Source layout

The code is organized by feature, with HTTP, business logic, and SQL responsibilities separated within each feature:

```text
src/
  app.js                         # Express middleware and route registration
  server.js                      # API startup and shutdown
  worker.js                      # Email outbox worker process
  db/pool.js                     # Shared PostgreSQL connection pool
  shared/                         # Cross-feature errors and middleware
  modules/
    health/                      # Health endpoint layers
    branches/                    # Branch endpoint layers
    slots/                       # Slot endpoint layers
    bookings/                    # Booking endpoint and transaction workflow
    email-outbox/                # Outbox processing and persistence
```

Within an HTTP feature, routes map URLs to controllers, controllers handle HTTP input/output, services implement use cases, and repositories own SQL queries. The booking service owns its transaction and passes the transaction client to the booking repository so slot reservation, booking creation, and outbox insertion remain atomic.

## API

- `GET /health`
- `GET /api/branches`
- `GET /api/departments`
- `GET /api/slots?branchId=<uuid>&date=YYYY-MM-DD`
- `POST /api/bookings` with `{ "slotId": "<uuid>", "departmentId": "<uuid>", "customerName": "Alex Morgan", "customerEmail": "alex@example.com", "isCapitecClient": true }`

Existing databases should run `npm run db:migrate` before starting the API and worker. This applies all unapplied files in `db/migrations` in order and records them in `schema_migrations`. Existing bookings are assigned to General Enquiries during migration.
