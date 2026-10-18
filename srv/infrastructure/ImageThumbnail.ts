import cds from '@sap/cds';
import sharp from 'sharp';

export interface Thumbnail {
    content: Buffer;
    contentType: string;
    extension: string;
}

const JPEG_QUALITY = 75;

/**
 * Small images for e-mails: a photo becomes a cropped JPEG and the logo a
 * palette PNG (keeps the transparency), both at twice the displayed size for
 * sharp screens. Returns null when the image cannot be read.
 */
export class ImageThumbnail {

    public static async photo(content: Buffer, size: number): Promise<Thumbnail | null> {

        try {

            const result = await sharp(content)
                .rotate()
                .resize(size, size, { fit: 'cover' })
                .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
                .toBuffer();

            return { content: result, contentType: 'image/jpeg', extension: 'jpg' };

        } catch (error) {

            cds.log('email').warn('E-mail photo could not be created:', (error as Error).message);
            return null;

        }

    }


    public static async logo(content: Buffer, size: number): Promise<Thumbnail | null> {

        try {

            const result = await sharp(content)
                .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png({ palette: true, compressionLevel: 9 })
                .toBuffer();

            return { content: result, contentType: 'image/png', extension: 'png' };

        } catch (error) {

            cds.log('email').warn('E-mail logo could not be created:', (error as Error).message);
            return null;

        }

    }

}
