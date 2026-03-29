type VerificationTemplateInput = {
  name?: string;
  verificationUrl: string;
};

type PasswordResetTemplateInput = {
  name?: string;
  resetUrl: string;
};

type DemoRequestTemplateInput = {
  name: string;
  gymName: string;
  email: string;
  mobile: string;
  location: string;
  message?: string;
};

type CampaignRequestTemplateInput = {
  brandName: string;
  email: string;
  mobile: string;
};

type ContactRequestTemplateInput = {
  name: string;
  email: string;
  message: string;
};

// ─── Shared logo header snippet ───────────────────────────────────────────────
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

// ─── Shared footer snippet ────────────────────────────────────────────────────
const EMAIL_FOOTER = `
                <tr>
                  <td style="padding:24px 32px 32px 32px;">
                    <div style="height:1px;background:#e5e5e5;margin-bottom:20px;"></div>
                    <p style="margin:0 0 6px 0;color:#999999;font-size:12px;line-height:1.5;">
                      This is an automated email from MuscleBoxPro.
                    </p>
                    <p style="margin:0;color:#bbbbbb;font-size:11px;line-height:1.5;">
                      &copy; 2026 MuscleBoxPro &mdash; BlendBox Innovations LLP &middot;
                      <a href="https://www.muscleboxpro.com" style="color:#FF512F;text-decoration:none;">muscleboxpro.com</a>
                    </p>
                  </td>
                </tr>`;

