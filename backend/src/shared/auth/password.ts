import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A valid bcrypt hash of a random value. Comparing against it when a user does not
 * exist keeps login timing similar for known and unknown emails.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-attack-mitigation', 4);
