import { Resend } from "resend";

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
  tenantName: string;
  tenantCode?: string;
  role: string;

  // ✅ license info
  productName?: string; // default: IFlowX
  licenseStart: Date;
  licenseEnd: Date;
  issuedTo: string; // email
  issuedBy?: string; // optional (npr. "IFlowX Admin")
};

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fmtDate(d: Date) {
  // yyyy-mm-dd
  return new Date(d).toISOString().slice(0, 10);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendInviteEmail(args: InviteEmailArgs) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY missing - skipping email send");
    return { ok: false, skipped: true };
  }

  const {
    to,
    inviteUrl,
    tenantName,
    tenantCode,
    role,
    productName = "IFlowX",
    licenseStart,
    licenseEnd,
    issuedTo,
    issuedBy = "IFlowX",
  } = args;

  const startStr = fmtDate(licenseStart);
  const endStr = fmtDate(licenseEnd);

  const tenantLabel = tenantCode ? `${tenantName} (${tenantCode})` : tenantName;

  const subject = `${productName} access invitation — ${tenantName}`;

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5; color:#111;">
    <h2 style="margin:0 0 12px 0;">You’ve been invited to ${esc(productName)}</h2>

    <p style="margin:0 0 12px 0;">
      ${esc(issuedBy)} has assigned an access license for <b>${esc(productName)}</b> under tenant <b>${esc(tenantLabel)}</b>.
    </p>

    <div style="border:1px solid rgba(0,0,0,0.12); border-radius:12px; padding:14px; margin:14px 0;">
      <div><b>License holder (assigned to):</b> ${esc(issuedTo)}</div>
      <div><b>Tenant:</b> ${esc(tenantLabel)}</div>
      <div><b>Role:</b> ${esc(role)}</div>
      <div><b>License start:</b> ${esc(startStr)}</div>
      <div><b>License end:</b> ${esc(endStr)}</div>
    </div>

    <p style="margin:0 0 12px 0;">
      To activate your access, please complete registration using the button below:
    </p>

    <p style="margin:16px 0;">
      <a href="${inviteUrl}"
        style="display:inline-block;padding:10px 14px;border-radius:10px;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;">
        Accept invitation
      </a>
    </p>

    <p style="margin:0 0 6px 0; font-size:13px; color:#444;">
      If the button does not work, open this link:
    </p>
    <p style="margin:0; font-size:13px;">
      <a href="${inviteUrl}">${inviteUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.08); margin:18px 0;" />

    <p style="margin:0; font-size:12px; color:#666;">
      This invitation link is unique and will expire on <b>${esc(endStr)}</b>.
      If you didn’t expect this email, you can ignore it.
    </p>
  </div>
  `;

  await resend.emails.send({
  from: "IFlowX <no-reply@mail.dig-ops.com>",
  to,
  subject: `IFlowX access invitation — ${tenantName}`,
  html: html,

  headers: {
    "List-Unsubscribe": "<mailto:no-reply@dig-ops.com>",
  },
});

  return { ok: true };
}
