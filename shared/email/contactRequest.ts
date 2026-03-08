type ContactRequestTemplateInput = {
  name: string;
  email: string;
  message: string;
};

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
