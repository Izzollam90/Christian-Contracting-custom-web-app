import { supabase } from './supabase';

// All sign-in methods supported by Supabase Auth. Providers (Google, Apple, Facebook, X)
// must be enabled in the Supabase dashboard with their client IDs/secrets.
export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'twitter';

export const signInWithOAuth = async (provider: OAuthProvider): Promise<void> => {
  const { error } = await supabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
};

export const signInWithMagicLink = async (email: string): Promise<void> => {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
};

export const signInWithPassword = async (email: string, password: string) => {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signUpWithPassword = async (email: string, password: string, fullName: string) => {
  const { error } = await supabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
};

// Passkeys (WebAuthn): "sign in with a key" — Face ID, Touch ID, or a security key.
export const signInWithPasskey = async () => {
  const { error } = await supabase().auth.signInWithPasskey();
  if (error) throw error;
};

// Register a passkey for the currently signed-in account (e.g. right after first sign-in).
export const registerPasskey = async () => {
  const { error } = await supabase().auth.registerPasskey();
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  await supabase().auth.signOut();
};
