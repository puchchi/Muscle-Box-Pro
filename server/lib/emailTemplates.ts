type VerificationTemplateInput = {
  name?: string;
  verificationUrl: string;
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
  <body style="margin:0;padding:0;background:#070b16;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070b16;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0e1322;border:1px solid #26304a;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px 28px;">
                <div style="color:#60c6ff;font-size:12px;letter-spacing:1.5px;font-weight:700;">MUSCLE BOX PRO</div>
                <h1 style="margin:10px 0 8px 0;color:#ffffff;font-size:26px;line-height:1.2;">Verify your email</h1>
                <p style="margin:0;color:#b8c0d6;font-size:15px;line-height:1.6;">
                  Hi ${greetingName}, thanks for signing up. Please confirm your email to activate your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0 28px;">
                <a href="${safeUrl}" style="display:inline-block;background:#59baf3;color:#041022;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">
                  Verify Email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px 28px;">
                <p style="margin:0 0 8px 0;color:#9aa7c7;font-size:13px;line-height:1.5;">
                  If the button does not work, copy and paste this link in your browser:
                </p>
                <p style="margin:0;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#7dd3fc;font-size:13px;text-decoration:underline;">${safeUrl}</a>
                </p>
                <p style="margin:18px 0 0 0;color:#7c87a5;font-size:12px;line-height:1.5;">
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
