# Brevo API Implementation & Email Verification Guide

This document outlines the implementation of Brevo (formerly Sendinblue) for transactional emails and its integration into the email verification flow.

## 1. Setup & Dependencies

### Package Installation
The implementation uses the official Brevo SDK for Node.js.
```bash
npm install @getbrevo/brevo
```

### Environment Variables
The following environment variables are required in the `.env` file:
- `BREVEO_API_KEY`: Your Brevo API key.
- `EMAIL_FROM`: The sender email address in format `Name <email@domain.com>`.
- `FRONTEND_URL`: The URL of your frontend application (for verification links).
- `SITE_URL`: Your main website URL.

---

## 2. Brevo Service Implementation

The core logic resides in `.\backend\utils\emailService.js`.

### Core `sendEmail` Function
This generic function handles the API interaction with Brevo.

```javascript
const brevo = require('@getbrevo/brevo');

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const apiInstance = new brevo.TransactionalEmailsApi();
    
    // Configure API Key
    apiInstance.setApiKey(0, process.env.BREVEO_API_KEY);

    const fromEmail = process.env.EMAIL_FROM?.split('<')[1]?.replace('>', '').trim() || 'noreply@yourdomain.com';
    const fromName = process.env.EMAIL_FROM?.split('<')[0]?.trim() || 'Your App';

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = { email: fromEmail, name: fromName };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
};
```

### Email Templates
Dedicated functions like `sendVerificationEmail` wrap `sendEmail` with specific HTML templates and parameters.

---

## 3. Email Verification Flow

The verification logic is implemented in `.\backend\controllers\authController.js`.

### Step 1: Registration (Generating Token)
During user registration, a unique verification token is generated and stored in the database.

```javascript
const register = asyncHandler(async (req, res) => {
  // 1. Generate token and expiry
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 2. Create user with verification fields
  const user = await User.create({
    ...,
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires
  });

  // 3. Send verification email via Brevo
  await sendVerificationEmail(user, verificationToken);
});
```

### Step 2: Verification Endpoint
An API endpoint verifies the token provided by the user (usually via a link clicked in their email).

```javascript
const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  // 1. Find user with valid token
  const user = await User.findOne({ 
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  // 2. Mark as verified and clear token
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
});
```

### Step 3: Enforcement (Login Check)
The login process ensures users are verified before granting access.

```javascript
const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email });
  
  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required.'
    });
  }
  // Proceed with login...
});
```

---

## 4. Best Practices
- **HTML Normalization**: Use a utility to clean up HTML for mobile email clients (Brevo sometimes has issues with complex CSS).
- **Security**: Always hash or use high-entropy strings for tokens.
- **Expiry**: Set a reasonable expiration time (e.g., 24 hours) for verification links.
