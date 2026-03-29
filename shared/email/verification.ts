type VerificationTemplateInput = {
  name?: string;
  verificationUrl: string;
};

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

  const html = `
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <!-- Gradient accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#DD2476,#FF512F);height:4px;border-radius:4px 4px 0 0;"></td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;">

              <!-- Header -->
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
              </table>

              <!-- Body -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:28px 32px 12px 32px;">
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Verify your email</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${greetingName}</strong>, thanks for signing up. Please confirm your email address to activate your account and start your fitness journey.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
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

                <!-- Fallback link -->
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

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 32px 32px 32px;">
                    <div style="height:1px;background:#e5e5e5;margin-bottom:20px;"></div>
                    <p style="margin:0 0 6px 0;color:#888888;font-size:12px;line-height:1.5;">
                      If you did not create this account, you can safely ignore this email.
                    </p>
                    <p style="margin:0;color:#bbbbbb;font-size:11px;line-height:1.5;">
                      &copy; 2026 MuscleBoxPro &mdash; BlendBox Innovations LLP &middot;
                      <a href="https://www.muscleboxpro.com" style="color:#FF512F;text-decoration:none;">muscleboxpro.com</a>
                    </p>
                  </td>
                </tr>
              </table>

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
