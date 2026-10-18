const ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x3D;': '=',
    '&middot;': '·',
    '&copy;': '©'
};

/**
 * Plain-text version of an e-mail body (the "text" part next to the HTML),
 * which mail clients and spam filters expect: links become "label: url",
 * table cells and blocks become spaced lines.
 */
export class HtmlText {

    public static from(html: string): string {

        const text = html
            .replace(/<(head|style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<img[^>]*>/gi, '')
            .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url: string, label: string) => `${this.strip(label).trim()}: ${url}`)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
            .replace(/<\/t[dh]>/gi, '  ')
            .replace(/<li[^>]*>/gi, '- ');

        return this.decode(this.strip(text))
            .split('\n')
            .map((line) => line.replace(/[ \t]+/g, ' ').trim())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

    }


    private static strip(html: string): string {

        return html.replace(/<[^>]+>/g, '');

    }


    private static decode(text: string): string {

        return text.replace(/&[#\w]+;/g, (entity) => ENTITIES[entity] ?? entity);

    }

}
