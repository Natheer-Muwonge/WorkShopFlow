import { createWorkshopEvent } from "../integrations/calendar.js";
import { getAmbassadorSchedule } from "../integrations/sheets.js";
import { createDraft } from "../integrations/gmail.js";
import { draftEmail } from "./planner.js";

// Maps a planner decision to a real (or sandbox-safe) side effect.
// Every branch here is intentionally conservative: calendar holds are
// tentative, emails are drafts, nothing auto-sends. Tighten or loosen
// these once you trust the pipeline and have sign-off.
export async function executeAction(decision, workshopState, config) {
  const { calendarId, sandboxMode } = config;

  switch (decision.action) {
    case "match_ambassador": {
      const schedule = await getAmbassadorSchedule(config.sheetId);
      const available = schedule.find((a) => a.available);
      return { type: "match_ambassador", matched: available || null };
    }

    case "create_calendar_hold": {
      const event = await createWorkshopEvent(calendarId, {
        summary: `Workshop: ${workshopState.workshopTopic}`,
        description: `Requested by ${workshopState.requesterName} for ${workshopState.className}`,
        start: workshopState.proposedStart,
        end: workshopState.proposedEnd,
        attendeeEmail: sandboxMode ? undefined : workshopState.requesterEmail,
      });
      return { type: "create_calendar_hold", event };
    }

    case "send_confirmation":
    case "send_survey":
    case "send_followup": {
      const typeMap = {
        send_confirmation: "confirmation",
        send_survey: "survey",
        send_followup: "followup",
      };
      const body = await draftEmail({ type: typeMap[decision.action], workshopState });
      const draft = await createDraft({
        to: workshopState.requesterEmail,
        subject: `Do Good Institute Workshop: ${workshopState.workshopTopic}`,
        body,
      });
      return { type: decision.action, draftId: draft.id };
    }

    case "flag_for_human":
      console.log(`[FLAGGED] ${workshopState.responseId}: ${decision.reasoning}`);
      return { type: "flag_for_human", reasoning: decision.reasoning };

    case "wait":
    default:
      return { type: "wait" };
  }
}
