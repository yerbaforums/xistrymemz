import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_placeholder'
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@xistrymemz.xyz'
const APP_NAME = 'XistrYmemZ'
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (RESEND_API_KEY === 're_placeholder') {
    console.warn('RESEND_API_KEY not configured. Email sending disabled.')
    return null
  }
  if (!resend) {
    resend = new Resend(RESEND_API_KEY)
  }
  return resend
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
<tr><td style="padding:32px;background:#1a1a2e;border-radius:12px;border:1px solid #2a2a4a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #2a2a4a">
<img src="${BASE_URL}/logo.png" alt="${APP_NAME}" width="40" height="40" style="vertical-align:middle;margin-right:8px"/>
<span style="color:#ffffff;font-size:20px;font-weight:700;vertical-align:middle">${APP_NAME}</span>
</td></tr>
<tr><td style="padding:24px 0;color:#c0c0c0;font-size:15px;line-height:1.6">
${body}
</td></tr>
<tr><td style="text-align:center;padding-top:24px;border-top:1px solid #2a2a4a;color:#666;font-size:12px">
<p style="margin:0 0 4px">${APP_NAME} — The Cosmic Whitepages Cooperative</p>
<p style="margin:0">${BASE_URL}</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const client = getResend()
  if (!client) {
    console.log(`[EMAIL] Password reset for ${email}: ${BASE_URL}/auth/reset-password?token=${token}`)
    return
  }

  const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`

  const body = `
    <h2 style="color:#00d9ff;font-size:20px;margin:0 0 16px">Reset Your Password</h2>
    <p style="margin:0 0 16px">We received a request to reset the password for your ${APP_NAME} account.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="background:#00d9ff;border-radius:8px;padding:14px 32px">
          <a href="${resetUrl}" style="color:#0d0d0d;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#888">Or copy this link into your browser:</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;color:#666">${resetUrl}</p>
    <p style="margin:0;font-size:13px;color:#888">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `

  await client.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: 'Reset your password',
    html: wrapHtml(body),
  })
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const client = getResend()
  if (!client) {
    console.log(`[EMAIL] Verification for ${email}: ${BASE_URL}/auth/verify-email?token=${token}`)
    return
  }

  const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}`

  const body = `
    <h2 style="color:#00d9ff;font-size:20px;margin:0 0 16px">Verify Your Email</h2>
    <p style="margin:0 0 16px">Thanks for joining ${APP_NAME}! Click the button below to verify your email address.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="background:#00d9ff;border-radius:8px;padding:14px 32px">
          <a href="${verifyUrl}" style="color:#0d0d0d;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Verify Email
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#888">Or copy this link:</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;color:#666">${verifyUrl}</p>
    <p style="margin:0;font-size:13px;color:#888">This link expires in 24 hours.</p>
  `

  await client.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: 'Verify your email address',
    html: wrapHtml(body),
  })
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const client = getResend()
  if (!client) {
    console.log(`[EMAIL] Welcome email for ${email}`)
    return
  }

  const body = `
    <h2 style="color:#00d9ff;font-size:20px;margin:0 0 16px">Welcome to ${APP_NAME}!</h2>
    <p style="margin:0 0 16px">Hi${name ? `, ${name}` : ''},</p>
    <p style="margin:0 0 16px">You're now part of the Cosmic Whitepages Cooperative — a community where you can create plans, collaborate with others, and bring your ideas to life.</p>
    <h3 style="color:#ffffff;font-size:15px;margin:24px 0 12px">Quick start:</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="padding:8px 0;color:#c0c0c0;font-size:14px">✨ <a href="${BASE_URL}/onboarding" style="color:#00d9ff">Complete your profile</a></td></tr>
      <tr><td style="padding:8px 0;color:#c0c0c0;font-size:14px">📋 <a href="${BASE_URL}/plans/public" style="color:#00d9ff">Browse public projects</a></td></tr>
      <tr><td style="padding:8px 0;color:#c0c0c0;font-size:14px">👥 <a href="${BASE_URL}/community" style="color:#00d9ff">Explore the community</a></td></tr>
      <tr><td style="padding:8px 0;color:#c0c0c0;font-size:14px">🏪 <a href="${BASE_URL}/shops" style="color:#00d9ff">Visit the marketplace</a></td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#888">If you have any questions, visit our <a href="${BASE_URL}/help" style="color:#00d9ff">help page</a>.</p>
  `

  await client.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to XistrYmemZ!',
    html: wrapHtml(body),
  })
}
