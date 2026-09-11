import { google } from "googleapis";
import { getOAuthClient } from "../auth/googleAuth.js";

// Reads the ambassador schedule sheet to find who's available for a given
// date/time slot. Assumes a simple layout: columns = Name, Day, StartTime,
// EndTime, Available (TRUE/FALSE). Adjust the range once your sandbox
// sheet's real layout is set up.
export async function getAmbassadorSchedule(sheetId, range = "Ambassadors!A2:E") {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values || [];

  return rows.map(([name, day, startTime, endTime, available]) => ({
    name,
    day,
    startTime,
    endTime,
    available: available === "TRUE",
  }));
}

// Appends a completed workshop to the master roster/tracking sheet -
// mirrors the manual "update tabs for workshops that are completed" task.
export async function appendToMasterRoster(sheetId, rowValues, range = "MasterRoster!A:F") {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [rowValues] },
  });
}
