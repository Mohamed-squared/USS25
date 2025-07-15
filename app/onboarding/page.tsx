"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BookOpen } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
}

export default function OnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    fetchCourses()
  }, [user, router])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from("courses").select("*").order("title")

      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      setError("Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses((prev) => (prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]))
  }

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      setError("Please select at least one course")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const enrollments = selectedCourses.map((courseId) => ({
        user_id: user!.id,
        course_id: courseId,
      }))

      const { error } = await supabase.from("enrollments").insert(enrollments)

      if (error) throw error

      router.push("/dashboard")
    } catch (err) {
      setError("Failed to enroll in courses")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">
            Welcome to USS25, {profile?.display_name}!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
            Select the courses you'd like to attend this summer
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course Selection</CardTitle>
            <CardDescription>
              Choose the mathematical disciplines you're most interested in. You can always modify your enrollment
              later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Checkbox
                    id={course.id}
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={() => handleCourseToggle(course.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor={course.id} className="cursor-pointer">
                      <h3 className="font-semibold text-gray-900 dark:text-white font-playfair">{course.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{course.description}</p>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Selected: {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""}
              </p>
              <Button onClick={handleSubmit} disabled={submitting || selectedCourses.length === 0}>
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Enrolling...
                  </>
                ) : (
                  "Continue to Dashboard"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
