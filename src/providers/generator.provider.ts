/* eslint-disable sonarjs/pseudo-random */
import { v1 as uuid } from 'uuid';

export class GeneratorProvider {
  static uuid(): string {
    return uuid();
  }

  static fileName(ext: string): string {
    return `${GeneratorProvider.uuid()}.${ext}`;
  }

  static getS3PublicUrl(key: string): string {
    if (!key) {
      throw new TypeError('key is required');
    }

    return `${GeneratorProvider.getStoragePublicUrlBase()}/${key}`;
  }

  static getS3Key(publicUrl: string): string {
    if (!publicUrl) {
      throw new TypeError('key is required');
    }

    const publicUrlBase = `${GeneratorProvider.getStoragePublicUrlBase()}/`;

    if (!publicUrl.startsWith(publicUrlBase)) {
      throw new TypeError('publicUrl is invalid');
    }

    return publicUrl.slice(publicUrlBase.length);
  }

  private static getStoragePublicUrlBase(): string {
    const storagePublicUrlBase = process.env.STORAGE_PUBLIC_URL_BASE;

    if (storagePublicUrlBase) {
      let normalizedStoragePublicUrlBase = storagePublicUrlBase;

      while (normalizedStoragePublicUrlBase.endsWith('/')) {
        normalizedStoragePublicUrlBase = normalizedStoragePublicUrlBase.slice(
          0,
          -1,
        );
      }

      return normalizedStoragePublicUrlBase;
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const bucketRegion =
      process.env.AWS_S3_BUCKET_REGION ?? process.env.AWS_S3_BUCKET_NAME_REGION;

    if (!bucketName || !bucketRegion) {
      throw new TypeError('storage public URL base is not configured');
    }

    return `https://s3.${bucketRegion}.amazonaws.com/${bucketName}`;
  }

  static generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  static generatePassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = lowercase.toUpperCase();
    const numbers = '0123456789';

    let text = '';

    for (let i = 0; i < 4; i++) {
      text += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      text += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      text += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return text;
  }

  /**
   * generate random string
   * @param length
   */
  static generateRandomString(length: number): string {
    return Math.random()
      .toString(36)
      .replaceAll(/[^\dA-Za-z]+/g, '')
      .slice(0, Math.max(0, length));
  }
}
