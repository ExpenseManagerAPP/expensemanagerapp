import type { MailMessage } from '../infrastructure/Mailer';

export type MailLanguage = 'pt' | 'en';

interface MailTexts {
    subject: string;
    greeting: string;
    body: string;
    action?: string;
    footer: string;
}

const TEXTS: Record<MailLanguage, Record<'confirm' | 'reset' | 'registered', MailTexts>> = {
    pt: {
        confirm: {
            subject: 'Confirme sua conta no Expense Manager',
            greeting: 'Olá{name}!',
            body: 'Falta só confirmar seu email para começar a usar o Expense Manager. O link vale por 48 horas.',
            action: 'Confirmar minha conta',
            footer: 'Se você não criou esta conta, ignore este email.'
        },
        reset: {
            subject: 'Redefina sua senha do Expense Manager',
            greeting: 'Olá{name}!',
            body: 'Recebemos um pedido para redefinir sua senha. O link vale por 1 hora e só pode ser usado uma vez.',
            action: 'Criar nova senha',
            footer: 'Se você não pediu, ignore este email: sua senha continua a mesma.'
        },
        registered: {
            subject: 'Você já tem uma conta no Expense Manager',
            greeting: 'Olá{name}!',
            body: 'Alguém tentou criar uma conta com este email, mas ele já está cadastrado. Se esqueceu a senha, use "Esqueci minha senha" na tela de login.',
            action: 'Ir para o login',
            footer: 'Se não foi você, ignore este email.'
        }
    },
    en: {
        confirm: {
            subject: 'Confirm your Expense Manager account',
            greeting: 'Hello{name}!',
            body: 'Just confirm your e-mail to start using Expense Manager. The link is valid for 48 hours.',
            action: 'Confirm my account',
            footer: 'If you did not create this account, ignore this e-mail.'
        },
        reset: {
            subject: 'Reset your Expense Manager password',
            greeting: 'Hello{name}!',
            body: 'We received a request to reset your password. The link is valid for 1 hour and works only once.',
            action: 'Create a new password',
            footer: 'If you did not ask for it, ignore this e-mail: your password stays the same.'
        },
        registered: {
            subject: 'You already have an Expense Manager account',
            greeting: 'Hello{name}!',
            body: 'Someone tried to create an account with this e-mail, but it is already registered. If you forgot the password, use "Forgot my password" on the sign-in page.',
            action: 'Go to sign in',
            footer: 'If it was not you, ignore this e-mail.'
        }
    }
};

function escapeHtml(value: string): string {

    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

}

/**
 * The account e-mails (confirmation, password reset, already registered),
 * with an HTML and a plain-text part in Portuguese or English.
 */
export class AccountMails {

    public static build(kind: keyof typeof TEXTS['pt'], language: MailLanguage, to: string, name: string, link: string): MailMessage {

        const texts = TEXTS[language][kind];
        const greeting = texts.greeting.replace('{name}', name ? `, ${name}` : '');

        const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#102a2b">`
            + `<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e7eeee">`
            + `<p style="margin:0 0 4px;font-size:13px;font-weight:bold;letter-spacing:.08em;color:#087c67">EXPENSE MANAGER</p>`
            + `<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(greeting)}</h1>`
            + `<p style="margin:0 0 24px;font-size:15px;line-height:1.5">${escapeHtml(texts.body)}</p>`
            + (texts.action
                ? `<p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#087c67;color:#ffffff;font-weight:bold;text-decoration:none">${escapeHtml(texts.action)}</a></p>`
                + `<p style="margin:0 0 24px;font-size:12px;color:#687b7c;word-break:break-all">${escapeHtml(link)}</p>`
                : '')
            + `<p style="margin:0;font-size:12px;color:#687b7c">${escapeHtml(texts.footer)}</p>`
            + `</div></body></html>`;

        const text = [greeting, '', texts.body, '', texts.action ? `${texts.action}: ${link}` : '', '', texts.footer].join('\n');

        return { to, subject: texts.subject, html, text };

    }

}
