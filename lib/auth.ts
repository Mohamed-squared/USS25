import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

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

export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error("Error fetching current user:", error)
    return null
  }
  return user
}

export const getCurrentProfile = async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    console.error("Error fetching current profile:", error)
    return null
  }
  return profile
}

export const signUp = async (email: string, password: string, displayName: string) => {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        avatar_url: avatarUrl,
      },
    },
  })
  return { data, error }
}

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

export const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single()

  if (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
  return data
}

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExtension = file.name.split(".").pop()
  const fileName = `${userId}.${fileExtension}`
  const filePath = `${userId}/${fileName}` // Use user ID as subfolder for organization

  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
    upsert: true, // Overwrite if exists
  })

  if (uploadError) {
    console.error("Error uploading avatar:", uploadError)
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

  return publicUrlData.publicUrl
}
