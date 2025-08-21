import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendOtpEmail(to, code, purpose = "Login") {
  const from = process.env.APP_FROM_EMAIL || "no-reply@example.com";
  const subject = `Your ${purpose} OTP`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto">
      <h2>${purpose} Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</div>
      <p>This code expires in 5 minutes.</p>
    </div>`;
  await mailer.sendMail({ from, to, subject, html });
}
