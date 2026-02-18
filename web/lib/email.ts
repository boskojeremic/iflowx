import { Resend } from "resend";

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
  tenantName: string;
  role: string;
};

export async function sendInviteEmail(args: InviteEmailArgs) {
  console.log("[EMAIL] HIT sendInviteEmail", { to: args.to });

  const key = process.env.RESEND_API_KEY || "";
  console.log("[EMAIL] RESEND_API_KEY present:", !!key);
  console.log("[EMAIL] RESEND_API_KEY length:", key.length);
  console.log("[EMAIL] RESEND key prefix:", key.slice(0, 6));

  if (!key) {
    throw new Error("RESEND_API_KEY is missing in runtime");
  }

  const resend = new Resend(key);

  const { to, inviteUrl, tenantName, role } = args;

  const payload = {
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
  };

  console.log("[EMAIL] sending payload meta:", {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
  });

  const result = await resend.emails.send(payload as any);

  console.log("[EMAIL] Resend result:", result);

  // Resend can return { data, error } without throwing
  const anyRes = result as any;
  if (anyRes?.error) {
    console.error("[EMAIL] Resend error:", anyRes.error);
    throw new Error(anyRes.error?.message || "RESEND_SEND_ERROR");
  }

  return { ok: true, result };
}
