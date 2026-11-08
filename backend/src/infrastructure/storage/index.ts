import { env } from '../../config/env';
import { CloudFrontSigner } from '../cdn/cloudfront';
import { S3StorageService } from './s3.storage';
import type { StorageService } from './storage.types';

let instance: StorageService | undefined;
let cloudFront: CloudFrontSigner | null | undefined;

/** Lazily created singleton so importing modules never opens connections at load time. */
export function getStorage(): StorageService {
  instance ??= new S3StorageService({
    bucket: env.S3_BUCKET,
    region: env.AWS_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  return instance;
}

function getCloudFront(): CloudFrontSigner | null {
  if (cloudFront !== undefined) return cloudFront;
  cloudFront =
    env.CLOUDFRONT_DOMAIN && env.CLOUDFRONT_KEY_PAIR_ID && env.CLOUDFRONT_PRIVATE_KEY
      ? new CloudFrontSigner({
          domain: env.CLOUDFRONT_DOMAIN,
          keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
          privateKey: env.CLOUDFRONT_PRIVATE_KEY,
        })
      : null;
  return cloudFront;
}

/**
 * The link a person uses to download a stored file. Goes through CloudFront when it is set up
 * (the edge location nearest to them serves it), and otherwise falls back to a direct S3 link.
 * Uploads always go straight to S3.
 */
export async function createDownloadLink(params: {
  key: string;
  fileName: string;
  expiresInSeconds: number;
}): Promise<string> {
  const signer = getCloudFront();
  if (signer) return signer.createSignedUrl(params.key, params.expiresInSeconds);
  return getStorage().createDownloadUrl(params);
}

export type { StorageService, StoredObjectInfo } from './storage.types';
