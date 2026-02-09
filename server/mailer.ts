import { Resend } from 'resend';
import nodemailer from "nodemailer";

let connectionSettings: any;
let smtpTransport: nodemailer.Transporter | null = null;

async function getCredentials() {
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev',
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.warn('⚠️ Resend: X_REPLIT_TOKEN not found');
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      console.warn('⚠️ Resend not connected or API key missing');
      return null;
    }
    return {
      apiKey: connectionSettings.settings.api_key, 
      fromEmail: connectionSettings.settings.from_email || 'onboarding@resend.dev'
    };
  } catch (error: any) {
    console.error('❌ Error getting Resend credentials:', error.message);
    return null;
  }
}

async function getResendClient() {
  const credentials = await getCredentials();
  if (!credentials) return null;
  
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return smtpTransport;
}

export async function sendOtpEmail(to: string, code: string, purpose = "Verification", expiryMinutes = 5) {
  const subject = `Classify - ${purpose} Code`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; direction: rtl;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Classify</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">تطبيق التربية الذكية</p>
      </div>
      
      <div style="background: white; border-radius: 16px; padding: 40px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <h2 style="color: #333; text-align: center; margin: 0 0 20px 0;">رمز التحقق الخاص بك</h2>
        <p style="color: #666; text-align: center; margin: 0 0 30px 0;">استخدم هذا الرمز لإتمام عملية ${purpose === 'Login' ? 'تسجيل الدخول' : purpose === 'Password Reset' ? 'إعادة تعيين كلمة المرور' : 'التحقق'}</p>
        
        <div style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #667eea; font-family: monospace;">${code}</span>
        </div>
        
        <p style="color: #999; text-align: center; font-size: 14px; margin: 0;">
          ⏰ هذا الرمز صالح لمدة ${expiryMinutes} دقائق فقط
        </p>
      </div>
      
      <p style="color: #999; text-align: center; font-size: 12px; margin-top: 30px;">
        إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.
      </p>
    </div>
  `;

  return sendMail({ to, subject, html });
}

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  const resend = await getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.client.emails.send({
        from: resend.fromEmail,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html || opts.text || '',
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Email sent via Resend to ${opts.to}:`, data?.id);
      return data;
    } catch (err: any) {
      console.error(`❌ Resend failed for ${opts.to}:`, err.message);
      // Fall through to SMTP if configured
    }
  }

  const transport = getSmtpTransport();
  if (!transport) {
    if (process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV === "development") {
      console.warn(`✉️ Email service not configured; skipping send in dev mode for ${opts.to}`);
      return { messageId: "dev-skip" } as any;
    }
    throw new Error('Email service not configured');
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@classify.app";
    const info = await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html || opts.text || '',
      text: opts.text,
    });
    console.log(`✅ Email sent via SMTP to ${opts.to}:`, info.messageId);
    return info;
  } catch (err: any) {
    console.error(`❌ SMTP failed for ${opts.to}:`, err.message);
    throw err;
  }
}

export async function sendNotificationEmail(to: string, title: string, message: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; direction: rtl;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 ${title}</h1>
      </div>
      
      <div style="background: white; border-radius: 16px; padding: 30px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; line-height: 1.8; margin: 0;">${message}</p>
      </div>
      
      <p style="color: #999; text-align: center; font-size: 12px; margin-top: 20px;">
        Classify - تطبيق التربية الذكية
      </p>
    </div>
  `;

  return sendMail({ to, subject: `Classify - ${title}`, html });
}

export default { sendOtpEmail, sendMail, sendNotificationEmail };
