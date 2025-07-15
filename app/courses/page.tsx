"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BookOpen, Users, MessageCircle } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  enrolled: boolean
  enrollment_count: number
  post_count: number
}

export default function CoursesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      fetchCourses()
    }
  }, [user, authLoading, router])

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase.from("courses").select("*").order("title")

      if (coursesError) throw coursesError

      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id)

      if (enrollmentsError) throw enrollmentsError

      const enrolledCourseIds = new Set(enrollmentsData.map((e) => e.course_id))

      // Get enrollment counts and post counts for each course
      const coursesWithStats = await Promise.all(
        (coursesData || []).map(async (course) => {
          const [{ count: enrollmentCount }, { count: postCount }] = await Promise.all([
            supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", course.id),
            supabase.from("posts").select("*", { count: "exact", head: true }).eq("course_id", course.id),
          ])

          return {
            ...course,
            enrolled: enrolledCourseIds.has(course.id),
            enrollment_count: enrollmentCount || 0,
            post_count: postCount || 0,
          }
        }),
      )

      setCourses(coursesWithStats)
    } catch (error) {
      console.error("Error fetching courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollToggle = async (courseId: string, enrolled: boolean) => {
    try {
      if (enrolled) {
        const { error } = await supabase.from("enrollments").delete().eq("user_id", user!.id).eq("course_id", courseId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("enrollments").insert({
          user_id: user!.id,
          course_id: courseId,
        })
        if (error) throw error
      }

      await fetchCourses()
    } catch (error) {
      console.error("Error toggling enrollment:", error)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Courses</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Explore and join mathematical courses offered in USS25
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
                  {course.enrolled && <Badge variant="secondary">Enrolled</Badge>}
                </div>
                <CardTitle className="font-playfair">{course.title}</CardTitle>
                <CardDescription className="flex-1">{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {course.enrollment_count} enrolled
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {course.post_count} posts
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link href={`/courses/${course.id}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      View Course
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleEnrollToggle(course.id, course.enrolled)}
                    variant={course.enrolled ? "secondary" : "default"}
                  >
                    {course.enrolled ? "Unenroll" : "Enroll"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
