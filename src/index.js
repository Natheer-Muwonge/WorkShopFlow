import cron from "node-cron";
import dotenv from "dotenv";
import { getNewFormResponses, normalizeFormResponse } from "./integrations/forms.js";
import { decideNextAction } from "./agent/planner.js";
import { executeAction } from "./agent/actions.js";
import { getWorkshop, upsertWorkshop, getAllWorkshops } from "./state/workshopStore.js";

dotenv.config();

const config = {
  calendarId: process.env.SANDBOX_CALENDAR_ID,
  sheetId: process.env.SANDBOX_SHEET_ID,
  sandboxMode: process.env.SANDBOX_MODE !== "false",
};

// TODO: fill this in once you've copied the real form into your sandbox
// and inspected its actual question IDs (Forms API gives you these, not
// the visible question text - see forms.js).
const QUESTION_ID_MAP = {
  requesterName: "",
  requesterEmail: "",
  className: "",
  preferredDates: "",
  workshopTopic: "",
};

async function processNewRequests() {
  console.log(`[${new Date().toISOString()}] Checking for new form responses...`);

  const rawResponses = await getNewFormResponses(process.env.SANDBOX_FORM_ID);

  for (const raw of rawResponses) {
    const normalized = normalizeFormResponse(raw, QUESTION_ID_MAP);
    const existing = await getWorkshop(normalized.responseId);

    if (existing) continue; // already tracked, skip intake

    await upsertWorkshop(normalized.responseId, { ...normalized, stage: "intake" });
    console.log(`New workshop tracked: ${normalized.responseId}`);
  }
}

async function runPlannerPass() {
  console.log(`[${new Date().toISOString()}] Running planner pass over tracked workshops...`);

  const all = await getAllWorkshops();

  for (const [responseId, workshopState] of Object.entries(all)) {
    const decision = await decideNextAction(workshopState);
    console.log(`${responseId}: ${decision.action} — ${decision.reasoning}`);

    if (decision.requiresHumanReview && !config.sandboxMode) {
      console.log(`  -> requires human review, skipping auto-execution`);
      continue;
    }

    const result = await executeAction(decision, workshopState, config);
    await upsertWorkshop(responseId, { lastAction: decision.action, lastResult: result });
  }
}

// Sandbox: run once immediately so you can see it work without waiting
// on the cron schedule.
console.log(`WorkshopFlow starting in ${config.sandboxMode ? "SANDBOX" : "LIVE"} mode.\n`);
await processNewRequests();
await runPlannerPass();

// Then check for new requests every 15 min, and run the planner pass
// every hour. Adjust once you know real timing needs.
cron.schedule("*/15 * * * *", processNewRequests);
cron.schedule("0 * * * *", runPlannerPass);

console.log("\nScheduled: checking for new requests every 15 min, planner pass every hour.");
