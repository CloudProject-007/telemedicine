import type { AuthResult } from '@/types/api';
import { apiRequest } from './client';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string | undefined;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<AuthResult>('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (input: LoginInput) =>
    apiRequest<AuthResult>('/auth/login', { method: 'POST', body: input, auth: false }),

  logout: (refreshToken: string) =>
    apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
};
