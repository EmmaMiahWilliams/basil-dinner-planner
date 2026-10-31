// Optional pilot backend (Supabase): secure email-code sign-in and automatic upload of pilot exports.
// It switches on only when EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set at build
// time. Without them Basil runs in local mode: no sign-in, and feedback is sent as a file instead.
// The anon key is designed to be public; row-level security (supabase/pilot.sql) is what protects data.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { PilotExport } from './signals';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const backend: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // Web uses the browser's localStorage; native keeps the session in AsyncStorage.
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

type Auth = { enabled: boolean; ready: boolean; session: Session | null; email: string | null };
const AuthContext = createContext<Auth>({ enabled: false, ready: true, session: null, email: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!backend);

  useEffect(() => {
    if (!backend) return;
    backend.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = backend.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ enabled: !!backend, ready, session, email: session?.user.email ?? null }}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}

/**
 * Step 1 of sign-in: email a 6-digit code. Only people the PM has invited can sign in
 * (shouldCreateUser: false), which keeps the pilot to its 10 participants.
 */
export async function sendCode(email: string): Promise<string | null> {
  if (!backend) return 'Sign-in is not set up for this build.';
  const { error } = await backend.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
  if (!error) return null;
  return /signups not allowed|not found|otp_disabled/i.test(error.message)
    ? 'That email isn’t on the pilot list. Check with the pilot team.'
    : 'Couldn’t send the code. Check your connection and try again.';
}

/** Step 2 of sign-in: check the code from the email. */
export async function verifyCode(email: string, code: string): Promise<string | null> {
  if (!backend) return 'Sign-in is not set up for this build.';
  const { error } = await backend.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  return error ? 'That code didn’t work. Check it, or ask for a new one.' : null;
}

export async function signOut(): Promise<void> {
  await backend?.auth.signOut();
}

/**
 * Saves the participant's latest export as their one row in pilot_exports (each export is cumulative).
 * Returns false if it couldn't, so the caller can fall back to sending a file.
 */
export async function uploadExport(data: PilotExport): Promise<boolean> {
  if (!backend) return false;
  const { data: s } = await backend.auth.getSession();
  if (!s.session) return false;
  const { error } = await backend
    .from('pilot_exports')
    .upsert({ user_id: s.session.user.id, participant_id: data.participantId, export: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}

/** Leaving the pilot: delete this participant's uploaded record. */
export async function deleteMyExport(): Promise<void> {
  if (!backend) return;
  const { data: s } = await backend.auth.getSession();
  if (s.session) await backend.from('pilot_exports').delete().eq('user_id', s.session.user.id);
}
