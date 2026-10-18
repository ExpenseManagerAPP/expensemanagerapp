import cds from '@sap/cds';
import { AdminError } from './UserAdministration';
import { EmailServers, type EmailServerInfo } from '../infrastructure/EmailServers';
import { Mailer } from '../infrastructure/Mailer';
import { SecretCipher } from '../infrastructure/SecretCipher';

const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_LENGTH = 200;
const MAX_FIELD_LENGTH = 255;

export interface EmailServerInput {
    Host?: string;
    Port?: number;
    Username?: string;
    Sender?: string;
    Password?: string;
}

const TEST_TEXTS = {
    pt: {
        subject: 'Teste do servidor de email do Expense Manager',
        body: 'Se você recebeu esta mensagem, o servidor de email do Expense Manager está configurado corretamente.'
    },
    en: {
        subject: 'Expense Manager e-mail server test',
        body: 'If you received this message, the Expense Manager e-mail server is set up correctly.'
    }
};

/**
 * Admin settings of the SMTP server: save (password encrypted; an empty
 * password keeps the saved one), remove (back to the SMTP_* variables) and a
 * test e-mail through the active server.
 */
export class EmailServerAdministration {

    public static info(): Promise<EmailServerInfo> {

        return EmailServers.info();

    }


    public static async save(input: EmailServerInput, actor: string): Promise<void> {

        const host = (input.Host || '').trim();
        const username = (input.Username || '').trim();
        const sender = (input.Sender || '').trim();
        const port = Number(input.Port);
        const password = input.Password || '';

        if (!HOST_PATTERN.test(host) || host.length > MAX_FIELD_LENGTH) {
            throw new AdminError('invalidHost');
        }

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new AdminError('invalidPort');
        }

        if (!username || username.length > MAX_FIELD_LENGTH) {
            throw new AdminError('invalidUsername');
        }

        if (sender && (!EMAIL_PATTERN.test(sender) || sender.length > MAX_FIELD_LENGTH)) {
            throw new AdminError('invalidSender');
        }

        if (password.length > MAX_PASSWORD_LENGTH) {
            throw new AdminError('invalidPassword');
        }

        if (!SecretCipher.isAvailable()) {
            throw new AdminError('secretMissing', 500);
        }

        const current = await EmailServers.row();
        const keepsPassword = !password && current && SecretCipher.decrypt(current.Password) !== null;

        if (!password && !keepsPassword) {
            throw new AdminError('passwordRequired');
        }

        await EmailServers.store({
            Host: host,
            Port: port,
            Username: username,
            Sender: sender || null,
            Password: keepsPassword ? current?.Password : SecretCipher.encrypt(password)
        });

        cds.log('mail').info(`E-mail server ${host}:${port} saved by ${actor}`);

    }


    public static async remove(actor: string): Promise<void> {

        await EmailServers.remove();

        cds.log('mail').info(`E-mail server removed by ${actor}`);

    }


    /**
     * Sends a test message through the active server; SMTP failures come back
     * with the server's reason, so the admin can fix the settings.
     */
    public static async sendTest(recipient: string, locale: string): Promise<void> {

        const to = (recipient || '').trim();

        if (!EMAIL_PATTERN.test(to)) {
            throw new AdminError('invalidRecipient');
        }

        const server = await EmailServers.active();

        if (!server) {
            throw new AdminError('noEmailServer');
        }

        const texts = (locale || '').toLowerCase().startsWith('en') ? TEST_TEXTS.en : TEST_TEXTS.pt;

        try {

            await Mailer.sendWith(server, {
                to,
                subject: texts.subject,
                text: texts.body,
                html: `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#102a2b">${texts.body}</p>`
            });

        } catch (error) {

            throw new AdminError('testFailed', 400, (error as Error).message);

        }

    }

}
