// ─── Shared layout pieces ─────────────────────────────────────────────────────

const LOGO_HEADER = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="padding:28px 32px 20px 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="https://www.muscleboxpro.com/assets/logo_mini.png" alt="MuscleBoxPro" height="36" style="height:36px;width:auto;display:block;">
            </td>
            <td style="vertical-align:middle;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:1.5px;color:#FF512F;line-height:1;">MUSCLEBOXPRO</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px;"><div style="height:1px;background:#e5e5e5;"></div></td>
    </tr>
  </table>`;

const EMAIL_FOOTER = `
  <tr>
    <td style="padding:24px 32px 32px 32px;">
      <div style="height:1px;background:#e5e5e5;margin-bottom:20px;"></div>
      <p style="margin:0 0 6px 0;color:#999999;font-size:12px;line-height:1.5;">
        This is a message from the MuscleBoxPro team.
      </p>
      <p style="margin:0;color:#bbbbbb;font-size:11px;line-height:1.5;">
        &copy; 2026 MuscleBoxPro &mdash; BlendBox Innovations LLP &middot;
        <a href="https://www.muscleboxpro.com" style="color:#FF512F;text-decoration:none;">muscleboxpro.com</a>
      </p>
    </td>
  </tr>`;

function wrapCard(innerRows) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="background:linear-gradient(90deg,#DD2476,#FF512F);height:4px;border-radius:4px 4px 0 0;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${LOGO_HEADER}
                ${innerRows}
                ${EMAIL_FOOTER}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoCard(rows) {
  const rowsHtml = rows.map(([label, value], i) => `
    <tr><td style="padding:10px 18px;${i < rows.length - 1 ? "border-bottom:1px solid #ebebeb;" : ""}">
      <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">${label}</span>
      <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${value}</div>
    </td></tr>`).join("");
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:6px 0 2px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowsHtml}</table>
      </td></tr>
    </table>`;
}

