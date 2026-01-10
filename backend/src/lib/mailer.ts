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

/**
 * Send email verification link
 */
export async function sendVerifyEmail(to: string, verifyUrl: string) {
  if (!process.env.EMAIL_FROM) {
    console.warn("sendVerifyEmail skipped: EMAIL_FROM missing");
    return { ok: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

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

/**
 * ✅ Send temporary password for "Forgot Password" flow
 */
export async function sendTempPasswordEmail(to: string, tempPassword: string) {
  if (!process.env.EMAIL_FROM) {
    console.warn("sendTempPasswordEmail skipped: EMAIL_FROM missing");
    return { ok: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  const client = getResend();
  if (!client) {
    console.warn("sendTempPasswordEmail skipped: RESEND_API_KEY missing");
    return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }

  const subject = "Your temporary StoryVerse password";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5">
      <h2>Temporary Password</h2>

      <p>You requested to reset your StoryVerse password.</p>

      <p style="margin:16px 0;">
        <strong>Your temporary password:</strong>
      </p>

      <div style="
        font-size:20px;
        font-weight:bold;
        letter-spacing:1px;
        background:#f3f4f6;
        padding:12px;
        border-radius:8px;
        display:inline-block;
      ">
        ${tempPassword}
      </div>

      <p style="margin-top:20px;">
        ⏰ This password will expire in <strong>30 minutes</strong>.
      </p>

      <p>
        After logging in, you will be asked to <strong>change your password immediately</strong>.
      </p>

      <p style="color:#666;font-size:12px;margin-top:24px">
        If you didn’t request this, you can safely ignore this email.
      </p>
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

/**
 * ✅ Send security alert email when password is changed
 */
export async function sendPasswordChangedEmail(
  to: string,
  meta?: { ip?: string; userAgent?: string; atISO?: string }
) {
  if (!process.env.EMAIL_FROM) {
    console.warn("sendPasswordChangedEmail skipped: EMAIL_FROM missing");
    return { ok: false, skipped: true, reason: "EMAIL_FROM missing" };
  }

  const client = getResend();
  if (!client) {
    console.warn("sendPasswordChangedEmail skipped: RESEND_API_KEY missing");
    return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }

  const subject = "Your StoryVerse password was changed";

  const at = meta?.atISO ? new Date(meta.atISO) : new Date();
  const timeText = at.toLocaleString();

  const ipRow = meta?.ip ? `<tr><td style="padding:6px 0;color:#666;">IP</td><td style="padding:6px 0;"><b>${meta.ip}</b></td></tr>` : "";
  const uaRow = meta?.userAgent
    ? `<tr><td style="padding:6px 0;color:#666;">Device</td><td style="padding:6px 0;"><b>${meta.userAgent}</b></td></tr>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5">
      <h2>Password changed</h2>

      <p>Your StoryVerse account password was changed successfully.</p>

      <table style="margin:14px 0; border-collapse: collapse;">
        <tr>
          <td style="padding:6px 0;color:#666;">Time</td>
          <td style="padding:6px 0;"><b>${timeText}</b></td>
        </tr>
        ${ipRow}
        ${uaRow}
      </table>

      <div style="margin-top:16px; padding:12px; border-radius:10px; background:#fff7ed; border:1px solid #fed7aa;">
        <p style="margin:0;"><b>Wasn’t you?</b></p>
        <p style="margin:8px 0 0 0;">
          Please reset your password immediately and contact support.
        </p>
      </div>

      <p style="color:#666;font-size:12px;margin-top:18px">
        If this was you, you can ignore this email.
      </p>
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
