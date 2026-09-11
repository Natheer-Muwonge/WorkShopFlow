import { google } from "googleapis";
import { getOAuthClient } from "../auth/googleAuth.js";

// Pulls new workshop request responses from the intake Google Form.
// In sandbox mode this points at SANDBOX_FORM_ID, a copy of the real
// request form populated with synthetic data.
export async function getNewFormResponses(formId, sinceTimestamp) {
  const auth = getOAuthClient();
  const forms = google.forms({ version: "v1", auth });

  const res = await forms.forms.responses.list({ formId });
  const responses = res.data.responses || [];

  if (!sinceTimestamp) return responses;

  return responses.filter(
    (r) => new Date(r.lastSubmittedTime) > new Date(sinceTimestamp)
  );
}

// Normalizes a raw Forms response into the shape the agent works with.
// You'll need to adjust the questionId mapping to match your actual form
// once you've copied it into the sandbox (Forms API keys answers by a
// generated questionId, not the visible question text).
export function normalizeFormResponse(rawResponse, questionIdMap) {
  const answers = rawResponse.answers || {};

  return {
    responseId: rawResponse.responseId,
    submittedAt: rawResponse.lastSubmittedTime,
    requesterName: answers[questionIdMap.requesterName]?.textAnswers?.answers[0]?.value,
    requesterEmail: answers[questionIdMap.requesterEmail]?.textAnswers?.answers[0]?.value,
    className: answers[questionIdMap.className]?.textAnswers?.answers[0]?.value,
    preferredDates: answers[questionIdMap.preferredDates]?.textAnswers?.answers.map(
      (a) => a.value
    ),
    workshopTopic: answers[questionIdMap.workshopTopic]?.textAnswers?.answers[0]?.value,
  };
}
