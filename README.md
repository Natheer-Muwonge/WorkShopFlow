# WorkshopFlow

An agentic pipeline automating the end-to-end workshop lifecycle for the Do Good Institute: request intake, ambassador matching, scheduling, confirmation, post-workshop survey, and follow-up.

**Status: sandbox / dev phase.** Points to real data that is connected to real Do Good Institute Forms, Sheets, or Calendar data. The data is reviewed in production with sign-off.

## How it works

1. **Intake** — polls a Google Form for new workshop requests
2. **Planning** — Claude looks at each workshop's current state and decides the next action (match ambassador, create calendar hold, send confirmation, send survey, send follow-up, or flag for a human)
3. **Execution** — the decided action runs against the relevant Google API (Sheets for ambassador schedule, Calendar for holds, Gmail for drafts)
4. **State tracking** — each workshop's stage persists in `data/workshops.json` between runs

All email actions create **Gmail drafts**, never send automatically. All calendar events are created as **tentative**, never with invites auto-sent. This is intentional and should stay the default until there's a real pilot agreement in place.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Google Cloud project

You should already have done this part:
- Created a project under **"No organization"** (personal Google account, not UMD Workspace)
- Enabled Forms, Calendar, Sheets, and Gmail APIs
- Configured the OAuth consent screen (External, Testing mode, your personal Gmail as test user)
- Created an OAuth Client ID (Desktop app type) and downloaded `credentials.json`

### 3. Environment variables

```bash
cp .env.example .env
```

Open `credentials.json` and copy `client_id` and `client_secret` into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Add your `ANTHROPIC_API_KEY` from console.anthropic.com.

### 4. Get a refresh token

```bash
npm run auth
```

This opens a URL — paste it into your browser, sign in with your **personal** Google account, approve access. The refresh token prints to your terminal. Paste it into `.env` as `GOOGLE_REFRESH_TOKEN`.

### 5. Set up sandbox data

Before running the pipeline for real:
- Make a **copy** of the real workshop request Form (File > Make a copy in Google Forms) into your personal Google account, and fill it with a few synthetic test responses
- Make a copy of the ambassador schedule Sheet with fake names/availability
- Use `primary` as your calendar ID (your own personal calendar) for testing, or create a separate test calendar

Put the copied Form ID and Sheet ID into `.env` as `SANDBOX_FORM_ID` and `SANDBOX_SHEET_ID`.

One more thing you'll need to fill in: open `src/index.js` and look at `QUESTION_ID_MAP`. The Forms API identifies each question by a generated ID, not its visible text — you'll need to fetch your form's structure once (`forms.get`) to map each question to its ID. Happy to help script that lookup when you get here.

### 6. Run it

```bash
npm start
```

This runs one full pass immediately (intake + planning + execution), then schedules recurring passes (new-request check every 15 min, planner pass every hour).

## Project structure

```
src/
  auth/
    googleAuth.js       OAuth client setup
    getRefreshToken.js  one-time script to obtain a refresh token
  integrations/
    forms.js            pull + normalize new request-form responses
    calendar.js          check status, create tentative holds
    sheets.js             ambassador schedule lookups, roster updates
    gmail.js               draft-only email creation
  agent/
    planner.js            Claude call: decide next action + draft email copy
    actions.js             maps planner decisions to integration calls
  state/
    workshopStore.js       simple JSON-file state tracker per workshop
  index.js                 entrypoint + cron scheduler
```

## Metrics to track for the resume bullet

Once this is running against sandbox data reliably, the numbers worth capturing:
- Number of workshops processed end-to-end without human intervention
- Time from request submission to confirmation sent (agent vs. manual baseline)
- % of decisions the planner made that you'd agree with on manual review
- Number of workshops correctly flagged for human review (no false negatives on ambiguous cases)

## Next steps before any real pilot

- [ ] Validate against sandbox data for at least a few full cycles
- [ ] Review draft email quality and planner decisions by hand
- [ ] Bring to supervisor at Do Good Institute for sign-off
- [ ] If approved: separate config for real data, still draft-only initially, graduate to real sends only after a trial period
