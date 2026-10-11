# EventBench

Event feedback: organizers create surveys, share links, and review responses; attendees respond without an account. The entire application is in English, including validation messages, demo content, and AI-generated summaries. See [AGENTS.md](AGENTS.md) for the naming and language conventions.

Angular 21 frontend + Express 5/TypeScript backend. Data lives in the RAM of a single server. Restarting clears accounts, sessions, surveys, contacts, and submissions. **Summarize** calls Gemma through the Gemini API and processes all submissions for the selected survey. A Kaggle notebook and usefulness evaluation remain future hackathon work.

## Getting started

Node 24 LTS is recommended; Node 22.12+ is also supported. You need npm and two terminals.

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Set GEMINI_API_KEY in .env before starting if you want AI summaries.
npm run dev
```

In another terminal, from the project root:

```powershell
cd frontend
npm ci
npm start
```

Open **http://localhost:4200**. API health: http://localhost:3000/api/health. The Angular proxy forwards `/api` requests to the backend on port 3000.

The backend automatically loads `backend/.env`; existing environment variables take precedence. `PORT` and `PUBLIC_APP_URL` default to 3000 and `http://localhost:4200`. To access the app from another device, set a reachable LAN address before starting the backend:

```powershell
$env:PUBLIC_APP_URL = 'http://192.168.1.10:4200'
npm run dev
```

For AI, set a Google AI Studio key in `GEMINI_API_KEY`. The key stays in the ignored `backend/.env` and is never sent to the browser. `GEMMA_MODEL=gemma-4-26b-a4b-it` selects the Gemma model, and `SUMMARY_TIMEOUT_MS=120000` sets the overall summarization timeout. Restart the backend after changing configuration. Google documents Gemma access through the [Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

Summaries use a snapshot of survey responses, resolve checkbox IDs into option labels, and exclude contact emails and login data. Larger inputs are processed in batches and their findings merged. Independent analysis batches run concurrently, with at most three requests at a time sharing the overall timeout; failed jobs cancel their outstanding requests. Repeated identical classifications are counted once; conflicting classifications still fail validation. The interface shows the number of processed submissions, generation time, and model; refreshing responses marks an outdated summary. Without a key, the rest of the application works and **Summarize** displays a configuration error. Summaries remain in the current view and are not saved to disk. Free-text questions and responses can contain personal information entered by their authors; separately collected contact details are excluded from the AI payload. AI narrative output is requested in English regardless of input language; quoted source responses retain their original text.

## Comparisons and manual demo

Summaries compare the selected event with the organizer's other surveys across six criteria, show exact choice analytics, and let you click findings to inspect their source responses. Criterion scores are AI assessments; choice percentages are calculated directly by the backend. Other organizers' events are excluded.

With the backend running:

```powershell
node backend/scripts/seed-demo.mjs
```

Log in at http://localhost:4200 with **demo@eventbench.test** / **Seminar123!**. The script creates three demo seminars with six synthetic submissions each. Open **Demo · AI seminar — cold room**, click **Summarize**, then click the temperature finding. Source responses appear below the finding, followed by comparisons and percentages. Restarting clears memory; rerun the demo script to restore the data. `node backend/scripts/check-demo-summary.mjs` optionally makes a real summary API request.

## Verification

From the project root:

```powershell
npm ci
npm test
npm run build
npm run test:e2e
```

E2E tests use installed Microsoft Edge and start both servers automatically when they are not already running. They use no real accounts or emails. Backend tests use an isolated RAM store; browser tests create demo data on the local server.

## Prototype behavior

- Registration, login, logout, and 24-hour sessions. Only the session token is stored in `sessionStorage`.
- Text, checkbox (multiple selections), and multiple choice (single selection) questions can be required or optional. Drafts can be edited; published surveys are locked and have a stable public link.
- Attendee emails are required, stored separately, and excluded from the organizer view. Emails are not verified, and complete anonymity is not claimed.
- The same email can submit again. Retrying an identical request does not create another submission; reusing the request key with different content returns a conflict.
- Passwords are stored as plain strings in memory, as specified in the original plan. This is a local demo prototype.

Original specification and API contract: [plan-hakaton](plan-hakaton/README.md). Progress: [tasks.md](plan-hakaton/tasks.md). Earlier verification results: [verification.md](plan-hakaton/verification.md). These historical documents describe the original prototype; the current EventBench name and English language requirement supersede their older branding and language choices.
