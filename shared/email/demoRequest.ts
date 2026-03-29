type DemoRequestTemplateInput = {
  name: string;
  gymName: string;
  email: string;
  mobile: string;
  location: string;
  message?: string;
};

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
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo Request Received</title></head>
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
                    <h1 style="margin:0 0 12px 0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:0.3px;">Demo request received</h1>
                    <p style="margin:0;color:#555555;font-size:16px;line-height:1.7;">
                      Hi <strong style="color:#111111;">${input.name}</strong>, thanks for requesting a free demo. Our team will contact you within 24 hours to schedule the next steps.
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
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Contact Name</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.name}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Gym Name</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.gymName}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Email</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.email}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;border-bottom:1px solid #ebebeb;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Mobile</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.mobile}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 18px;${input.message ? "border-bottom:1px solid #ebebeb;" : ""}">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Location</span>
                                <div style="color:#111111;font-size:14px;font-weight:600;margin-top:2px;">${input.location}</div>
                              </td>
                            </tr>
                            ${input.message ? `
                            <tr>
                              <td style="padding:8px 18px;">
                                <span style="color:#999999;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Message</span>
                                <div style="color:#555555;font-size:14px;margin-top:2px;line-height:1.5;">${input.message}</div>
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
                          <p style="margin:0;color:#a07a50;font-size:13px;line-height:1.6;">Our team will reach out within 24 hours to schedule a free product demonstration and discuss installation at your gym — at zero upfront cost.</p>
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
                      This is an automated confirmation email from Muscle Box Pro.
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
