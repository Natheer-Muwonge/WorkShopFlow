import { google } from "googleapis";
import { getOAuthClient } from "../auth/googleAuth.js";

// Creates a Gmail DRAFT rather than sending. This is intentional for the
// sandbox phase - you review every draft by hand before anything goes
// out, and it's the safest default even after launch. Flip to actual
// sending only after supervisor sign-off and with an explicit config flag,
// not by changing this function's default behavior.
export async function createDraft({ to, subject, body }) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw: encodedMessage },
    },
  });

  return res.data;
}
