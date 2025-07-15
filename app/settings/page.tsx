"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { updateUserProfile, uploadAvatar } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Save, X } from "lucide-react"

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [editForm, setEditForm] = useState({
    display_name: "",
    bio: "",
  })
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }
    if (profile) {
      setEditForm({
        display_name: profile.display_name,
        bio: profile.bio || "",
      })
    }
  }, [user, profile, authLoading, router])

  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      let newAvatarUrl = profile.avatar_url

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

      await refreshProfile() // Refresh global profile state
      setProfilePictureFile(null) // Clear file input
      if (avatarInputRef.current) avatarInputRef.current.value = ""
      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0])
    }
  }

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const currentAvatarUrl = profilePictureFile ? URL.createObjectURL(profilePictureFile) : profile.avatar_url

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-playfair">Profile Settings</CardTitle>
            <CardDescription>Manage your public profile information and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentAvatarUrl || ""} alt={`${profile.display_name}'s avatar`} />
                  <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
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
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm group-hover:flex items-center justify-center hidden"
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
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{profile.display_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="grid gap-4">
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
                  rows={4}
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
