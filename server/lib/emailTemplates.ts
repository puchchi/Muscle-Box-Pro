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

export function getVerificationEmailTemplate(input: VerificationTemplateInput) {
  const greetingName = input.name?.trim() ? input.name.trim() : "there";
  const safeUrl = input.verificationUrl;

  const subject = "Verify your Muscle Box Pro account";

  const text = [
    `Hi ${greetingName},`,
    "",
    "Thanks for signing up for Muscle Box Pro.",
    "Please verify your email address by opening the link below:",
    safeUrl,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#11131b;font-family:Rajdhani,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11131b;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1b1f2b;border:1px solid #2f3647;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:30px 30px 16px 30px;">
                <div style="font-family:'Russo One',Rajdhani,Arial,sans-serif;color:#ffffff;font-size:24px;line-height:1;letter-spacing:0.5px;">
                  MUSCLE BOX<span style="color:#00cfff;">PRO</span>
                </div>
                <div style="height:1px;background:#2f3647;margin:14px 0 0 0;"></div>
                <h1 style="margin:22px 0 12px 0;color:#ffffff;font-family:'Russo One',Rajdhani,Arial,sans-serif;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Verify your email</h1>
                <p style="margin:0;color:#aeb7cb;font-size:17px;line-height:1.6;">
                  Hi <strong style="color:#ffffff;font-weight:700;">${greetingName}</strong>, thanks for signing up. Please confirm your email to activate your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px 0 30px;">
                <a href="${safeUrl}" style="display:inline-block;background:#00cfff;color:#11131b;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;padding:12px 22px;border-radius:8px;">
                  Verify Email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 30px 30px;">
                <p style="margin:0 0 8px 0;color:#9aa7c7;font-size:13px;line-height:1.5;letter-spacing:0.2px;">
                  If the button does not work, copy and paste this link in your browser:
                </p>
                <p style="margin:0;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#00cfff;font-size:13px;text-decoration:underline;">${safeUrl}</a>
                </p>
                <div style="height:1px;background:#2f3647;margin:24px 0 16px 0;"></div>
                <p style="margin:0;color:#7c87a5;font-size:12px;line-height:1.5;">
                  If you did not create this account, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function getPasswordResetEmailTemplate(input: PasswordResetTemplateInput) {
  const greetingName = input.name?.trim() ? input.name.trim() : "there";
  const safeUrl = input.resetUrl;

  const subject = "Reset your Muscle Box Pro password";

  const text = [
    `Hi ${greetingName},`,
    "",
    "We received a request to reset your Muscle Box Pro password.",
    "Open the link below to set a new password:",
    safeUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#11131b;font-family:Rajdhani,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11131b;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1b1f2b;border:1px solid #2f3647;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:30px 30px 16px 30px;">
                <div style="font-family:'Russo One',Rajdhani,Arial,sans-serif;color:#ffffff;font-size:24px;line-height:1;letter-spacing:0.5px;">
                  MUSCLE BOX<span style="color:#00cfff;">PRO</span>
                </div>
                <div style="height:1px;background:#2f3647;margin:14px 0 0 0;"></div>
                <h1 style="margin:22px 0 12px 0;color:#ffffff;font-family:'Russo One',Rajdhani,Arial,sans-serif;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Reset your password</h1>
                <p style="margin:0;color:#aeb7cb;font-size:17px;line-height:1.6;">
                  Hi <strong style="color:#ffffff;font-weight:700;">${greetingName}</strong>, we received a request to reset your password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px 0 30px;">
                <a href="${safeUrl}" style="display:inline-block;background:#00cfff;color:#11131b;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;padding:12px 22px;border-radius:8px;">
                  Reset Password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 30px 30px;">
                <p style="margin:0 0 8px 0;color:#9aa7c7;font-size:13px;line-height:1.5;letter-spacing:0.2px;">
                  If the button does not work, copy and paste this link in your browser:
                </p>
                <p style="margin:0;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#00cfff;font-size:13px;text-decoration:underline;">${safeUrl}</a>
                </p>
                <div style="height:1px;background:#2f3647;margin:24px 0 16px 0;"></div>
                <p style="margin:0;color:#7c87a5;font-size:12px;line-height:1.5;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function getDemoRequestEmailTemplate(input: DemoRequestTemplateInput) {
  const subject = "Your Muscle Box Pro demo request is received";
  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for requesting a free demo with Muscle Box Pro.",
    "Our team will contact you shortly to schedule the next steps.",
    "",
    `Gym: ${input.gymName}`,
    `Email: ${input.email}`,
    `Mobile: ${input.mobile}`,
    `Location: ${input.location}`,
    input.message ? `Message: ${input.message}` : "",
    "",
    "Regards,",
    "Muscle Box Pro Team",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#11131b;font-family:Rajdhani,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11131b;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1b1f2b;border:1px solid #2f3647;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:30px 30px 16px 30px;">
                <div style="font-family:'Russo One',Rajdhani,Arial,sans-serif;color:#ffffff;font-size:24px;line-height:1;letter-spacing:0.5px;">
                  MUSCLE BOX<span style="color:#00cfff;">PRO</span>
                </div>
                <div style="height:1px;background:#2f3647;margin:14px 0 0 0;"></div>
                <h1 style="margin:22px 0 12px 0;color:#ffffff;font-family:'Russo One',Rajdhani,Arial,sans-serif;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Demo request received</h1>
                <p style="margin:0;color:#aeb7cb;font-size:17px;line-height:1.6;">
                  Hi <strong style="color:#ffffff;font-weight:700;">${input.name}</strong>, thanks for requesting a free demo. Our team will contact you shortly.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 8px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#151925;border:1px solid #2f3647;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;color:#9aa7c7;font-size:13px;">
                      <div><strong style="color:#ffffff;">Contact Name:</strong> ${input.name}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Gym Name:</strong> ${input.gymName}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Email:</strong> ${input.email}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Mobile:</strong> ${input.mobile}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Location:</strong> ${input.location}</div>
                      ${
                        input.message
                          ? `<div style="margin-top:8px;"><strong style="color:#ffffff;">Message:</strong> ${input.message}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 30px 30px 30px;">
                <div style="height:1px;background:#2f3647;margin:0 0 16px 0;"></div>
                <p style="margin:0;color:#7c87a5;font-size:12px;line-height:1.5;">
                  This is an automated confirmation email from Muscle Box Pro.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function getCampaignRequestEmailTemplate(
  input: CampaignRequestTemplateInput,
) {
  const subject = "Your Muscle Box Pro campaign inquiry is received";
  const text = [
    `Hi ${input.brandName} team,`,
    "",
    "Thanks for your interest in advertising with Muscle Box Pro.",
    "Our ad partnerships team will contact you shortly.",
    "",
    `Brand Name: ${input.brandName}`,
    `Work Email: ${input.email}`,
    `Mobile: ${input.mobile}`,
    "",
    "Regards,",
    "Muscle Box Pro Team",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#11131b;font-family:Rajdhani,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11131b;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1b1f2b;border:1px solid #2f3647;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:30px 30px 16px 30px;">
                <div style="font-family:'Russo One',Rajdhani,Arial,sans-serif;color:#ffffff;font-size:24px;line-height:1;letter-spacing:0.5px;">
                  MUSCLE BOX<span style="color:#00cfff;">PRO</span>
                </div>
                <div style="height:1px;background:#2f3647;margin:14px 0 0 0;"></div>
                <h1 style="margin:22px 0 12px 0;color:#ffffff;font-family:'Russo One',Rajdhani,Arial,sans-serif;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Campaign inquiry received</h1>
                <p style="margin:0;color:#aeb7cb;font-size:17px;line-height:1.6;">
                  Hi <strong style="color:#ffffff;font-weight:700;">${input.brandName}</strong> team, thanks for your interest in partnering with Muscle Box Pro.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 8px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#151925;border:1px solid #2f3647;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;color:#9aa7c7;font-size:13px;">
                      <div><strong style="color:#ffffff;">Brand Name:</strong> ${input.brandName}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Work Email:</strong> ${input.email}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Mobile:</strong> ${input.mobile}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 30px 30px 30px;">
                <div style="height:1px;background:#2f3647;margin:0 0 16px 0;"></div>
                <p style="margin:0;color:#7c87a5;font-size:12px;line-height:1.5;">
                  This is an automated confirmation email from Muscle Box Pro.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function getContactRequestEmailTemplate(
  input: ContactRequestTemplateInput,
) {
  const subject = "We received your message - Muscle Box Pro";
  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for reaching out to Muscle Box Pro.",
    "Our team has received your message and will get back to you shortly.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Message: ${input.message}`,
    "",
    "Regards,",
    "Muscle Box Pro Team",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#11131b;font-family:Rajdhani,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11131b;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1b1f2b;border:1px solid #2f3647;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:30px 30px 16px 30px;">
                <div style="font-family:'Russo One',Rajdhani,Arial,sans-serif;color:#ffffff;font-size:24px;line-height:1;letter-spacing:0.5px;">
                  MUSCLE BOX<span style="color:#00cfff;">PRO</span>
                </div>
                <div style="height:1px;background:#2f3647;margin:14px 0 0 0;"></div>
                <h1 style="margin:22px 0 12px 0;color:#ffffff;font-family:'Russo One',Rajdhani,Arial,sans-serif;font-size:28px;line-height:1.2;letter-spacing:0.4px;">Message received</h1>
                <p style="margin:0;color:#aeb7cb;font-size:17px;line-height:1.6;">
                  Hi <strong style="color:#ffffff;font-weight:700;">${input.name}</strong>, thanks for contacting us. Our support team will respond shortly.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 8px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#151925;border:1px solid #2f3647;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;color:#9aa7c7;font-size:13px;">
                      <div><strong style="color:#ffffff;">Name:</strong> ${input.name}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Email:</strong> ${input.email}</div>
                      <div style="margin-top:8px;"><strong style="color:#ffffff;">Message:</strong> ${input.message}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 30px 30px 30px;">
                <div style="height:1px;background:#2f3647;margin:0 0 16px 0;"></div>
                <p style="margin:0;color:#7c87a5;font-size:12px;line-height:1.5;">
                  This is an automated confirmation email from Muscle Box Pro.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
