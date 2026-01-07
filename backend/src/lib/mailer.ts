import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerifyEmail(to: string, verifyUrl: string) {
  // If email config missing, just log and exit (do not crash signup/login)
  if (!process.env.RESEND_API_KEY) {
    console.warn("sendVerifyEmail skipped: RESEND_API_KEY missing");
    return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }
  if (!process.env.EMAIL_FROM) {
    console.warn("sendVerifyEmail skipped: EMAIL_FROM missing");
    return { ok: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  const subject = "Verify your email for StoryVerse";

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.4">
    <h2>Verify your email</h2>
    <p>Click the button below to verify your email address.</p>
    <p style="margin: 20px 0;">
      <a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">
        Verify Email
      </a>
    </p>
    <p>If the button doesn't work, open this link:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="color:#666;font-size:12px">This link expires in 24 hours.</p>
  </div>`;

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [to],
      subject,
      html,
    });

    if (error) {
      // ✅ do not throw — just log and return
      console.error("Resend error:", error);
      return { ok: false, skipped: false, reason: JSON.stringify(error) };
    }

    return { ok: true };
  } catch (e: any) {
    // ✅ do not throw — just log and return
    console.error("Resend exception:", e);
    return { ok: false, skipped: false, reason: e?.message || "unknown" };
  }
}
