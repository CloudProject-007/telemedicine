import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

export interface CloudFrontOptions {
  /** The distribution's domain, for example "d111111abcdef8.cloudfront.net". */
  domain: string;
  /** Id of the public key CloudFront trusts (the one in the key group). */
  keyPairId: string;
  /** PEM private key. Line breaks may be written as "\n" so it fits in one environment variable. */
  privateKey: string;
}

/** Encodes each part of an object key, keeping the "/" between parts. */
export function encodeObjectPath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n');
}

/**
 * Time-limited links to private files that CloudFront serves from S3. The bucket stays closed to
 * the public: CloudFront reads it with its own identity, and only a link signed with our private
 * key is allowed through.
 */
export class CloudFrontSigner {
  private readonly privateKey: string;

  constructor(private readonly options: CloudFrontOptions) {
    this.privateKey = normalizePrivateKey(options.privateKey);
  }

  createSignedUrl(key: string, expiresInSeconds: number, now: Date = new Date()): string {
    return getSignedUrl({
      url: `https://${this.options.domain}/${encodeObjectPath(key)}`,
      keyPairId: this.options.keyPairId,
      privateKey: this.privateKey,
      dateLessThan: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
    });
  }
}
