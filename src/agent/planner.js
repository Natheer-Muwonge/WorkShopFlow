import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The core agent step: given a workshop's current state (form data,
// calendar status, ambassador availability, days-since-workshop, etc.),
// Claude decides what the next action should be and returns structured
// JSON. actions.js then maps that decision to an actual integration call.
//
// Keeping this as one well-defined decision point (rather than one big
// prompt that tries to do everything) is what makes this "agentic"
// rather than a single classifier call - it's called repeatedly as state
// changes, and the decision space grows as you add capabilities.
export async function decideNextAction(workshopState) {
  const systemPrompt = `You are an operations agent for a university civic engagement institute's workshop program. Given the current state of a single workshop request, decide the single next action to take.

Valid actions and when to use them:
- "match_ambassador": form request exists, no ambassador assigned yet
- "create_calendar_hold": ambassador matched, no calendar event yet
- "send_confirmation": calendar event exists and is tentative, confirmation not yet sent
- "send_survey": workshop date has passed, survey not yet sent
- "send_followup": survey sent 3+ days ago with no response, or survey responded to and follow-up not yet sent
- "wait": nothing actionable right now
- "flag_for_human": anything ambiguous, conflicting, or outside normal parameters (double-booked ambassador, missing required info, unusual request)

Respond with ONLY a JSON object, no other text:
{
  "action": "<one of the actions above>",
  "reasoning": "<one sentence why>",
  "requiresHumanReview": <boolean - true for anything touching real student/instructor data or send actions until the pilot is approved>
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Current workshop state:\n${JSON.stringify(workshopState, null, 2)}`,
      },
    ],
  });

  const text = response.content.find((block) => block.type === "text")?.text || "{}";

  try {
    return JSON.parse(text);
  } catch {
    return { action: "flag_for_human", reasoning: "Could not parse planner output", requiresHumanReview: true };
  }
}

// Used for the confirmation/survey/follow-up email bodies. Kept separate
// from decideNextAction so drafting logic can be iterated on independently
// of the planning logic.
export async function draftEmail({ type, workshopState }) {
  const prompts = {
    confirmation: `Draft a short, warm confirmation email to a class requester confirming their workshop is scheduled. Include the topic, date, and ambassador name. No em dashes.`,
    survey: `Draft a brief email to a workshop instructor asking them to complete a short feedback survey now that the workshop has happened. No em dashes.`,
    followup: `Draft a brief follow-up email to a class that received a workshop, thanking them and inviting them to request future sessions. No em dashes.`,
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: prompts[type],
    messages: [
      {
        role: "user",
        content: `Workshop details:\n${JSON.stringify(workshopState, null, 2)}`,
      },
    ],
  });

  return response.content.find((block) => block.type === "text")?.text || "";
}
