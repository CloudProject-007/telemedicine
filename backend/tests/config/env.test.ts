import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  S3_BUCKET: 'bucket',
};

describe('parseEnv', () => {
  it('applies defaults and parses lists', () => {
    const env = parseEnv({ ...base, CORS_ORIGINS: 'http://a.com, http://b.com' });
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.REDIS_URL).toBeUndefined();
  });

  it('treats empty optional values as unset', () => {
    const env = parseEnv({
      ...base,
      REDIS_URL: '',
      S3_ENDPOINT: '',
      TURN_URLS: '',
      TURN_SECRET: '',
    });
    expect(env.REDIS_URL).toBeUndefined();
    expect(env.S3_ENDPOINT).toBeUndefined();
    expect(env.TURN_URLS).toBeUndefined();
  });

  it('rejects a short JWT secret', () => {
    expect(() => parseEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('requires TURN_SECRET when TURN_URLS is set', () => {
    expect(() => parseEnv({ ...base, TURN_URLS: 'turn:turn.example.com:3478' })).toThrow(
      /TURN_SECRET/,
    );
  });

  it('reports every missing variable', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL[\s\S]*S3_BUCKET/);
  });

  it('needs the scheduler role and the queue ARN together', () => {
    expect(() => parseEnv({ ...base, SCHEDULER_ROLE_ARN: 'arn:aws:iam::1:role/r' })).toThrow(
      /SQS_REMINDER_QUEUE_ARN/,
    );
    expect(() =>
      parseEnv({
        ...base,
        SCHEDULER_ROLE_ARN: 'arn:aws:iam::1:role/r',
        SQS_REMINDER_QUEUE_ARN: 'arn:aws:sqs:ap-south-1:1:q',
      }),
    ).not.toThrow();
  });

  it('needs all three CloudFront settings or none', () => {
    expect(() => parseEnv({ ...base, CLOUDFRONT_DOMAIN: 'd1.cloudfront.net' })).toThrow(
      /CLOUDFRONT_KEY_PAIR_ID/,
    );
    const env = parseEnv({
      ...base,
      CLOUDFRONT_DOMAIN: 'd1.cloudfront.net',
      CLOUDFRONT_KEY_PAIR_ID: 'K123',
      CLOUDFRONT_PRIVATE_KEY: 'pem',
    });
    expect(env.CLOUDFRONT_DOMAIN).toBe('d1.cloudfront.net');
  });

  it('defaults the notification settings', () => {
    const env = parseEnv(base);
    expect(env.APP_URL).toBe('http://localhost:5173');
    expect(env.NOTIFICATION_TIMEZONE).toBe('Asia/Kolkata');
    expect(env.RUN_REMINDER_WORKER).toBe(true);
    expect(env.SNS_TOPIC_ARN).toBeUndefined();
  });
});