// ─── Shared card wrapper ──────────────────────────────────────────────────────
function wrapCard(innerRows: string): string {
  return `
<!doctype html>
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

// ─── Verification ─────────────────────────────────────────────────────────────
export function getVerificationEmailTemplate(input: VerificationTemplateInput) {
  const greetingName = input.name?.trim() ? input.name.trim() : "there";
  const safeUrl = input.verificationUrl;

  const subject = "Verify your MuscleBoxPro account";

  const text = [
    `Hi ${greetingName},`,
    "",
    "Thanks for signing up for MuscleBoxPro.",
    "Please verify your email address by opening the link below:",
    safeUrl,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = wrapCard(`
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Verify your email</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${greetingName}</strong>, thanks for signing up. Please confirm your email address to activate your account and start your fitness journey.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 8px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:10px;background:#FF512F;">
                          <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(90deg,#DD2476,#FF512F);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;padding:14px 28px;border-radius:10px;white-space:nowrap;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <p style="margin:0 0 6px 0;color:#888888;font-size:12px;line-height:1.5;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;word-break:break-all;">
                      <a href="${safeUrl}" style="color:#FF512F;font-size:12px;text-decoration:underline;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <p style="margin:0;color:#888888;font-size:12px;line-height:1.5;">
                      If you did not create this account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>`);

  return { subject, text, html };
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export function getPasswordResetEmailTemplate(input: PasswordResetTemplateInput) {
  const greetingName = input.name?.trim() ? input.name.trim() : "there";
  const safeUrl = input.resetUrl;

  const subject = "Reset your MuscleBoxPro password";

  const text = [
    `Hi ${greetingName},`,
    "",
    "We received a request to reset your MuscleBoxPro password.",
    "Open the link below to set a new password:",
    safeUrl,
    "",
    "This link expires in 1 hour. If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = wrapCard(`
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Reset your password</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${greetingName}</strong>, we received a request to reset your MuscleBoxPro password. Click the button below to set a new one.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 8px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:10px;background:#FF512F;">
                          <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(90deg,#DD2476,#FF512F);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;padding:14px 28px;border-radius:10px;white-space:nowrap;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#251818;border:1px solid #3d2020;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;">
                          <p style="margin:0;color:#f87171;font-size:13px;line-height:1.5;">
                            This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email &mdash; your account remains secure.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 0 32px;">
                    <p style="margin:0 0 6px 0;color:#888888;font-size:12px;line-height:1.5;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;word-break:break-all;">
                      <a href="${safeUrl}" style="color:#FF512F;font-size:12px;text-decoration:underline;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>`);

  return { subject, text, html };
}

// ─── Demo Request ─────────────────────────────────────────────────────────────
export function getDemoRequestEmailTemplate(input: DemoRequestTemplateInput) {
  const subject = "Your MuscleBoxPro demo request is received";
  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for requesting a free demo with MuscleBoxPro.",
    "Our team will contact you shortly to schedule the next steps.",
    "",
    `Gym: ${input.gymName}`,
    `Email: ${input.email}`,
    `Mobile: ${input.mobile}`,
    `Location: ${input.location}`,
    input.message ? `Message: ${input.message}` : "",
    "",
    "Regards,",
    "MuscleBoxPro Team",
  ]
    .filter(Boolean)
    .join("\n");

  const html = wrapCard(`
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Demo request received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${input.name}</strong>, thanks for requesting a free demo. Our team will contact you within 24 hours to schedule the next steps.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
                      <tr><td style="padding:6px 0 2px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Contact Name</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.name}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Gym Name</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.gymName}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Email</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.email}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Mobile</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.mobile}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;${input.message ? "border-bottom:1px solid #ebebeb;" : ""}">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Location</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.location}</div>
                          </td></tr>
                          ${input.message ? `<tr><td style="padding:8px 18px;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Message</span>
                            <div style="color:#555555;font-size:14px;margin-top:2px;line-height:1.5;">${input.message}</div>
                          </td></tr>` : ""}
                        </table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1e1510;border:1px solid #3d2e10;border-radius:8px;">
                      <tr><td style="padding:14px 18px;">
                        <p style="margin:0 0 4px 0;color:#FF512F;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What happens next?</p>
                        <p style="margin:0;color:#a07a50;font-size:13px;line-height:1.6;">Our team will reach out within 24 hours to schedule a free product demonstration and discuss installation at your gym &mdash; at zero upfront cost.</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>`);

  return { subject, text, html };
}

// ─── Campaign Request ─────────────────────────────────────────────────────────
export function getCampaignRequestEmailTemplate(
  input: CampaignRequestTemplateInput,
) {
  const subject = "Your MuscleBoxPro campaign inquiry is received";
  const text = [
    `Hi ${input.brandName} team,`,
    "",
    "Thanks for your interest in advertising with MuscleBoxPro.",
    "Our ad partnerships team will contact you shortly.",
    "",
    `Brand Name: ${input.brandName}`,
    `Work Email: ${input.email}`,
    `Mobile: ${input.mobile}`,
    "",
    "Regards,",
    "MuscleBoxPro Team",
  ].join("\n");

  const html = wrapCard(`
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Campaign inquiry received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${input.brandName}</strong> team, thanks for your interest in advertising with MuscleBoxPro. Our partnerships team will be in touch shortly.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
                      <tr><td style="padding:6px 0 2px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Brand Name</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.brandName}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Work Email</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.email}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Mobile</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.mobile}</div>
                          </td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#170d1e;border:1px solid #2e1a3d;border-radius:8px;">
                      <tr><td style="padding:14px 18px;">
                        <p style="margin:0 0 4px 0;color:#DD2476;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Why advertise with us?</p>
                        <p style="margin:0;color:#9a6baa;font-size:13px;line-height:1.6;">Reach fitness-focused audiences directly at the point of workout through our high-resolution vending machine displays across gyms in India.</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>`);

  return { subject, text, html };
}

// ─── Contact Request ──────────────────────────────────────────────────────────
export function getContactRequestEmailTemplate(
  input: ContactRequestTemplateInput,
) {
  const subject = "We received your message - MuscleBoxPro";
  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for reaching out to MuscleBoxPro.",
    "Our team has received your message and will get back to you shortly.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Message: ${input.message}`,
    "",
    "Regards,",
    "MuscleBoxPro Team",
  ].join("\n");

  const html = wrapCard(`
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Message received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${input.name}</strong>, thanks for contacting us. Our support team will get back to you as soon as possible.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
                      <tr><td style="padding:6px 0 2px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Name</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.name}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Email</span>
                            <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.email}</div>
                          </td></tr>
                          <tr><td style="padding:8px 18px;">
                            <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Your Message</span>
                            <div style="color:#555555;font-size:14px;margin-top:4px;line-height:1.6;">${input.message}</div>
                          </td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </td>
                </tr>`);

  return { subject, text, html };
}
