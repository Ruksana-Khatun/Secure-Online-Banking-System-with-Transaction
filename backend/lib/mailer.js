import sgMail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY is missing; OTP emails will fail.");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendOtpEmail(to, code, purpose = "Login") {
  if (process.env.OTP_DEV_MODE === "1") {
    console.log("OTP_DEV_MODE=1 (email skipped)", { to, code, purpose });
    return;
  }

  const fromAddress = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER;

  const msg = {
    to,
    from: fromAddress, // Must be a verified sender in SendGrid
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

  try {
    const [response] = await sgMail.send(msg);
    console.log("SendGrid OTP email sent, status:", response?.statusCode);
  } catch (err) {
    console.error("SendGrid sendOtpEmail error:", err?.response?.body || err);
    throw err;
  }
}