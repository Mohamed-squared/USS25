"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { PostFeed } from "@/components/dashboard/post-feed"
import { ScheduleWidget } from "@/components/dashboard/schedule-widget"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">
            Welcome back, {profile?.display_name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Stay connected with your mathematical community</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <PostFeed />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ScheduleWidget />
          </div>
        </div>
      </div>
    </div>
  )
}
