import cds from '@sap/cds';
import { createHash } from 'crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import { EmailServers, type EmailServerConfig } from './EmailServers';

export interface MailAttachment {
    filename: string;
    content: Buffer;
    cid?: string;
    contentType?: string;
}

export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments?: MailAttachment[];
}

const SECURE_PORT = 465;
const SENDER_NAME = 'Expense Manager';

const transporters = new Map<string, Transporter>();

/**
 * Sends the app e-mails through the active SMTP server (saved by an admin,
 * or the SMTP_* variables). Without a server, local development writes the
 * message to the log (so the links can be tested); anywhere else it is not
 * sent.
 */
export class Mailer {

    /** True when a message would reach someone (a server or the dev log). */
    public static async canDeliver(): Promise<boolean> {

        return !!(await EmailServers.active()) || this.logsInstead();

    }


    public static async send(message: MailMessage): Promise<void> {

        const server = await EmailServers.active();

        if (!server) {

            if (this.logsInstead()) {
                cds.log('mail').info(`[dev] To: ${message.to} | ${message.subject}\n${message.text}`);
            }

            return;

        }

        await this.sendWith(server, message);

    }


    /**
     * Sends with a given server (e.g. the test e-mail of the admin page).
     * SMTP errors are thrown with the server's reason.
     */
    public static async sendWith(server: EmailServerConfig, message: MailMessage): Promise<void> {

        await this.transporter(server).sendMail({
            from: { name: SENDER_NAME, address: server.sender },
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
            attachments: message.attachments
        });

    }


    /** A pooled transport per server configuration. */
    public static transporter(server: EmailServerConfig): Transporter {

        const key = createHash('sha256').update(JSON.stringify(server)).digest('hex');
        let transporter = transporters.get(key);

        if (!transporter) {
            transporter = nodemailer.createTransport({
                host: server.host,
                port: server.port,
                secure: server.port === SECURE_PORT,
                auth: { user: server.username, pass: server.password }
            });
            transporters.set(key, transporter);
        }

        return transporter;

    }


    private static logsInstead(): boolean {

        return !process.env.VCAP_APPLICATION && !!(cds.env as any).profiles?.includes('development');

    }

}
