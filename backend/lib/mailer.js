import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";

let smtpTransport;

function buildOtpHtml(code, purpose) {
  return `
    <div style="font-family:system-ui,Segoe UI,Roboto">
      <h2>${purpose} Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</div>
      <p>This code expires in 5 minutes.</p>
    </div>
  `;
}

function getFromAddress() {
  return (
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.APP_FROM_EMAIL ||
    process.env.SMTP_USER
  );
}

async function sendViaSendgrid({ to, from, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY is not set");
  if (!from) throw new Error("Missing FROM email (set SENDGRID_FROM_EMAIL or APP_FROM_EMAIL)");

  sgMail.setApiKey(apiKey);
  const [response] = await sgMail.send({ to, from, subject, html });
  console.log("SendGrid OTP email sent, status:", response?.statusCode);
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP is not configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)");
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return smtpTransport;
}

async function sendViaSmtp({ to, from, subject, html }) {
  if (!from) throw new Error("Missing FROM email (set APP_FROM_EMAIL or SMTP_USER)");
  const transport = getSmtpTransport();
  const info = await transport.sendMail({ to, from, subject, html });
  console.log("SMTP OTP email sent, messageId:", info?.messageId);
}

export async function sendOtpEmail(to, code, purpose = "Login") {
  if (process.env.OTP_DEV_MODE === "1") {
    console.log("OTP_DEV_MODE=1 (email skipped)", { to, code, purpose });
    return;
  }

  const from = getFromAddress();
  const subject = `Your ${purpose} OTP`;
  const html = buildOtpHtml(code, purpose);

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendgrid({ to, from, subject, html });
      return;
    }

    await sendViaSmtp({ to, from, subject, html });
  } catch (err) {
    const message =
      err?.message ||
      (typeof err === "string" ? err : "Failed to send OTP email");

    console.error("sendOtpEmail error:", message);
    throw err;
  }
}
