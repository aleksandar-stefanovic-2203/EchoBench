# EchoBench

EchoBench helps event organizers review large volumes of attendee feedback without having to read every response one by one. With a single click, organizers can summarize feedback across their surveys into one concise overview, see what went well and what could be improved with supporting attendee comments, and compare their event with their other events.

Organizers create and publish surveys and share a public link; attendees can submit feedback without creating an account.

The application has an Angular frontend and an Express/TypeScript API. Survey data is held in server memory, so restarting the backend clears accounts, sessions, surveys, and submissions. This is a local demo prototype, not a production service.

## Requirements

- Node.js 22.12 or later (Node.js 24 LTS recommended)
- npm

## Run locally

Install dependencies and start the backend:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run dev
```

In a second terminal, install frontend dependencies and start the frontend:

```powershell
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). The backend health endpoint is [http://localhost:3000/api/health](http://localhost:3000/api/health). The Angular development server proxies `/api` requests to the backend.

The API reads configuration from `backend/.env`; environment variables already set in the process take precedence. `PORT` defaults to `3000`, and `PUBLIC_APP_URL` defaults to `http://localhost:4200`.

### AI summaries

AI summaries use Gemma through the Gemini API. Add a Google AI Studio key to `GEMINI_API_KEY` in `backend/.env`, then restart the backend. Without a key, the rest of the application works, but the summary action reports a configuration error.

Optional settings:

```dotenv
GEMMA_MODEL=gemma-4-26b-a4b-it
SUMMARY_TIMEOUT_MS=120000
```

Keep API keys and other credentials private. Review `backend/.env` before staging or committing files.

## Features

- Organizer registration, login, logout, and 24-hour sessions.
- Draft surveys with text, checkbox, and multiple-choice questions.
- Published surveys with shareable public links; published surveys are locked from editing.
- Attendee submissions without an account. An email address is collected separately from responses and is not shown in the organizer's response view.
- Response summaries with cited source responses, comparisons across the organizer's surveys, and choice analytics.

Summaries are generated from a snapshot of responses and are not saved. Contact emails and login data are excluded from the AI payload. Free-text answers may contain personal information entered by respondents.

## Demo data

Start the backend first, then run a seeding script from the project root:

```powershell
node backend/scripts/seed-demo.mjs
```

This creates three demo seminars with synthetic submissions. Sign in using `demo@eventbench.test` / `Seminar123!` to explore the organizer experience.

For a larger synthetic dataset:

```powershell
node backend/scripts/seed-load-demo.mjs
```

Demo data is held in memory and is cleared when the backend restarts. The load-demo script creates accounts with the password `Demo123!`.

## Tests and build

Run commands from the project root:

```powershell
npm ci
npm test
npm run build
npm run test:e2e
```

The root package provides the end-to-end Playwright test script. Backend tests use an isolated in-memory store. Browser tests use Microsoft Edge and the local application.

## Project structure

- `backend/` — Express API, in-memory data store, tests, and demo scripts.
- `frontend/` — Angular application.
- `e2e/` — Playwright end-to-end tests.
- `plan-hackathon/` — project planning and historical hackathon documentation.
- `theme-images/` — source images for the hackathon theme documentation.