function darkBox(label, body) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1e1510;border:1px solid #3d2e10;border-radius:8px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 4px 0;color:#FF512F;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
        <p style="margin:0;color:#a07a50;font-size:13px;line-height:1.6;">${body}</p>
      </td></tr>
    </table>`;
}

function signOff() {
  return `
    <tr>
      <td style="padding:16px 32px 4px 32px;">
        <p style="margin:0 0 2px 0;color:#111111;font-size:14px;font-weight:700;">Best regards,</p>
        <p style="margin:0;color:#FF512F;font-size:14px;font-weight:700;">MuscleBoxPro Team</p>
      </td>
    </tr>`;
}

// ─── Template definitions ─────────────────────────────────────────────────────
// Each entry has:
//   name     — display name in the UI dropdown
//   subject  — function(email) → default subject string
//   fields   — array of { key, label, type: 'input'|'textarea', default(email) }
//   build    — function(fields) → plain-text body (for preview/basic fallback)
//   buildHtml— function(fields) → full branded HTML string

const TEMPLATES = {
  region: {
    name: "Region Not Operational",
    subject: (m) => `Re: ${m.subject.replace(/^Re:\s*/i, "")}`,
    fields: [
      { key: "name",   label: "Recipient Name",             type: "input",    default: (m) => m.from.name || m.from.address.split("@")[0] },
      { key: "region", label: "Region / State",             type: "input",    default: () => "Andhra Pradesh" },
      { key: "extra",  label: "Additional note (optional)", type: "textarea", default: () => "" },
    ],
    build: (f) => [
      `Hi ${f.name},`,
      "",
      "Thank you for your interest in MuscleBoxPro and for requesting a demo. We truly appreciate your enthusiasm for bringing a protein shake vending solution to your gym.",
      "",
      `At present, our operations are focused on select regions, and we have not yet started operations in ${f.region}. However, we are actively evaluating expansion into new states in the future.`,
      "",
      "That said, if you are interested in setting up a protein shake vending machine independently, we can certainly assist you in procuring a suitable machine and guiding you on setup and operation. This arrangement would be managed directly by you and would not operate under the MuscleBoxPro brand.",
      "",
      "If this option interests you, please let us know, and we can share further details regarding machine specifications, cost, and supplier options.",
      ...(f.extra ? ["", f.extra] : []),
      "",
      "We sincerely appreciate your interest and hope to collaborate in some capacity.",
      "",
      "Best regards,",
      "MuscleBoxPro Team",
    ].join("\n"),
    buildHtml: (f) => wrapCard(`
      <tr>
        <td style="padding:28px 32px 12px 32px;">
          <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Thank you for your interest</h1>
          <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
            Hi <strong style="color:#111111;">${f.name}</strong>, thank you for your interest in MuscleBoxPro and for requesting a demo. We truly appreciate your enthusiasm for bringing a protein shake vending solution to your gym.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0 32px;">
          ${darkBox("Region Update", `At present, our operations are focused on select regions, and we have not yet started operations in <strong style="color:#e0a060;">${f.region}</strong>. However, we are actively evaluating expansion into new states in the future.`)}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0 32px;">
          <p style="margin:0 0 14px 0;color:#555555;font-size:15px;line-height:1.75;">That said, if you are interested in setting up a protein shake vending machine independently, we can certainly assist you in procuring a suitable machine and guiding you on setup and operation.</p>
          <p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">This arrangement would be managed directly by you and would <strong style="color:#111111;">not operate under the MuscleBoxPro brand</strong>.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0 32px;">
          ${infoCard([
            ["Option Available", "Independent Machine Setup"],
            ["What we can help with", "Machine procurement, setup guidance &amp; operational support"],
            ["Next Step", "Reply to this email to receive machine specifications, cost details &amp; supplier options"],
          ])}
        </td>
      </tr>
      ${f.extra ? `<tr><td style="padding:16px 32px 0 32px;"><p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">${f.extra.replace(/\n/g, "<br>")}</p></td></tr>` : ""}
      <tr>
        <td style="padding:20px 32px 0 32px;">
          <p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">We sincerely appreciate your interest and hope to collaborate in some capacity.</p>
        </td>
      </tr>
      ${signOff()}`),
  },

  simple: {
    name: "Simple Message",
    subject: (m) => `Re: ${m.subject.replace(/^Re:\s*/i, "")}`,
    fields: [
      { key: "name",    label: "Recipient Name", type: "input",    default: (m) => m.from.name || m.from.address.split("@")[0] },
      { key: "message", label: "Message Body",   type: "textarea", default: () => "" },
    ],
    build: (f) => [
      `Hi ${f.name},`,
      "",
      f.message,
      "",
      "Best regards,",
      "MuscleBoxPro Team",
    ].join("\n"),
    buildHtml: (f) => wrapCard(`
      <tr>
        <td style="padding:28px 32px 0 32px;">
          <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">Hi <strong style="color:#111111;">${f.name}</strong>,</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0 32px;">
          <p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">${f.message.replace(/\n/g, "<br>")}</p>
        </td>
      </tr>
      ${signOff()}`),
  },

  followup: {
    name: "General Follow-up",
    subject: (m) => `Re: ${m.subject.replace(/^Re:\s*/i, "")}`,
    fields: [
      { key: "name",    label: "Recipient Name",                    type: "input",    default: (m) => m.from.name || m.from.address.split("@")[0] },
      { key: "context", label: "Context / Purpose",                 type: "input",    default: () => "your recent inquiry" },
      { key: "action",  label: "Proposed Next Action",              type: "input",    default: () => "schedule a call at your convenience" },
      { key: "extra",   label: "Additional details (optional)",     type: "textarea", default: () => "" },
    ],
    build: (f) => [
      `Hi ${f.name},`,
      "",
      `Thank you for reaching out regarding ${f.context}. We appreciate you taking the time to connect with us.`,
      "",
      `We would love to ${f.action}. Please let us know what works best for you.`,
      ...(f.extra ? ["", f.extra] : []),
      "",
      "Looking forward to hearing from you.",
      "",
      "Best regards,",
      "MuscleBoxPro Team",
    ].join("\n"),
    buildHtml: (f) => wrapCard(`
      <tr>
        <td style="padding:28px 32px 12px 32px;">
          <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
            Hi <strong style="color:#111111;">${f.name}</strong>, thank you for reaching out regarding <strong style="color:#111111;">${f.context}</strong>. We appreciate you taking the time to connect with us.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0 32px;">
          <p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">We would love to <strong style="color:#111111;">${f.action}</strong>. Please let us know what works best for you.</p>
        </td>
      </tr>
      ${f.extra ? `<tr><td style="padding:20px 32px 0 32px;"><p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">${f.extra.replace(/\n/g, "<br>")}</p></td></tr>` : ""}
      <tr>
        <td style="padding:20px 32px 0 32px;">
          <p style="margin:0;color:#555555;font-size:15px;line-height:1.75;">Looking forward to hearing from you.</p>
        </td>
      </tr>
      ${signOff()}`),
  },
};

// ─── Exports ──────────────────────────────────────────────────────────────────

function buildTemplateHtml(templateKey, fields) {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) return null;
  return tpl.buildHtml(fields);
}

module.exports = { TEMPLATES, buildTemplateHtml };
