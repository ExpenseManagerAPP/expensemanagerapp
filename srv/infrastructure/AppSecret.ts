import { createHash } from 'crypto';

const LOCAL_SECRET = 'expense-manager-local-only';

/**
 * Server-side secret used to sign the app tokens (and, later, to encrypt
 * stored settings). Comes from SETTINGS_SECRET; a fixed value is only
 * accepted outside Cloud Foundry.
 */
export class AppSecret {

    public static isAvailable(): boolean {

        return !!this.secret();

    }


    /**
     * Derives a 32-byte key for one purpose, so the same secret never signs
     * and encrypts with the same key.
     *
     * @param purpose what the key is used for (e.g. "token")
     */
    public static key(purpose: string): Buffer {

        const secret = this.secret();

        if (!secret) {
            throw new Error('No application secret configured (SETTINGS_SECRET)');
        }

        return createHash('sha256').update(`expense-manager:${purpose}:${secret}`).digest();

    }


    private static secret(): string | undefined {

        return process.env.SETTINGS_SECRET
            || (process.env.VCAP_APPLICATION ? undefined : LOCAL_SECRET);

    }

}
