import { config } from '../config';
import { Logger } from '../utils/logger';

const log = new Logger('EmailService');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // In production, this would use a real email service like SendGrid, AWS SES, etc.
    // For now, we'll just log the email
    
    if (config.env === 'production') {
      // TODO: Implement real email sending
      log.warn('Email sending not implemented in production');
    }

    // Mock email sending - log to console
    log.info('📧 Mock Email Sent:');
    log.info(`To: ${options.to}`);
    log.info(`Subject: ${options.subject}`);
    
    if (config.env === 'development') {
      // In development, also log the content
      log.debug('Email Content:', options.html);
    }

    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Verify Your Email</h1>
        <p>Thank you for registering! Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - E-commerce Platform',
      html,
      text: `Verify your email by visiting: ${verificationUrl}`,
    });

    log.info(`Verification email sent to ${email}`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - E-commerce Platform',
      html,
      text: `Reset your password by visiting: ${resetUrl}`,
    });

    log.info(`Password reset email sent to ${email}`);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to E-commerce Platform, ${firstName}!</h1>
        <p>Your account has been successfully created and verified.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse our product catalog</li>
          <li>Add items to your cart</li>
          <li>Make purchases</li>
          <li>Track your orders</li>
        </ul>
        <a href="${config.frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
          Start Shopping
        </a>
        <hr style="margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to E-commerce Platform!',
      html,
      text: `Welcome ${firstName}! Your account is ready. Start shopping at ${config.frontendUrl}`,
    });

    log.info(`Welcome email sent to ${email}`);
  }

  async sendOrderConfirmationEmail(email: string, orderDetails: any): Promise<void> {
    // This would be implemented when we have the order service
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Order Confirmation</h1>
        <p>Thank you for your order!</p>
        <p>Order ID: <strong>${orderDetails.orderId}</strong></p>
        <p>Total: <strong>$${orderDetails.total}</strong></p>
        <p>We'll send you another email when your order ships.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderDetails.orderId}`,
      html,
    });

    log.info(`Order confirmation email sent to ${email}`);
  }
}

export const emailService = EmailService.getInstance();