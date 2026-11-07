import { supabase } from './supabase';

// Sign-in is Google + passkey only (Phase 7, Nov 6 owner change).
// Apple, Facebook, X, password and magic-link were removed.
export const signInWithOAuth = async (): Promise<void> => {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
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

// ============ MFA (TOTP via Supabase Auth MFA) ============

export const enrollMfaFactor = async (friendlyName: string) => {
  const { data, error } = await supabase().auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
  if (error) throw error;
  return data;
};

export const createMfaChallenge = async (factorId: string) => {
  const { data, error } = await supabase().auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
};

export const verifyMfaChallenge = async (factorId: string, challengeId: string, code: string) => {
  const { data, error } = await supabase().auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return data;
};

export const unenrollMfaFactor = async (factorId: string) => {
  const { error } = await supabase().auth.mfa.unenroll({ factorId });
  if (error) throw error;
};

export const listMfaFactors = async () => {
  const { data, error } = await supabase().auth.mfa.listFactors();
  if (error) throw error;
  return data;
};

// Returns true if the current session is aal2 (second factor verified).
export const isAal2 = async (): Promise<boolean> => {
  const { data, error } = await supabase().auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal2';
};
