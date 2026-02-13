import crypto from "crypto";

export function generateInviteToken() {
  // 32 bytes => 64 hex chars (dugačak i siguran)
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  // sha256 je dovoljan jer token ima veliku entropiju
  return crypto.createHash("sha256").update(token).digest("hex");
}
