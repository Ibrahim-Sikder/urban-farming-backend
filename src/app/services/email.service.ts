import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
    private static transporter: nodemailer.Transporter | null = null;

    private static getTransporter() {
        if (!this.transporter) {

            if (!config.email.user || !config.email.password) {
                throw new Error('Email configuration missing');
            }

            this.transporter = nodemailer.createTransport({
                host: config.email.host,
                port: config.email.port,
                secure: config.email.secure,
                auth: {
                    user: config.email.user,
                    pass: config.email.password,
                },

                authMethod: 'PLAIN',
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
                debug: true,
                logger: true,
            });
        }
        return this.transporter;
    }

    static async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
        const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `"FarmFresh Support" <${config.email.from}>`,
            to: email,
            subject: '🔐 Password Reset Request - FarmFresh',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Password Reset Request</h2>
                    <p>Hello <strong>${userName}</strong>,</p>
                    <p>Click the link below to reset your password:</p>
                    <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                    <p>Or copy this link: ${resetUrl}</p>
                    <p><strong>Token:</strong> ${resetToken}</p>
                    <p>This link expires in 1 hour.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
            text: `Password Reset Request\n\nHello ${userName},\n\nReset your password: ${resetUrl}\n\nToken: ${resetToken}\n\nExpires in 1 hour.`,
        };

        try {
            const transporter = this.getTransporter();
            const info = await transporter.sendMail(mailOptions);

        } catch (error: any) {



            if (error.message.includes('Invalid login') || error.message.includes('535')) {
                throw new Error('Gmail authentication failed. Please use an App Password instead of your regular Gmail password. Generate one at: https://myaccount.google.com/apppasswords');
            } else if (error.message.includes('535-5.7.8')) {
                throw new Error('Gmail requires an App Password. Enable 2-Step Verification and generate an App Password from your Google Account settings.');
            } else {
                throw new Error(`Failed to send email: ${error.message}`);
            }
        }
    }

    static async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const transporter = this.getTransporter();
            await transporter.verify();

            return { success: true, message: 'Email service configured correctly' };
        } catch (error: any) {


            let message = 'Connection failed';
            if (error.message.includes('Invalid login')) {
                message = 'Invalid credentials. You must use a Gmail App Password, not your regular password.';
            } else if (error.message.includes('535')) {
                message = 'Gmail authentication failed. Enable 2-Step Verification and create an App Password.';
            }

            return { success: false, message };
        }
    }

    static async sendPasswordResetSuccessEmail(email: string, userName: string): Promise<void> {
        const mailOptions = {
            from: `"FarmFresh Support" <${config.email.from}>`,
            to: email,
            subject: '✅ Password Changed Successfully - FarmFresh',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Password Changed Successfully</h2>
                    <p>Hello <strong>${userName}</strong>,</p>
                    <p>Your password has been successfully changed.</p>
                    <p>If you did not make this change, please contact support immediately.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">For security, never share your password.</p>
                </div>
            `,
            text: `Password Changed Successfully\n\nHello ${userName},\n\nYour password has been changed.\n\nIf you didn't do this, contact support.`,
        };

        try {
            const transporter = this.getTransporter();
            await transporter.sendMail(mailOptions);

        } catch (error: any) {
            console.error('❌ Failed to send success email:', error.message);
        }
    }
}