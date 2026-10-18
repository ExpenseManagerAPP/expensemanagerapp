import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AppSecret } from './AppSecret';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;

/**
 * Encrypts stored secrets (e.g. the SMTP password) as
 * `v1:iv:tag:content` (base64), with a key derived from SETTINGS_SECRET.
 */
export class SecretCipher {

    public static isAvailable(): boolean {

        return AppSecret.isAvailable();

    }


    public static encrypt(plain: string): string {

        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv(ALGORITHM, AppSecret.key('settings'), iv);
        const content = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

        return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), content.toString('base64')].join(':');

    }


    /**
     * @returns the plain text, or null when the value cannot be read (another
     * secret, a changed SETTINGS_SECRET or a damaged value)
     */
    public static decrypt(stored?: string | null): string | null {

        const [version, iv, tag, content] = (stored || '').split(':');

        if (version !== VERSION || !iv || !tag || !content) {
            return null;
        }

        try {

            const decipher = createDecipheriv(ALGORITHM, AppSecret.key('settings'), Buffer.from(iv, 'base64'));
            decipher.setAuthTag(Buffer.from(tag, 'base64'));

            return Buffer.concat([decipher.update(Buffer.from(content, 'base64')), decipher.final()]).toString('utf8');

        } catch {

            return null;

        }

    }

}
