import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type LoginInput, type RegisterInput } from '@/lib/api/auth.api';
import { onSessionExpired, refreshSession, tokenStore } from '@/lib/api/client';
import type { AuthResult, User } from '@/types/api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

const ANONYMOUS: AuthState = { status: 'anonymous', user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // Restore the session on first load. `refreshSession` is single-flight, so React StrictMode's
  // double effect shares one request instead of burning the rotating refresh token twice.
  useEffect(() => {
    let active = true;

    void (async () => {
      if (!tokenStore.getRefresh()) {
        setState(ANONYMOUS);
        return;
      }
      const outcome = await refreshSession();
      if (!active) return;
      setState(
        outcome.kind === 'ok' ? { status: 'authenticated', user: outcome.session.user } : ANONYMOUS,
      );
    })();

    const stopListening = onSessionExpired(() => {
      queryClient.clear();
      setState(ANONYMOUS);
    });

    return () => {
      active = false;
      stopListening();
    };
  }, [queryClient]);

  const startSession = useCallback(
    (result: AuthResult): User => {
      tokenStore.set(result.tokens);
      queryClient.clear(); // never show the previous person's cached data
      setState({ status: 'authenticated', user: result.user });
      return result.user;
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginInput) => startSession(await authApi.login(input)),
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => startSession(await authApi.register(input)),
    [startSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Signing out must always work locally, even if the server cannot be reached.
      }
    }
    tokenStore.clear();
    queryClient.clear();
    setState(ANONYMOUS);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
