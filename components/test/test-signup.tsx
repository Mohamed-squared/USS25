"use client"

import { useState } from "react"
import { signUp, signIn, signOut } from "@/lib/auth"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function TestSignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const { user, profile, refreshProfile } = useAuth()

  const handleSignUp = async () => {
    setLoading(true)
    setMessage("")
    const { data, error } = await signUp(email, password, displayName)
    if (error) {
      setMessage(`Sign up error: ${error.message}`)
    } else if (data.user) {
      setMessage(`Sign up successful! User: ${data.user.email}. Redirecting to onboarding...`)
      // AuthProvider should handle redirect to onboarding automatically
      await refreshProfile() // Ensure profile is fetched after signup
    } else {
      setMessage("Sign up successful, but no user data returned.")
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage("")
    const { data, error } = await signIn(email, password)
    if (error) {
      setMessage(`Sign in error: ${error.message}`)
    } else if (data.user) {
      setMessage(`Sign in successful! User: ${data.user.email}`)
      await refreshProfile() // Ensure profile is fetched after signin
    } else {
      setMessage("Sign in successful, but no user data returned.")
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    setLoading(true)
    setMessage("")
    const { error } = await signOut()
    if (error) {
      setMessage(`Sign out error: ${error.message}`)
    } else {
      setMessage("Signed out successfully!")
      await refreshProfile() // Clear profile after signout
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-playfair">Test User Authentication</CardTitle>
          <CardDescription className="text-center">
            Use this form to quickly test sign up, sign in, and sign out flows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="display-name">Display Name (for Sign Up)</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleSignUp} disabled={loading || !email || !password || !displayName} className="flex-1">
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              Sign Up
            </Button>
            <Button
              onClick={handleSignIn}
              disabled={loading || !email || !password}
              className="flex-1 bg-transparent"
              variant="outline"
            >
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              Sign In
            </Button>
          </div>
          {user && (
            <Button onClick={handleSignOut} disabled={loading} className="w-full" variant="destructive">
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              Sign Out
            </Button>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${message.includes("error") ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200" : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"}`}
            >
              {message}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
            <h3 className="font-semibold mb-2">Current User Status:</h3>
            <p>User ID: {user?.id || "N/A"}</p>
            <p>User Email: {user?.email || "N/A"}</p>
            <p>Profile Display Name: {profile?.display_name || "N/A"}</p>
            <p>Profile Role: {profile?.role || "N/A"}</p>
            <p>Total Credits: {profile?.total_credits !== undefined ? profile.total_credits : "N/A"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
