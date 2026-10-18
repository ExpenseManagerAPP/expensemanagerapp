import { DEFAULT_APP_URL } from '../constants/auth-limits';

/**
 * Address of the front-end used in e-mail links (APP_URL overrides the
 * GitHub Pages address), always ending so that "#/route" can be appended.
 */
export function appUrl(): string {

    const base = process.env.APP_URL || DEFAULT_APP_URL;

    return base.endsWith('/') || base.endsWith('.html') ? base : `${base}/`;

}
