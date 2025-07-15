"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Settings, Save, Upload } from "lucide-react"

export default function SettingsPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
      })
    }
  }, [user, profile, authLoading, router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user!.id}.${fileExt}`

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([`${user!.id}/${fileName}`])

      // Upload new avatar
      const { data, error } = await supabase.storage.from("avatars").upload(`${user!.id}/${fileName}`, file, {
        upsert: true,
      })

      if (error) throw error

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(`${user!.id}/${fileName}`)

      return urlData.publicUrl
    } catch (error) {
      console.error("Error uploading avatar:", error)
      return null
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      let avatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (selectedFile) {
        setUploading(true)
        const newAvatarUrl = await uploadAvatar(selectedFile)
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl
        }
        setUploading(false)
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      await refreshProfile()
      setSelectedFile(null)
      setPreviewUrl(null)

      // Show success message or redirect
      router.push(`/profile/${user.id}`)
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
      setUploading(false)
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair flex items-center">
            <Settings className="h-8 w-8 mr-3" />
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a new profile picture. This will be visible to other users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewUrl || profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {profile?.display_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" asChild className="cursor-pointer bg-transparent">
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose New Picture
                      </span>
                    </Button>
                  </label>
                  {selectedFile && <p className="text-sm text-gray-500 mt-2">Selected: {selectedFile.name}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and bio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and role information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={profile?.role === "main_organizer" ? "Main Organizer" : "Student"} disabled />
              </div>
              <div>
                <Label>Total Credits</Label>
                <Input value={profile?.total_credits || 0} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || uploading} size="lg">
              {saving || uploading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {uploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
