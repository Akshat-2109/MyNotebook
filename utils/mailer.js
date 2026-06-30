const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp, type) {
  const isReset = type === 'reset';
  const subject = isReset ? '🔑 MyNotebook — Password Reset OTP' : '✉️ MyNotebook — Verify Your Email';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const message = isReset
    ? 'You requested a password reset. Use the OTP below to set a new password:'
    : 'Welcome to MyNotebook! Please verify your email to activate your account:';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#0f1320;border:1px solid #ffffff12;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px">
      <div style="font-size:22px;font-weight:700;color:#fff">✦ MyNotebook</div>
      <div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:4px">${heading}</div>
    </div>
    <div style="padding:32px">
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">${message}</p>
      <div style="background:#1c2130;border:2px solid #6366f133;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:38px;font-weight:800;letter-spacing:12px;color:#a5b4fc;font-family:monospace">${otp}</div>
        <div style="color:#475569;font-size:12px;margin-top:10px">⏱ Expires in 10 minutes</div>
      </div>
      <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;border-top:1px solid #ffffff0a;padding-top:16px">
        If you didn't request this, you can safely ignore this email. Your account remains secure.
      </p>
    </div>
  </div>
</body></html>`;

  await transporter.sendMail({
    from: `"MyNotebook" <${process.env.MAIL_USER}>`,
    to: email,
    subject,
    html
  });
}

module.exports = { generateOTP, sendOTP };
