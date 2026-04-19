type InvestorRequestTemplateInput = {
  name: string;
  email: string;
  firm?: string;
  investorType?: string;
  message?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getInvestorRequestEmailTemplate(input: InvestorRequestTemplateInput) {
  const subject = "Your MuscleBoxPro investor inquiry is received";

  const text = [
    `Hi ${input.name},`,
    "",
    "Thank you for your interest in investing in MuscleBoxPro.",
    "Our team will send you the pitch deck and reach out within 24 hours.",
    "",
    `Email: ${input.email}`,
    input.firm ? `Firm / Organisation: ${input.firm}` : null,
    input.investorType ? `Investor Type: ${input.investorType}` : null,
    input.message ? `Message: ${input.message}` : null,
    "",
    "Regards,",
    "MuscleBoxPro Team",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeFirm = input.firm ? escapeHtml(input.firm) : null;
  const safeInvestorType = input.investorType ? escapeHtml(input.investorType) : null;
  const safeMessage = input.message ? escapeHtml(input.message) : null;

  const html = `
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Investor Inquiry Received</title></head>
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
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Investor inquiry received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${safeName}</strong>, thank you for your interest in MuscleBoxPro. We'll send you the pitch deck and reach out within 24 hours.
                    </p>
                  </td>
                </tr>

                <!-- Details table -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
                      <tr>
                        <td style="padding:6px 0 2px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Name</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${safeName}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;${safeFirm || safeInvestorType || safeMessage ? "border-bottom:1px solid #ebebeb;" : ""}">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Email</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${safeEmail}</div>
                              </td>
                            </tr>
                            ${safeFirm ? `
                            <tr>
                              <td style="padding:8px 18px;${safeInvestorType || safeMessage ? "border-bottom:1px solid #ebebeb;" : ""}">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Firm / Organisation</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${safeFirm}</div>
                              </td>
                            </tr>` : ""}
                            ${safeInvestorType ? `
                            <tr>
                              <td style="padding:8px 18px;${safeMessage ? "border-bottom:1px solid #ebebeb;" : ""}">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Investor Type</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${safeInvestorType}</div>
                              </td>
                            </tr>` : ""}
                            ${safeMessage ? `
                            <tr>
                              <td style="padding:8px 18px;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Message</span>
                                <div style="color:#555555;font-size:14px;margin-top:2px;line-height:1.5;">${safeMessage}</div>
                              </td>
                            </tr>` : ""}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- What's next -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1e1510;border:1px solid #3d2e10;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 4px 0;color:#FF512F;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What happens next?</p>
                          <p style="margin:0;color:#a07a50;font-size:13px;line-height:1.6;">Our team will send the pitch deck to this email address and follow up within 24 hours. We look forward to connecting with you.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 32px 32px 32px;">
                    <div style="height:1px;background:#e5e5e5;margin-bottom:20px;"></div>
                    <p style="margin:0 0 6px 0;color:#6b6b6b;font-size:12px;line-height:1.5;">
                      This is an automated confirmation email from MuscleBoxPro.
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
