import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { getDb } from '../db/database';
import * as repo from '../db/repo';
import type { User } from '../db/repo';
import { bytesToHex } from '@noble/hashes/utils.js';
import { LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS, hashPassword, lockoutRemaining, verifyPassword } from '../lib/security';
import { normaliseUsername, validatePassword, validateUsername } from '../lib/validation';
import { removePhoto } from '../lib/photos';

const SESSION_KEY = 'trailnotes.session';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Each returns an error message, or null on success. */
  register(username: string, password: string): Promise<string | null>;
  login(username: string, password: string): Promise<string | null>;
  logout(): Promise<void>;
  deleteAccount(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const GENERIC_LOGIN_ERROR = 'Incorrect username or password.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session. The session token lives in the OS keystore (SecureStore), not in the DB.
  useEffect(() => {
    (async () => {
      try {
        const id = await SecureStore.getItemAsync(SESSION_KEY);
        if (id) {
          const db = await getDb();
          setUser(await repo.getUserById(db, Number(id)));
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startSession = useCallback(async (u: User) => {
    await SecureStore.setItemAsync(SESSION_KEY, String(u.id));
    setUser(u);
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      const uErr = validateUsername(username);
      if (uErr) return uErr;
      const pErr = validatePassword(password, username);
      if (pErr) return pErr;
      try {
        const db = await getDb();
        const name = normaliseUsername(username);
        if (await repo.getCredentials(db, name)) return 'That username is already taken.';
        const salt = bytesToHex(Crypto.getRandomBytes(16));
        const user = await repo.createUser(db, name, username.trim(), salt, hashPassword(password, salt));
        await startSession(user);
        return null;
      } catch {
        return 'Could not create the account. Please try again.';
      }
    },
    [startSession],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      if (!username.trim() || !password) return 'Enter your username and password.';
      try {
        const db = await getDb();
        const creds = await repo.getCredentials(db, normaliseUsername(username));
        if (!creds) return GENERIC_LOGIN_ERROR; // same message: do not reveal which usernames exist
        const wait = lockoutRemaining(creds.lockedUntil);
        if (wait > 0) return `Too many attempts. Try again in ${wait} seconds.`;
        if (!verifyPassword(password, creds.salt, creds.passwordHash)) {
          const reached = creds.failedAttempts + 1 >= MAX_FAILED_ATTEMPTS;
          await repo.recordFailedAttempt(
            db,
            creds.user.id,
            reached ? Date.now() + LOCKOUT_SECONDS * 1000 : null,
            reached,
          );
          return reached
            ? `Too many attempts. Account locked for ${LOCKOUT_SECONDS} seconds.`
            : GENERIC_LOGIN_ERROR;
        }
        await repo.clearFailedAttempts(db, creds.user.id);
        await startSession(creds.user);
        return null;
      } catch {
        return 'Could not sign in. Please try again.';
      }
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    const db = await getDb();
    const photos = await repo.deleteUser(db, user.id);
    photos.forEach(removePhoto);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setUser(null);
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, register, login, logout, deleteAccount }),
    [user, loading, register, login, logout, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
