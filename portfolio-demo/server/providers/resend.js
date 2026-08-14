// Sends an email with a file attached via Resend (https://resend.com).
// Free tier: 100 emails/day, no credit card needed. Uses Resend's shared
// "onboarding@resend.dev" sender by default, which works with zero DNS/domain
// setup — fine for a low-volume internal report like this one.
export async function sendEmailWithAttachment({ to, subject, text, filename, buffer, contentType }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const err = new Error("RESEND_API_KEY isn't configured — see server/.env.example.");
    err.status = 501;
    throw err;
  }
  if (!to) {
    const err = new Error("DAILY_REPORT_EMAIL isn't configured — see server/.env.example.");
    err.status = 501;
    throw err;
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Titan Wealth <onboarding@resend.dev>",
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject,
      text,
      attachments: [
        {
          filename,
          content: buffer.toString("base64"),
        },
      ],
    }),
  });

  const bodyText = await resp.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* not JSON */ }

  if (!resp.ok) {
    const detail = data?.message || bodyText.slice(0, 300) || "(no body)";
    const err = new Error(`Resend HTTP ${resp.status}: ${detail}`);
    err.status = 502;
    throw err;
  }
  return data;
}
