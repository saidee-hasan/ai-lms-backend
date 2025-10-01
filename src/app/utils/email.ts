import nodemailer from 'nodemailer';
import { env } from '../config';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT),
  secure: false, // port 587 হলে false, port 465 হলে true
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `"Education Platform" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your OTP Code</h2>
      <p style="font-size: 16px;">Use the following OTP to verify your account:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center;">
        <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p style="font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
    </div>
  `;

  await sendEmail(email, 'Your OTP Code', html);
};
