import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './schemas';

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = { name: 'Asha Rao', email: 'asha@example.com', phone: '', password: 'secret123' };
  it('accepts a valid sign-up, with the phone left empty', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });
  it.each(['short1', 'onlyletters', '12345678'])('rejects weak password %s', (password) => {
    expect(registerSchema.safeParse({ ...valid, password }).success).toBe(false);
  });
  it('rejects a malformed phone number', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '12ab' }).success).toBe(false);
  });
});
