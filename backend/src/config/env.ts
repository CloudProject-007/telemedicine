import { z } from 'zod';

/** Treat empty strings (e.g. `REDIS_URL=`) as "not set". */
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const csv = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const optionalCsv = z.preprocess(emptyToUndefined, csv.optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    CORS_ORIGINS: csv.default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ISSUER: z.string().min(1).default('telemedicine-api'),
    JWT_AUDIENCE: z.string().min(1).default('telemedicine-clients'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 3600),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    AWS_REGION: z.string().min(1).default('ap-south-1'),
    S3_BUCKET: z.string().min(1),
    S3_ENDPOINT: optionalUrl,
    S3_FORCE_PATH_STYLE: booleanString.default('false'),
    UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),

    REDIS_URL: optionalUrl,
    STUN_URLS: csv.default('stun:stun.l.google.com:19302'),
    TURN_URLS: optionalCsv,
    TURN_SECRET: optionalString,
    TURN_CREDENTIAL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    CALL_JOIN_EARLY_MINUTES: z.coerce.number().int().min(0).default(15),
    CALL_JOIN_LATE_MINUTES: z.coerce.number().int().min(0).default(30),

    /** Public address of the web app. Used for links inside notifications. */
    APP_URL: z.string().url().default('http://localhost:5173'),
    /** Time zone used when a time is written into an email or SMS. */
    NOTIFICATION_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),

    /** Amazon SNS topic for email notifications. Unset = messages are only logged. */
    SNS_TOPIC_ARN: optionalString,

    /**
     * Reminders: EventBridge Scheduler fires one-time schedules into an SQS queue, and this app
     * reads the queue. Unset = no reminders are scheduled.
     */
    SQS_REMINDER_QUEUE_URL: optionalUrl,
    SQS_REMINDER_QUEUE_ARN: optionalString,
    SCHEDULER_ROLE_ARN: optionalString,
    SCHEDULER_GROUP_NAME: z.string().min(1).default('telecare-reminders'),
    /** Turn off on instances that should only serve HTTP. */
    RUN_REMINDER_WORKER: booleanString.default('true'),

    /** CloudFront signed downloads. Unset = downloads use S3 pre-signed URLs. */
    CLOUDFRONT_DOMAIN: optionalString,
    CLOUDFRONT_KEY_PAIR_ID: optionalString,
    CLOUDFRONT_PRIVATE_KEY: optionalString,
  })
  .superRefine((value, ctx) => {
    if (value.TURN_URLS && !value.TURN_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TURN_SECRET'],
        message: 'TURN_SECRET is required when TURN_URLS is set',
      });
    }

    // Scheduling needs the queue to write to and the role EventBridge Scheduler assumes to do so.
    if (Boolean(value.SCHEDULER_ROLE_ARN) !== Boolean(value.SQS_REMINDER_QUEUE_ARN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SCHEDULER_ROLE_ARN'],
        message: 'SCHEDULER_ROLE_ARN and SQS_REMINDER_QUEUE_ARN must be set together',
      });
    }

    const cloudFront = [
      value.CLOUDFRONT_DOMAIN,
      value.CLOUDFRONT_KEY_PAIR_ID,
      value.CLOUDFRONT_PRIVATE_KEY,
    ];
    if (cloudFront.some(Boolean) && !cloudFront.every(Boolean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLOUDFRONT_DOMAIN'],
        message:
          'CLOUDFRONT_DOMAIN, CLOUDFRONT_KEY_PAIR_ID and CLOUDFRONT_PRIVATE_KEY must be set together',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
export const isProduction = env.NODE_ENV === 'production';
