"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Shield } from "lucide-react"

export default function PromotePage() {
  const { user, refreshProfile } = useAuth()
  const [secretKey, setSecretKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handlePromote = async () => {
    if (!user || !secretKey.trim()) {
      setError("Please enter the secret key")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/promote-to-main", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secretKey: secretKey.trim(),
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Successfully promoted to Main Organizer! Please refresh the page.")
        await refreshProfile()
        setSecretKey("")
      } else {
        setError(data.error || "Failed to promote user")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 dark:text-gray-300">Please sign in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-2xl font-playfair">Promote to Main Organizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert>
              <AlertDescription className="text-green-800 dark:text-green-200">{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <Input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter the secret promotion key"
            />
          </div>

          <Button onClick={handlePromote} disabled={loading || !secretKey.trim()} className="w-full">
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Promoting...
              </>
            ) : (
              "Promote to Main Organizer"
            )}
          </Button>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            This action requires a special secret key provided by the system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
