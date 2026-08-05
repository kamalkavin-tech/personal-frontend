'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { User } from '@vaultx/shared';
import { api, setAccessToken, setRefreshToken } from '@/lib/api';
import {
  deriveKeys,
  unwrapDEK,
  importDEK,
  generateDEK,
  wrapDEK,
  randomSalt,
  EncBlob,
} from '@/lib/crypto';
import { generateDeviceId, detectPlatform } from '@/lib/utils';

type Status = 'loading' | 'anonymous' | 'locked' | 'authed';

interface LoginResult {
  requiresTwoFactor: boolean;
  pendingEmail?: string;
}

interface AuthContextValue {
  status: Status;
  user: User | null;
  dek: CryptoKey | null;
  deviceId: string;
  unlock: (masterPassword: string) => Promise<void>;
  login: (email: string, masterPassword: string, rememberDevice?: boolean) => Promise<LoginResult>;
  loginWithCode: (email: string, code: string, rememberDevice?: boolean) => Promise<void>;
  register: (data: { email: string; name?: string; masterPassword: string }) => Promise<void>;
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deviceName: string;
}

const DEFAULT_ITERATIONS = 600_000;

const AuthContext = createContext<AuthContextValue | null>(null);

function readDeviceName(): string {
  if (typeof window === 'undefined') return 'Browser';
  let name = window.localStorage.getItem('vaultx_device_name');
  if (!name) {
    name = `${detectPlatform()} · ${navigator.userAgent.includes('Edg') ? 'Edge' : navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'}`;
    window.localStorage.setItem('vaultx_device_name', name);
  }
  return name;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const masterPasswordRef = useRef<string | null>(null);
  const deviceId = useMemo(() => (typeof window !== 'undefined' ? generateDeviceId() : 'server'), []);
  const deviceName = useMemo(() => readDeviceName(), []);

  const unlockWithPassword = useCallback(async (password: string) => {
    if (!user) throw new Error('No session');
    const { kek } = await deriveKeys(password, user.kekSalt, user.authSalt, user.iterations);
    const rawDEK = await unwrapDEK(user.wrappedDEK, kek);
    const key = await importDEK(rawDEK);
    masterPasswordRef.current = password;
    setDek(key);
    setStatus('authed');
  }, [user]);

  const bootstrap = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
      setStatus('locked');
    } catch {
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, masterPassword: string, rememberDevice = false): Promise<LoginResult> => {
      const prepared = await api.post<{ kekSalt: string; authSalt: string; iterations: number; twoFactorEnabled: boolean }>('/auth/prepare', { email });
      const { kek, authKeyHex } = await deriveKeys(masterPassword, prepared.kekSalt, prepared.authSalt, prepared.iterations);
      const result = await api.post<{ accessToken?: string; refreshToken?: string; user?: User; requiresTwoFactor: boolean; pendingEmail?: string }>('/auth/login', {
        email,
        authKey: authKeyHex,
        rememberDevice,
        deviceId,
        deviceName,
        platform: detectPlatform(),
      });

      if (result.requiresTwoFactor) {
        masterPasswordRef.current = masterPassword;
        return { requiresTwoFactor: true, pendingEmail: result.pendingEmail ?? email };
      }

      if (!result.accessToken || !result.user) throw new Error('Unexpected login response');
      setAccessToken(result.accessToken);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      setUser(result.user);
      const rawDEK = await unwrapDEK(result.user.wrappedDEK, kek);
      setDek(await importDEK(rawDEK));
      setStatus('authed');
      return { requiresTwoFactor: false };
    },
    [deviceId, deviceName],
  );

  const loginWithCode = useCallback(
    async (email: string, code: string, rememberDevice = false) => {
      const password = masterPasswordRef.current;
      if (!password) throw new Error('Please enter your master password first');
      const prepared = await api.post<{ kekSalt: string; authSalt: string; iterations: number }>('/auth/prepare', { email });
      const { kek, authKeyHex } = await deriveKeys(password, prepared.kekSalt, prepared.authSalt, prepared.iterations);
      const result = await api.post<{ accessToken: string; refreshToken?: string; user: User }>('/auth/verify-2fa', {
        email,
        authKey: authKeyHex,
        twoFactorCode: code,
        rememberDevice,
        deviceId,
        deviceName,
        platform: detectPlatform(),
      });
      setAccessToken(result.accessToken);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      setUser(result.user);
      const rawDEK = await unwrapDEK(result.user.wrappedDEK, kek);
      setDek(await importDEK(rawDEK));
      setStatus('authed');
    },
    [deviceId, deviceName],
  );

  const register = useCallback(
    async (data: { email: string; name?: string; masterPassword: string }) => {
      const kekSalt = randomSalt();
      const authSalt = randomSalt();
      const { kek, authKeyHex } = await deriveKeys(data.masterPassword, kekSalt, authSalt, DEFAULT_ITERATIONS);
      const dekRaw = await generateDEK();
      const wrapped: EncBlob = await wrapDEK(dekRaw, kek);
      const result = await api.post<{ accessToken: string; refreshToken?: string; user: User }>('/auth/register', {
        email: data.email,
        name: data.name,
        kekSalt,
        authSalt,
        iterations: DEFAULT_ITERATIONS,
        wrappedDEK: JSON.stringify(wrapped),
        authKey: authKeyHex,
        deviceId,
        deviceName,
        platform: detectPlatform(),
      });
      setAccessToken(result.accessToken);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      setUser(result.user);
      setDek(await importDEK(dekRaw));
      setStatus('authed');
    },
    [deviceId, deviceName],
  );

  const changeMasterPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error('No session');
      const current = await deriveKeys(currentPassword, user.kekSalt, user.authSalt, user.iterations);
      const rawDEK = await unwrapDEK(user.wrappedDEK, current.kek);
      const newKekSalt = randomSalt();
      const newAuthSalt = randomSalt();
      const next = await deriveKeys(newPassword, newKekSalt, newAuthSalt, DEFAULT_ITERATIONS);
      const wrapped = await wrapDEK(rawDEK, next.kek);
      await api.post('/auth/change-password', {
        currentAuthKey: current.authKeyHex,
        newAuthKey: next.authKeyHex,
        newKekSalt,
        newAuthSalt,
        newIterations: DEFAULT_ITERATIONS,
        newWrappedDEK: JSON.stringify(wrapped),
      });
      const refreshed = await api.get<{ user: User }>('/auth/me');
      setUser(refreshed.user);
      setDek(await importDEK(rawDEK));
      setStatus('authed');
    },
    [user],
  );

  const unlock = useCallback(async (masterPassword: string) => {
    await unlockWithPassword(masterPassword);
  }, [unlockWithPassword]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setDek(null);
    masterPasswordRef.current = null;
    setStatus('anonymous');
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.get<{ user: User }>('/auth/me');
    setUser(data.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, dek, deviceId, deviceName, unlock, login, loginWithCode, register, changeMasterPassword, logout, refreshUser }),
    [status, user, dek, deviceId, deviceName, unlock, login, loginWithCode, register, changeMasterPassword, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
