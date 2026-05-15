const { BrevoClient } = require('@getbrevo/brevo');

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const brevo = new BrevoClient({ apiKey: process.env.BREVEO_API_KEY });

    const fromEmail = process.env.EMAIL_FROM?.split('<')[1]?.replace('>', '').trim() || 'noreply@vjidatahub.com';
    const fromName = process.env.EMAIL_FROM?.split('<')[0]?.trim() || 'VJI DATA HUB';

    const emailDetails = {
      subject: subject,
      htmlContent: html,
      textContent: text,
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
    };

    const result = await brevo.transactionalEmails.sendTransacEmail(emailDetails);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email error:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
};

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const subject = 'Verify Your Email - VJI DATA HUB';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Welcome to VJI DATA HUB!</h2>
      <p>Hello ${user.name},</p>
      <p>Thank you for registering. Please verify your email address to activate your account and gain full access to our platform.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
      <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #777;">If you did not create an account, please ignore this email.</p>
    </div>
  `;
  const text = `Hello ${user.name}, please verify your email by clicking this link: ${verificationUrl}`;

  return await sendEmail({ to: user.email, subject, html, text });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const subject = 'Password Reset Request - VJI DATA HUB';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
      <p>Please click on the button below to complete the process:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
      <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;
  const text = `Hello ${user.name}, you requested a password reset. Please use this link: ${resetUrl}`;

  return await sendEmail({ to: user.email, subject, html, text });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
