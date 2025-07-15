"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Trophy, Medal, Award } from "lucide-react"

interface LeaderboardEntry {
  id: string
  display_name: string
  avatar_url?: string
  total_credits: number
  role: "student" | "main_organizer"
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      fetchLeaderboard()
    }
  }, [user, authLoading, router])

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_credits, role")
        .order("total_credits", { ascending: false })
        .limit(50)

      if (error) throw error
      setLeaderboard(data || [])
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case 2:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case 3:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Top contributors to the USS25 community ranked by credits earned
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No contributors yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1
                  const isCurrentUser = entry.id === user?.id

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                        isCurrentUser
                          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-center w-12">{getRankIcon(rank)}</div>

                      <Link
                        href={`/profile/${entry.id}`}
                        className="flex items-center space-x-3 flex-1 hover:opacity-80"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={entry.avatar_url || ""} />
                          <AvatarFallback>{entry.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {entry.display_name}
                              {isCurrentUser && <span className="text-blue-600 dark:text-blue-400"> (You)</span>}
                            </h3>
                            {entry.role === "main_organizer" && (
                              <Badge variant="default" className="text-xs">
                                Organizer
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getRankBadgeColor(rank)}>Rank #{rank}</Badge>
                          </div>
                        </div>
                      </Link>

                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span className="font-bold text-lg text-gray-900 dark:text-white">{entry.total_credits}</span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">credits</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
