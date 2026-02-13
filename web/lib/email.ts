import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  tenantName: string;
  role: string;
}) {
  
  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  if (!from) throw new Error("EMAIL_FROM missing");

  const { to, inviteUrl, tenantName, role } = params;

  const subject = `You're invited to ${tenantName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4">
      <h2>Invite to ${tenantName}</h2>
      <p>You have been invited with role: <b>${role}</b>.</p>
      <p>
        Click this link to set your password and activate your access:
      </p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:8px">
          Accept Invite
        </a>
      </p>
      <p style="color:#666;font-size:12px">
        If you didn’t expect this invite, you can ignore this email.
      </p>
      <hr />
      <p style="font-size:12px;color:#666">
        Or copy/paste this URL: <br />
        <code>${inviteUrl}</code>
      </p>
    </div>
  `;

  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
 
}
