"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { updateUserProfile, uploadAvatar } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Trophy, Calendar, Edit, Save, X, Camera } from "lucide-react"
import { format } from "date-fns"

interface Profile {
  id: string
  display_name: string
  bio?: string
  avatar_url?: string
  role: "student" | "main_organizer"
  total_credits: number
  created_at: string
}

interface CreditTransaction {
  id: string
  amount: number
  reason: string
  created_at: string
  issuer?: {
    display_name: string
  }
}

interface ProfilePageProps {
  params: {
    userId: string
  }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { user, profile: currentAuthProfile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: "",
    bio: "",
  })
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const isOwnProfile = user?.id === params.userId

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      fetchProfileData()
    }
  }, [user, authLoading, params.userId, router])

  const fetchProfileData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setEditForm({
        display_name: profileData.display_name,
        bio: profileData.bio || "",
      })

      // Fetch credit history (only for own profile)
      if (isOwnProfile) {
        const { data: creditData, error: creditError } = await supabase
          .from("credit_transactions")
          .select(`
            id,
            amount,
            reason,
            created_at,
            issuer:profiles(display_name)
          `)
          .eq("user_id", params.userId)
          .order("created_at", { ascending: false })

        if (creditError) throw creditError
        setCreditHistory(creditData || [])
      }
    } catch (error) {
      console.error("Error fetching profile data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!isOwnProfile || !user) return

    setSaving(true)
    try {
      let newAvatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (profilePictureFile) {
        newAvatarUrl = await uploadAvatar(user.id, profilePictureFile)
      }

      // Update profile in database
      await updateUserProfile(user.id, {
        display_name: editForm.display_name,
        bio: editForm.bio || null,
        avatar_url: newAvatarUrl,
      })

      await fetchProfileData()
      await refreshProfile() // Refresh the AuthProvider's profile state
      setEditing(false)
      setProfilePictureFile(null) // Clear the selected file
      if (avatarInputRef.current) avatarInputRef.current.value = "" // Clear file input value
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
    })
    setProfilePictureFile(null) // Clear selected file on cancel
    if (avatarInputRef.current) avatarInputRef.current.value = "" // Clear file input value
    setEditing(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0])
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const displayAvatarUrl = profilePictureFile ? URL.createObjectURL(profilePictureFile) : profile.avatar_url || ""

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={displayAvatarUrl || "/placeholder.svg"}
                      alt={`${profile.display_name}'s avatar`}
                    />
                    <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isOwnProfile && editing && (
                    <>
                      <input
                        type="file"
                        ref={avatarInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => avatarInputRef.current?.click()}
                        title="Change profile picture"
                      >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Change profile picture</span>
                      </Button>
                      {profilePictureFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
                          onClick={() => {
                            setProfilePictureFile(null)
                            if (avatarInputRef.current) avatarInputRef.current.value = ""
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex-1">
                  {editing && isOwnProfile ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-playfair">
                          {profile.display_name}
                        </h1>
                        {profile.role === "main_organizer" && <Badge variant="default">Main Organizer</Badge>}
                      </div>
                      {profile.bio && <p className="text-gray-600 dark:text-gray-300 mb-4">{profile.bio}</p>}
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 mr-1 text-yellow-600" />
                          {profile.total_credits} credits
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Joined {format(new Date(profile.created_at), "MMMM yyyy")}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <div className="flex space-x-2">
                  {editing ? (
                    <>
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Profile Content */}
        {isOwnProfile && (
          <Tabs defaultValue="credit-history" className="space-y-6">
            <TabsList>
              <TabsTrigger value="credit-history">Credit History</TabsTrigger>
            </TabsList>

            <TabsContent value="credit-history">
              <Card>
                <CardHeader>
                  <CardTitle>Credit History</CardTitle>
                  <CardDescription>A complete log of all your credit transactions for transparency</CardDescription>
                </CardHeader>
                <CardContent>
                  {creditHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No credit transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {creditHistory.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{transaction.reason}</p>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                              <span>{format(new Date(transaction.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                              {transaction.issuer && <span>By {transaction.issuer.display_name}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-semibold ${
                                transaction.amount > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount} credits
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
