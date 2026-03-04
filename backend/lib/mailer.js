import nodemailer from "nodemailer";

function normalizeSmtpPass(pass) {
  // Gmail app passwords are often shown with spaces; env values sometimes keep them.
  return typeof pass === "string" ? pass.replace(/\s+/g, "") : pass;
}

function createMailerFromEnv() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP not configured (set SMTP_USER, SMTP_PASS)");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendOtpEmail(to, code, purpose = "Login") {
  if (process.env.OTP_DEV_MODE === "1") {
    console.log("OTP_DEV_MODE=1 (email skipped)", { to, code, purpose });
    return;
  }

  const from = process.env.APP_FROM_EMAIL || "no-reply@example.com";
  const subject = `Your ${purpose} OTP`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto">
      <h2>${purpose} Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</div>
      <p>This code expires in 5 minutes.</p>
    </div>`;
  const mailer = createMailerFromEnv();
  await mailer.sendMail({ from, to, subject, html });
}
