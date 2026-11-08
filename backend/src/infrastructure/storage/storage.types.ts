export interface StoredObjectInfo {
  sizeBytes: number;
  contentType: string | undefined;
}

/**
 * Port for binary storage. The application depends on this interface only,
 * so S3 can be replaced (or faked in tests) without touching business logic.
 */
export interface StorageService {
  createUploadUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<string>;
  createDownloadUrl(params: {
    key: string;
    fileName: string;
    expiresInSeconds: number;
  }): Promise<string>;
  /** Stores bytes the server produced itself (for example a prescription PDF). */
  putObject(params: { key: string; body: Buffer; contentType: string }): Promise<void>;
  /** Returns null when the object does not exist. */
  getObjectInfo(key: string): Promise<StoredObjectInfo | null>;
  deleteObject(key: string): Promise<void>;
}
