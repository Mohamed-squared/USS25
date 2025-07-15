"use client"

import { createContext, useState, useEffect, useContext, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { type Profile, getCurrentProfile, getCurrentUser } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { usePathname, useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUserData = useCallback(async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        const currentProfile = await getCurrentProfile()
        setProfile(currentProfile)

        // Redirect to onboarding if profile exists but enrollment is missing
        // This is a basic check; a more robust check might involve an 'onboarded' flag
        if (currentProfile && pathname !== "/onboarding") {
          const { data: enrollment, error } = await supabase
            .from("enrollments")
            .select("*", { count: "exact" })
            .eq("user_id", currentUser.id)
            .limit(1)

          if (error) {
            console.error("Error checking enrollment status:", error)
          }

          if (!enrollment || enrollment.length === 0) {
            // Check if the current page is not already onboarding
            if (pathname !== "/onboarding" && !pathname.startsWith("/auth")) {
              router.push("/onboarding")
            }
          }
        }
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error("Failed to fetch user or profile data:", error)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [pathname, router])

  useEffect(() => {
    fetchUserData()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        fetchUserData()
      }
    })

    return () => {
      authListener?.unsubscribe()
    }
  }, [fetchUserData])

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const updatedProfile = await getCurrentProfile()
        setProfile(updatedProfile)
      } catch (error) {
        console.error("Error refreshing profile:", error)
      }
    }
  }, [user])

  const value = { user, profile, loading, refreshProfile }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
