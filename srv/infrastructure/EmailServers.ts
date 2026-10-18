import cds from '@sap/cds';
import { SecretCipher } from './SecretCipher';

const ENTITIES_NAMESPACE = 'apps.dflc.expensemanager.entities';
const DEFAULT_PORT = 587;

/** The single EmailServers row. */
export const EMAIL_SERVER_ID = '00000000-0000-4000-8000-0000000e3a11';

export interface EmailServerConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    sender: string;
}

export type EmailServerSource = 'SETTINGS' | 'ENVIRONMENT' | 'NONE';

export interface EmailServerInfo {
    Host: string;
    Port: number;
    Username: string;
    Sender: string;
    Saved: boolean;
    PasswordReadable: boolean;
    Source: EmailServerSource;
}

export interface EmailServerRow {
    ID: string;
    Host?: string | null;
    Port?: number | null;
    Username?: string | null;
    Sender?: string | null;
    Password?: string | null;
}

/**
 * Which SMTP server the app uses: the one saved by an admin (password
 * decrypted on use) or, as a fallback, the SMTP_* environment variables.
 */
export class EmailServers {

    public static async active(): Promise<EmailServerConfig | null> {

        return (await this.saved()) ?? this.environment();

    }


    /** What the admin page shows; never includes the password. */
    public static async info(): Promise<EmailServerInfo> {

        const row = await this.row();
        const saved = await this.saved(row);
        const environment = this.environment();
        const source: EmailServerSource = saved ? 'SETTINGS' : environment ? 'ENVIRONMENT' : 'NONE';
        const shown = row ?? null;

        return {
            Host: shown?.Host || environment?.host || '',
            Port: shown?.Port || environment?.port || DEFAULT_PORT,
            Username: shown?.Username || environment?.username || '',
            Sender: shown?.Sender || (shown ? '' : environment?.sender || ''),
            Saved: !!row,
            PasswordReadable: !!row && SecretCipher.decrypt(row.Password) !== null,
            Source: source
        };

    }


    public static async row(): Promise<EmailServerRow | null> {

        return (await SELECT.one.from(this.entity()).where({ ID: EMAIL_SERVER_ID }) as EmailServerRow | undefined) ?? null;

    }


    public static async store(values: Omit<EmailServerRow, 'ID'>): Promise<void> {

        await UPSERT.into(this.entity()).entries({ ID: EMAIL_SERVER_ID, ...values });

    }


    public static async remove(): Promise<void> {

        await DELETE.from(this.entity()).where({ ID: EMAIL_SERVER_ID });

    }


    private static async saved(row?: EmailServerRow | null): Promise<EmailServerConfig | null> {

        const current = row === undefined ? await this.row() : row;
        const password = current ? SecretCipher.decrypt(current.Password) : null;

        if (!current?.Host || !current.Username || password === null) {
            return null;
        }

        return {
            host: current.Host,
            port: current.Port || DEFAULT_PORT,
            username: current.Username,
            password,
            sender: current.Sender || current.Username
        };

    }


    private static environment(): EmailServerConfig | null {

        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
            return null;
        }

        return {
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || DEFAULT_PORT,
            username: SMTP_USER,
            password: SMTP_PASSWORD,
            sender: SMTP_USER
        };

    }


    private static entity() {

        return cds.entities(ENTITIES_NAMESPACE).EmailServers;

    }

}
