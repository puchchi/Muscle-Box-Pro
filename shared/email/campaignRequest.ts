type CampaignRequestTemplateInput = {
  brandName: string;
  email: string;
  mobile: string;
};

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

  const html = `
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Campaign Inquiry Received</title></head>
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
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Campaign inquiry received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${input.brandName}</strong> team, thanks for your interest in advertising with MuscleBoxPro. Our ad partnerships team will be in touch shortly.
                    </p>
                  </td>
                </tr>

                <!-- Details -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
                      <tr>
                        <td style="padding:6px 0 2px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Brand Name</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.brandName}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Work Email</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.email}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Mobile</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.mobile}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Ad platform note -->
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#170d1e;border:1px solid #2e1a3d;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 4px 0;color:#DD2476;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Why advertise with us?</p>
                          <p style="margin:0;color:#9a6baa;font-size:13px;line-height:1.6;">Reach fitness-focused audiences directly at the point of workout through our high-resolution vending machine displays across gyms in India.</p>
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
