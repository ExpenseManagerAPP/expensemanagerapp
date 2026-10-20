export type MailLocale = 'pt' | 'en';

/**
 * Idioma dos e-mails transacionais e dos PDFs anexados. Segue o mesmo
 * padrão do AccountMails: locale da requisição (Accept-Language do
 * usuário logado), com default 'pt' quando não houver ou for desconhecido.
 */
export function mailLocale(request?: { locale?: string } | null): MailLocale {

    return String(request?.locale || '')
        .toLowerCase()
        .startsWith('en')
        ? 'en'
        : 'pt';

}
