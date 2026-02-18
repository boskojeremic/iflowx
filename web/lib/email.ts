import { Resend } from "resend";

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
  tenantName: string;
  role: string;
};

function getResend() {
  const key = process.env.RESEND_API_KEY;

  // Hard fail in production so we don't silently "skip"
  if (!key) {
    const msg = "RESEND_API_KEY is missing";
    console.error("[EMAIL]", msg, { nodeEnv: process.env.NODE_ENV });
    throw new Error(msg);
  }

  return new Resend(key);
}

export async function sendInviteEmail(args: InviteEmailArgs) {
  console.log("[EMAIL] sendInviteEmail HIT", {
    to: args.to,
    tenantName: args.tenantName,
    role: args.role,
  });

  const resend = getResend();

  const { to, inviteUrl, tenantName, role } = args;

  const result = await resend.emails.send({
    from: "GHG App <no-reply@dig-ops.com>",
    to,
    subject: `Invitation to ${tenantName}`,
    html: `
      <p>You have been invited to <b>${tenantName}</b> as <b>${role}</b>.</p>
      <p style="margin:16px 0">
        <a href="${inviteUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none;">
          Accept invitation
        </a>
      </p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    `,
  });

  console.log("[EMAIL] Resend result:", result);

  // Resend SDK often returns { data, error }
  const anyRes = result as any;
  if (anyRes?.error) {
    console.error("[EMAIL] Resend error:", anyRes.error);
    throw new Error(anyRes.error?.message || "RESEND_SEND_ERROR");
  }

  return { ok: true, result };
}
