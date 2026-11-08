import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageService, StoredObjectInfo } from './storage.types';

export interface S3StorageOptions {
  bucket: string;
  region: string;
  endpoint?: string | undefined;
  forcePathStyle?: boolean | undefined;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    // Credentials come from the default provider chain (IAM role on EC2, env vars locally).
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      forcePathStyle: options.forcePathStyle ?? false,
    });
  }

  createUploadUrl({
    key,
    contentType,
    expiresInSeconds,
  }: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  createDownloadUrl({
    key,
    fileName,
    expiresInSeconds,
  }: {
    key: string;
    fileName: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const safeName = fileName.replace(/["\\\r\n]/g, '_');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async putObject({
    key,
    body,
    contentType,
  }: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
  }

  async getObjectInfo(key: string): Promise<StoredObjectInfo | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
        return null;
      }
      if (error instanceof Error && error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
