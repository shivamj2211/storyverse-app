import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendVerifyEmail(to: string, verifyUrl: string) {
  // ✅ EMAIL_FROM check (required)
  if (!process.env.EMAIL_FROM) {
    console.warn("sendVerifyEmail skipped: EMAIL_FROM missing");
    return { ok: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  // ✅ Lazy Resend client
  const client = getResend();
  if (!client) {
    console.warn("sendVerifyEmail skipped: RESEND_API_KEY missing");
    return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }

  const subject = "Verify your email for StoryVerse";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4">
      <h2>Verify your email</h2>
      <p>Click the button below to verify your email address.</p>
      <p style="margin: 20px 0;">
        <a href="${verifyUrl}"
           style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
      </p>
      <p>If the button doesn't work, open this link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#666;font-size:12px">This link expires in 24 hours.</p>
    </div>
  `;

  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { ok: false, skipped: false, reason: JSON.stringify(error) };
    }

    return { ok: true };
  } catch (e: any) {
    console.error("Resend exception:", e);
    return { ok: false, skipped: false, reason: e?.message || "unknown" };
  }
}
