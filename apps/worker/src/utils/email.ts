// Sends transactional email via Resend. Degrades gracefully if RESEND_API_KEY
// is not set — the flow still works, owner sees the request in-app.

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  payload: EmailPayload,
  resendApiKey: string | undefined,
): Promise<void> {
  if (!resendApiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MishiPass <notifications@mishipass.com>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  }).catch(() => {
    // never let email errors propagate to the request
  });
}
