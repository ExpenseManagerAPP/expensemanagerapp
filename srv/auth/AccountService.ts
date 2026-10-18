import cds from '@sap/cds';
import { createHash, randomBytes } from 'crypto';
import { AuthError, AuthService, type TokenResponse } from './AuthService';
import { AccountMails, type MailLanguage } from './AccountMails';
import { PasswordHasher } from './PasswordHasher';
import { UserRepository, type UserRecord } from './UserRepository';
import { Mailer } from '../infrastructure/Mailer';
import { appUrl } from '../infrastructure/AppUrl';
import { ACTION_TOKEN_PURPOSES, AUTH_LIMITS, USER_ROLES, USER_STATUSES } from '../constants/auth-limits';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignUpStatus = 'confirmation_sent' | 'pending_approval';

type Purpose = typeof ACTION_TOKEN_PURPOSES[keyof typeof ACTION_TOKEN_PURPOSES];

function hashToken(token: string): string {

    return createHash('sha256').update(token).digest('hex');

}


/**
 * Self-service account flows: sign-up (confirmed by e-mail, or approved by an
 * admin when no e-mail server exists), account confirmation and password
 * reset. The answers never tell whether an e-mail is registered.
 */
export class AccountService {

    public static async signUp(email: string, name: string, password: string, language: MailLanguage): Promise<SignUpStatus> {

        const normalizedEmail = this.assertEmail(email);
        const trimmedName = this.assertName(name);

        AuthService.assertStrong(password);

        const delivers = await Mailer.canDeliver();
        const status: SignUpStatus = delivers ? 'confirmation_sent' : 'pending_approval';
        const existing = await UserRepository.findByEmail(normalizedEmail);

        if (existing) {

            await this.handleExistingSignUp(existing, language);

            return status;

        }

        await UserRepository.create({
            Email: normalizedEmail,
            Name: trimmedName,
            PasswordHash: await PasswordHasher.hash(password),
            Role: USER_ROLES.user,
            Status: USER_STATUSES.pending,
            MustChangePassword: false
        });

        if (delivers) {
            const user = await UserRepository.findByEmail(normalizedEmail);
            await this.sendLink(user as UserRecord, ACTION_TOKEN_PURPOSES.confirm, language);
        } else {
            cds.log('users').info('New account waiting for approval:', normalizedEmail);
        }

        return status;

    }


    /**
     * Activates the account of a confirmation link and signs the user in.
     */
    public static async confirm(token: string): Promise<TokenResponse> {

        const user = await this.userOfLink(token, ACTION_TOKEN_PURPOSES.confirm);

        await UserRepository.update(user.ID, { Status: USER_STATUSES.active, ...this.clearedLink() });
        AuthService.forget(user.Email);

        return AuthService.issue({ ...user, Status: USER_STATUSES.active });

    }


    /**
     * Sends a reset link to an active account; silently does nothing otherwise.
     */
    public static async forgotPassword(email: string, language: MailLanguage): Promise<void> {

        const user = EMAIL_PATTERN.test(email.trim()) ? await UserRepository.findByEmail(email) : null;

        if (user?.Status === USER_STATUSES.active && await Mailer.canDeliver()) {
            await this.sendLink(user, ACTION_TOKEN_PURPOSES.reset, language);
        }

    }


    /**
     * Sets the password of a reset link, invalidates the previous sessions and
     * signs the user in.
     */
    public static async resetPassword(token: string, newPassword: string): Promise<TokenResponse> {

        AuthService.assertStrong(newPassword);

        const user = await this.userOfLink(token, ACTION_TOKEN_PURPOSES.reset);
        const changes = {
            PasswordHash: await PasswordHasher.hash(newPassword),
            MustChangePassword: false,
            TokenVersion: (user.TokenVersion || 0) + 1,
            ...this.clearedLink()
        };

        await UserRepository.update(user.ID, changes);
        AuthService.forget(user.Email);

        return AuthService.issue({ ...user, ...changes });

    }


    /**
     * A repeated sign-up re-sends the confirmation of a pending account, or
     * warns the owner of an active one, without telling the requester.
     */
    private static async handleExistingSignUp(user: UserRecord, language: MailLanguage): Promise<void> {

        if (!(await Mailer.canDeliver())) {
            return;
        }

        if (user.Status === USER_STATUSES.pending) {
            await this.sendLink(user, ACTION_TOKEN_PURPOSES.confirm, language);
            return;
        }

        if (user.Status === USER_STATUSES.active) {
            await Mailer.send(AccountMails.build('registered', language, user.Email, user.Name || '', `${appUrl()}#/login`));
        }

    }


    private static async sendLink(user: UserRecord, purpose: Purpose, language: MailLanguage): Promise<void> {

        const token = randomBytes(32).toString('base64url');
        const lifetime = purpose === ACTION_TOKEN_PURPOSES.confirm ? AUTH_LIMITS.confirmationLinkSeconds : AUTH_LIMITS.resetLinkSeconds;

        await UserRepository.update(user.ID, {
            ActionTokenHash: hashToken(token),
            ActionTokenPurpose: purpose,
            ActionTokenExpires: new Date(Date.now() + lifetime * 1000).toISOString()
        });

        const route = purpose === ACTION_TOKEN_PURPOSES.confirm ? 'confirm-email' : 'reset-password';
        const kind = purpose === ACTION_TOKEN_PURPOSES.confirm ? 'confirm' : 'reset';

        await Mailer.send(AccountMails.build(kind, language, user.Email, user.Name || '', `${appUrl()}#/${route}/${token}`));

    }


    private static async userOfLink(token: string, purpose: Purpose): Promise<UserRecord> {

        const user = token ? await UserRepository.findByActionToken(hashToken(token), purpose) : null;
        const expired = !user?.ActionTokenExpires || new Date(user.ActionTokenExpires).getTime() < Date.now();

        if (!user || expired || user.Status === USER_STATUSES.disabled) {
            throw new AuthError('invalid_link', 400);
        }

        return user;

    }


    private static clearedLink(): Partial<UserRecord> {

        return { ActionTokenHash: null, ActionTokenPurpose: null, ActionTokenExpires: null };

    }


    private static assertEmail(email: string): string {

        const normalized = (email || '').trim().toLowerCase();

        if (!EMAIL_PATTERN.test(normalized) || normalized.length > AUTH_LIMITS.maxCredentialLength) {
            throw new AuthError('invalid_email', 400);
        }

        return normalized;

    }


    private static assertName(name: string): string {

        const trimmed = (name || '').trim();

        if (!trimmed || trimmed.length > AUTH_LIMITS.maxNameLength) {
            throw new AuthError('invalid_name', 400);
        }

        return trimmed;

    }

}
