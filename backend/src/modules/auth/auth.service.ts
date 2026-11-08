import { Role, type User } from '@prisma/client';
import { env } from '../../config/env';
import { isPrismaError, prisma } from '../../infrastructure/prisma';
import { signAccessToken } from '../../shared/auth/jwt';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../../shared/auth/password';
import { generateRefreshToken, hashRefreshToken } from '../../shared/auth/refresh-token';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error';
import type { LoginInput, RefreshInput, RegisterInput } from './auth.schemas';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user: Pick<User, 'id' | 'role'>): Promise<AuthTokens> {
  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt },
  });
  return {
    accessToken: signAccessToken({ id: user.id, role: user.role }),
    refreshToken: refresh.token,
    tokenType: 'Bearer',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

/** Public registration always creates a PATIENT. Doctors are created by an admin. */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        role: Role.PATIENT,
      },
    });
    return { user: toPublicUser(user), tokens: await issueTokens(user) };
  } catch (error) {
    // Unique constraint on email also protects against the check-then-insert race.
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictError('An account with this email already exists');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return { user: toPublicUser(user), tokens: await issueTokens(user) };
}

/**
 * Rotating refresh tokens with reuse detection: presenting an already-revoked token
 * means it was probably stolen, so every session of that user is revoked.
 */
export async function refresh(input: RefreshInput): Promise<AuthResult> {
  const tokenHash = hashRefreshToken(input.refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected. Please log in again.');
  }

  if (stored.expiresAt <= new Date() || !stored.user.isActive) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Atomically claim the token so two concurrent refreshes cannot both succeed.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  return { user: toPublicUser(stored.user), tokens: await issueTokens(stored.user) };
}

export async function logout(input: RefreshInput): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(input.refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new NotFoundError('User');
  }
  return toPublicUser(user);
}
