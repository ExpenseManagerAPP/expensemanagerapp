import cds from '@sap/cds';
import { AuthService } from './AuthService';
import { PasswordHasher } from './PasswordHasher';
import { UserRepository, type UserRecord } from './UserRepository';
import { AUTH_LIMITS, USER_ROLES, USER_STATUSES } from '../constants/auth-limits';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: string[] = Object.values(USER_ROLES);
const SETTABLE_STATUSES: string[] = [USER_STATUSES.active, USER_STATUSES.disabled];

export type AdminErrorCode =
    | 'userNotFound'
    | 'invalidEmail'
    | 'invalidName'
    | 'invalidRole'
    | 'invalidStatus'
    | 'weakPassword'
    | 'emailInUse'
    | 'notPending'
    | 'ownAccount';

export class AdminError extends Error {

    constructor(public readonly code: AdminErrorCode, public readonly status = 400) {

        super(code);

    }

}

/**
 * What an admin can do with the users: create, approve, enable/disable,
 * change the role and set a new password. An admin cannot disable or demote
 * the own account, so there is always at least one active admin.
 */
export class UserAdministration {

    public static async createUser(email: string, name: string, password: string, role: string, actor: string): Promise<void> {

        const normalizedEmail = (email || '').trim().toLowerCase();

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            throw new AdminError('invalidEmail');
        }

        const trimmedName = (name || '').trim();

        if (!trimmedName || trimmedName.length > AUTH_LIMITS.maxNameLength) {
            throw new AdminError('invalidName');
        }

        this.assertRole(role);
        this.assertPassword(password);

        if (await UserRepository.findByEmail(normalizedEmail)) {
            throw new AdminError('emailInUse', 409);
        }

        await UserRepository.create({
            Email: normalizedEmail,
            Name: trimmedName,
            Role: role,
            Status: USER_STATUSES.active,
            PasswordHash: await PasswordHasher.hash(password),
            MustChangePassword: true
        });

        cds.log('users').info(`User ${normalizedEmail} created by ${actor}`);

    }


    public static async approve(userId: string): Promise<void> {

        const user = await this.find(userId);

        if (user.Status !== USER_STATUSES.pending) {
            throw new AdminError('notPending');
        }

        await this.update(user, {
            Status: USER_STATUSES.active,
            ActionTokenHash: null,
            ActionTokenPurpose: null,
            ActionTokenExpires: null
        });

    }


    /**
     * Enables or disables an account; disabling ends its open sessions.
     */
    public static async setStatus(userId: string, status: string, actor: string): Promise<void> {

        if (!SETTABLE_STATUSES.includes(status)) {
            throw new AdminError('invalidStatus');
        }

        const user = await this.find(userId);
        this.assertNotSelf(user, actor);

        await this.update(user, {
            Status: status,
            ...(status === USER_STATUSES.disabled ? { TokenVersion: (user.TokenVersion || 0) + 1 } : {})
        });

    }


    public static async setRole(userId: string, role: string, actor: string): Promise<void> {

        this.assertRole(role);

        const user = await this.find(userId);
        this.assertNotSelf(user, actor);

        await this.update(user, { Role: role });

    }


    /**
     * Gives the user a temporary password: the open sessions end and a new
     * password must be chosen on the next sign-in.
     */
    public static async resetPassword(userId: string, password: string): Promise<void> {

        this.assertPassword(password);

        const user = await this.find(userId);

        await this.update(user, {
            PasswordHash: await PasswordHasher.hash(password),
            MustChangePassword: true,
            TokenVersion: (user.TokenVersion || 0) + 1
        });

    }


    private static async find(userId: string): Promise<UserRecord> {

        const user = userId ? await UserRepository.findById(userId) : null;

        if (!user) {
            throw new AdminError('userNotFound', 404);
        }

        return user;

    }


    private static async update(user: UserRecord, changes: Partial<UserRecord>): Promise<void> {

        await UserRepository.update(user.ID, changes);
        AuthService.forget(user.Email);

    }


    private static assertRole(role: string): void {

        if (!ROLES.includes(role)) {
            throw new AdminError('invalidRole');
        }

    }


    private static assertPassword(password: string): void {

        if (typeof password !== 'string' || password.length < AUTH_LIMITS.minPasswordLength || password.length > AUTH_LIMITS.maxCredentialLength) {
            throw new AdminError('weakPassword');
        }

    }


    private static assertNotSelf(user: UserRecord, actor: string): void {

        if (user.Email.toLowerCase() === (actor || '').toLowerCase()) {
            throw new AdminError('ownAccount');
        }

    }

}
