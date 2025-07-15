"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { PostFeed } from "@/components/dashboard/post-feed"
import { CourseMaterials } from "@/components/course/course-materials"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BookOpen, Users, UserCheck } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
}

interface CoursePageProps {
  params: {
    courseId: string
  }
}

export default function CoursePage({ params }: CoursePageProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [enrollmentCount, setEnrollmentCount] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      fetchCourseData()
    }
  }, [user, authLoading, params.courseId, router])

  const fetchCourseData = async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", params.courseId)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Check enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", params.courseId)
        .single()

      setEnrolled(!!enrollmentData && !enrollmentError)

      // Check if user is organizer
      const isMainOrganizer = profile?.role === "main_organizer"
      const { data: organizerData, error: organizerError } = await supabase
        .from("course_organizers")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", params.courseId)
        .single()

      setIsOrganizer(isMainOrganizer || (!!organizerData && !organizerError))

      // Get enrollment count
      const { count } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", params.courseId)

      setEnrollmentCount(count || 0)
    } catch (error) {
      console.error("Error fetching course data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollToggle = async () => {
    try {
      if (enrolled) {
        const { error } = await supabase
          .from("enrollments")
          .delete()
          .eq("user_id", user!.id)
          .eq("course_id", params.courseId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("enrollments").insert({
          user_id: user!.id,
          course_id: params.courseId,
        })
        if (error) throw error
      }

      await fetchCourseData()
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

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">The course you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/courses")} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <BookOpen className="h-12 w-12 text-blue-600 mt-1" />
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <CardTitle className="text-2xl font-playfair">{course.title}</CardTitle>
                    {enrolled && <Badge variant="secondary">Enrolled</Badge>}
                    {isOrganizer && <Badge variant="default">Organizer</Badge>}
                  </div>
                  <CardDescription className="text-base">{course.description}</CardDescription>
                  <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-1" />
                    {enrollmentCount} student{enrollmentCount !== 1 ? "s" : ""} enrolled
                  </div>
                </div>
              </div>
              <Button onClick={handleEnrollToggle} variant={enrolled ? "secondary" : "default"}>
                {enrolled ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Enrolled
                  </>
                ) : (
                  "Enroll"
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Course Content */}
        <Tabs defaultValue="discussion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="organizer-materials">Organizer Materials</TabsTrigger>
            <TabsTrigger value="student-contributions">Student Contributions</TabsTrigger>
          </TabsList>

          <TabsContent value="discussion">
            <PostFeed courseId={params.courseId} title={`${course.title} Discussion`} />
          </TabsContent>

          <TabsContent value="organizer-materials">
            <div className="space-y-6">
              <CourseMaterials
                courseId={params.courseId}
                materialType="organizer_note"
                canUpload={isOrganizer}
                title="Organizer Notes"
              />
              <CourseMaterials
                courseId={params.courseId}
                materialType="recorded_lecture"
                canUpload={isOrganizer}
                title="Recorded Lectures"
              />
            </div>
          </TabsContent>

          <TabsContent value="student-contributions">
            <CourseMaterials
              courseId={params.courseId}
              materialType="student_contribution"
              canUpload={enrolled}
              title="Student Contributions"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
