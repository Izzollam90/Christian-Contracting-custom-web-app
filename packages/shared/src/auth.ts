import { supabase } from './supabase';

// Sign-in methods per latest owner instruction: Google + email/password only.
// (Apple, Facebook, X, passkey and magic link removed on the product branch.)
export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
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

export const signOut = async (): Promise<void> => {
  await supabase().auth.signOut();
};
