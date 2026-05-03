import { Resend } from 'resend';
import twilio from 'twilio';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendEmailNotification(to: string, subject: string, body: string) {
  if (resend) {
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html: `<p>${body}</p>`
      });
      console.log(`[Email sent to ${to}] Subject: ${subject}`);
    } catch (error) {
      console.error('Failed to send Email via Resend:', error);
    }
  } else {
    console.log(`[MOCK EMAIL to ${to}] Subject: ${subject} | Body: ${body}`);
  }
}

export async function sendSmsNotification(to: string, body: string) {
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });
      console.log(`[SMS sent to ${to}] Body: ${body}`);
    } catch (error) {
      console.error('Failed to send SMS via Twilio:', error);
    }
  } else {
    console.log(`[MOCK SMS to ${to}] Body: ${body}`);
  }
}
