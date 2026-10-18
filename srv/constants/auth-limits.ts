export const AUTH_LIMITS = {
    maxAttemptsPerWindow: 10,
    windowInMinutes: 15,
    maxCredentialLength: 256,
    minPasswordLength: 8,
    accessTokenSeconds: 60 * 60,
    refreshTokenSeconds: 30 * 24 * 60 * 60,
    userCacheSeconds: 30,
    confirmationLinkSeconds: 48 * 60 * 60,
    resetLinkSeconds: 60 * 60,
    maxNameLength: 100
} as const;

export const ACTION_TOKEN_PURPOSES = {
    confirm: 'confirm',
    reset: 'reset'
} as const;

/** Front-end address used in the links sent by e-mail (APP_URL overrides it). */
export const DEFAULT_APP_URL = 'https://expensemanagerapp.github.io/';

export const USER_ROLES = {
    user: 'User',
    admin: 'Admin'
} as const;

export const USER_STATUSES = {
    pending: 'Pending',
    active: 'Active',
    disabled: 'Disabled'
} as const;

/** Role every signed-in user gets; the services require it. */
export const APP_ROLE = 'ExpenseManagerUser';
