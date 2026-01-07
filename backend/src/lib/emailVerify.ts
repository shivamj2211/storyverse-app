import crypto from "crypto";

export function makeEmailVerifyToken() {
  // raw token (send to user)
  const raw = crypto.randomBytes(32).toString("hex");
  // store hash in DB
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  // 24 hours expiry
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return { raw, hash, expiresAt };
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
