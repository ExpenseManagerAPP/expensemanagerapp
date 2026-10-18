import cds from '@sap/cds';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

const DEFAULT_PORT = 587;
const SECURE_PORT = 465;

let transporter: Transporter | null = null;

/**
 * Sends the account e-mails with the SMTP server of the SMTP_* variables.
 * Without a server, local development writes the message to the log (so the
 * links can be tested); anywhere else the message is not sent.
 */
export class Mailer {

    public static isConfigured(): boolean {

        return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

    }


    /** True when a message would reach someone (a server or the dev log). */
    public static canDeliver(): boolean {

        return this.isConfigured() || this.logsInstead();

    }


    public static async send(message: MailMessage): Promise<void> {

        if (!this.isConfigured()) {

            if (this.logsInstead()) {
                cds.log('mail').info(`[dev] To: ${message.to} | ${message.subject}\n${message.text}`);
            }

            return;

        }

        await this.transporter().sendMail({
            from: `"Expense Manager" <${process.env.SMTP_USER}>`,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text
        });

    }


    private static logsInstead(): boolean {

        return !process.env.VCAP_APPLICATION && !!(cds.env as any).profiles?.includes('development');

    }


    private static transporter(): Transporter {

        if (!transporter) {

            const port = Number(process.env.SMTP_PORT) || DEFAULT_PORT;

            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port,
                secure: port === SECURE_PORT,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            });

        }

        return transporter;

    }

}
