import * as nodemailer from 'nodemailer';
import { env } from '../config';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT),
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: `"Education Platform" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    
    console.log('✅ Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #333; text-align: center;">Education Platform - OTP Verification</h2>
      <p style="font-size: 16px; color: #666;">Hello there!</p>
      <p style="font-size: 16px; color: #666;">Use the following OTP code to verify your account:</p>
      
      <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #ccc;">
        <h1 style="margin: 0; color: #333; letter-spacing: 8px; font-size: 36px; font-weight: bold;">${otp}</h1>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7; margin: 15px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          ⏰ <strong>Important:</strong> This OTP will expire in <strong>5 minutes</strong>. 
          Please use it before ${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()}.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #999; text-align: center;">
        If you didn't request this OTP, please ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Education Platform Team<br>
        This is an automated message, please do not reply.
      </p>
    </div>
  `;

  await sendEmail(email, `Your OTP Code - Expires in 5 Minutes`, html);
};
