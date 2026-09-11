import { google } from "googleapis";
import { getOAuthClient } from "../auth/googleAuth.js";

// Checks whether a workshop request already has a matching calendar event,
// and what its current status is (confirmed / tentative / canceled).
export async function findMatchingEvent(calendarId, className, dateRangeStart, dateRangeEnd) {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId,
    timeMin: dateRangeStart,
    timeMax: dateRangeEnd,
    q: className,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}

// Creates a tentative calendar hold for a new workshop request once an
// ambassador has been matched. Status stays "tentative" until the
// confirmation step runs.
export async function createWorkshopEvent(calendarId, { summary, description, start, end, attendeeEmail }) {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary,
    description,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    status: "tentative",
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: "none", // sandbox: never auto-send calendar invites yet
  });

  return res.data;
}
