// Deterministic environment for every test file. Runs before any module imports `config/env`.
const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-1234',
  S3_BUCKET: 'test-bucket',
  BCRYPT_ROUNDS: '4',
  STUN_URLS: 'stun:stun.example.com:3478',
  CORS_ORIGINS: 'http://localhost:5173',
  CALL_JOIN_EARLY_MINUTES: '15',
  CALL_JOIN_LATE_MINUTES: '30',
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}
delete process.env['TURN_URLS'];
delete process.env['TURN_SECRET'];
delete process.env['REDIS_URL'];
delete process.env['S3_ENDPOINT'];
for (const key of [
  'SNS_TOPIC_ARN',
  'SQS_REMINDER_QUEUE_URL',
  'SQS_REMINDER_QUEUE_ARN',
  'SCHEDULER_ROLE_ARN',
  'CLOUDFRONT_DOMAIN',
  'CLOUDFRONT_KEY_PAIR_ID',
  'CLOUDFRONT_PRIVATE_KEY',
]) {
  delete process.env[key];
}
