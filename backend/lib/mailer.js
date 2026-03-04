import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendOtpEmail(to, code, purpose = "Login") {
  if (process.env.OTP_DEV_MODE === "1") {
    console.log("OTP_DEV_MODE=1 (email skipped)", { to, code, purpose });
    return;
  }

  const msg = {
    to,
    from: process.env.SMTP_USER, // Must be verified in SendGrid
    subject: `Your ${purpose} OTP`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto">
        <h2>${purpose} Verification</h2>
        <p>Your OTP is:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</div>
        <p>This code expires in 5 minutes.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
}