import { supabase } from "./supabase"

export interface Profile {
  id: string
  display_name: string
  bio?: string
  avatar_url?: string
  role: "student" | "main_organizer"
  total_credits: number
  created_at: string
  updated_at: string
}

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export const getCurrentProfile = async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return profile
}

export const signUp = async (email: string, password: string, displayName: string) => {
  // --- START: Added for debugging environment variables ---
  console.log("Attempting to sign up user...");
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Supabase Anon Key Exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const errorMessage = "Supabase URL or Anon Key is missing. Please check your .env.local file and restart the server.";
    console.error(errorMessage);
    return {
      data: { user: null, session: null },
      error: { name: "AuthApiError", message: errorMessage } as const
    };
  }
  // --- END: Added for debugging environment variables ---

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}
