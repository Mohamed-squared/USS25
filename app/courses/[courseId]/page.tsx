"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { PostFeed } from "@/components/dashboard/post-feed"
import { CourseMaterials } from "@/components/course/course-materials"
import { HomeworkSection } from "@/components/course/homework-section"
import { AttendanceTracker } from "@/components/attendance/attendance-tracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { BookOpen, Users, UserCheck, Award } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Course {
  id: string
  title: string
  description: string
}

interface EnrolledStudent {
  user_id: string
  profile: {
    display_name: string
  } | null
}

interface CoursePageProps {
  params: {
    courseId: string
  }
}

export default function CoursePage({ params }: CoursePageProps) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [isOrganizerForCourse, setIsOrganizerForCourse] = useState(false)
  const [enrollmentCount, setEnrollmentCount] = useState(0)

  // State for Bonus Credits Dialog
  const [bonusCreditDialogOpen, setBonusCreditDialogOpen] = useState(false)
  const [bonusCreditStudentId, setBonusCreditStudentId] = useState("")
  const [bonusCreditAmount, setBonusCreditAmount] = useState(0)
  const [bonusCreditReason, setBonusCreditReason] = useState("")
  const [submittingBonus, setSubmittingBonus] = useState(false)
  const [enrolledStudentsList, setEnrolledStudentsList] = useState<EnrolledStudent[]>([])

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

      // Check if user is organizer for THIS course or main organizer
      const isMainOrganizer = profile?.role === "main_organizer"
      const { data: organizerData, error: organizerError } = await supabase
        .from("course_organizers")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", params.courseId)
        .single()

      setIsOrganizerForCourse(isMainOrganizer || (!!organizerData && !organizerError))

      // Get enrollment count
      const { count } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", params.courseId)

      setEnrollmentCount(count || 0)

      // Fetch enrolled students for bonus credit dropdown (only if organizer)
      if (isMainOrganizer || (!!organizerData && !organizerError)) {
        const { data: students, error: studentsError } = await supabase
          .from("enrollments")
          .select(`user_id, profile:profiles(display_name)`)
          .eq("course_id", params.courseId)

        if (studentsError) console.error("Error fetching enrolled students:", studentsError)
        setEnrolledStudentsList(students || [])
      }
    } catch (error) {
      console.error("Error fetching course data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollToggle = async () => {
    if (!user) {
      router.push("/auth/signin") // Redirect to sign-in if not logged in
      return
    }
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

  const handleAwardBonusCredits = async () => {
    if (
      !bonusCreditStudentId ||
      bonusCreditAmount <= 0 ||
      !bonusCreditReason.trim() ||
      !user ||
      !isOrganizerForCourse
    ) {
      alert("Please fill all bonus credit fields correctly.")
      return
    }

    setSubmittingBonus(true)
    try {
      const { error } = await supabase.from("credit_transactions").insert({
        user_id: bonusCreditStudentId,
        amount: bonusCreditAmount,
        reason: bonusCreditReason.trim(),
        issuer_id: user.id,
      })

      if (error) throw error

      alert(`Successfully awarded ${bonusCreditAmount} credits to the student!`)
      setBonusCreditDialogOpen(false)
      setBonusCreditStudentId("")
      setBonusCreditAmount(0)
      setBonusCreditReason("")
      await refreshProfile() // Refresh current user's profile to see credit change if applicable
      await fetchCourseData() // Re-fetch course data to potentially update enrollment count or other states
    } catch (error) {
      console.error("Error awarding bonus credits:", error)
      alert("Failed to award bonus credits. Please try again.")
    } finally {
      setSubmittingBonus(false)
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
                    {isOrganizerForCourse && <Badge variant="default">Organizer</Badge>}
                  </div>
                  <CardDescription className="text-base">{course.description}</CardDescription>
                  <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-1" />
                    {enrollmentCount} student{enrollmentCount !== 1 ? "s" : ""} enrolled
                  </div>
                </div>
              </div>
              {user ? (
                <div className="flex flex-col items-end space-y-2">
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
                  {isOrganizerForCourse && (
                    <Dialog open={bonusCreditDialogOpen} onOpenChange={setBonusCreditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full bg-transparent">
                          <Award className="h-4 w-4 mr-2" /> Award Bonus Credits
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Award Bonus Credits</DialogTitle>
                          <DialogDescription>Grant additional credits to a student in this course.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="student-select">Student</Label>
                            <Select onValueChange={setBonusCreditStudentId} value={bonusCreditStudentId}>
                              <SelectTrigger id="student-select">
                                <SelectValue placeholder="Select a student" />
                              </SelectTrigger>
                              <SelectContent>
                                {enrolledStudentsList.map((student) => (
                                  <SelectItem key={student.user_id} value={student.user_id}>
                                    {student.profile?.display_name || student.user_id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="amount">Amount (Credits)</Label>
                            <Input
                              id="amount"
                              type="number"
                              min="1"
                              value={bonusCreditAmount}
                              onChange={(e) => setBonusCreditAmount(Number.parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea
                              id="reason"
                              placeholder="e.g., Exceptional participation, Helpful peer, etc."
                              value={bonusCreditReason}
                              onChange={(e) => setBonusCreditReason(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleAwardBonusCredits} disabled={submittingBonus}>
                            {submittingBonus ? (
                              <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                Awarding...
                              </>
                            ) : (
                              "Award Credits"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ) : (
                <Button onClick={() => router.push("/auth/signin")}>Sign In to Enroll</Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Course Content */}
        <Tabs defaultValue="discussion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            {" "}
            {/* Increased grid columns for new tabs */}
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
            <TabsTrigger value="organizer-materials">Organizer Materials</TabsTrigger>
            <TabsTrigger value="student-contributions">Student Contributions</TabsTrigger>
            {isOrganizerForCourse && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          </TabsList>

          <TabsContent value="discussion">
            <PostFeed courseId={params.courseId} title={`${course.title} Discussion`} />
          </TabsContent>

          <TabsContent value="homework">
            <HomeworkSection courseId={params.courseId} isOrganizer={isOrganizerForCourse} />
          </TabsContent>

          <TabsContent value="organizer-materials">
            <div className="space-y-6">
              <CourseMaterials
                courseId={params.courseId}
                materialType="organizer_note"
                canUpload={isOrganizerForCourse}
                title="Organizer Notes"
                isOrganizerForCourse={isOrganizerForCourse}
              />
              <CourseMaterials
                courseId={params.courseId}
                materialType="recorded_lecture"
                canUpload={isOrganizerForCourse}
                title="Recorded Lectures"
                isOrganizerForCourse={isOrganizerForCourse}
              />
            </div>
          </TabsContent>

          <TabsContent value="student-contributions">
            <CourseMaterials
              courseId={params.courseId}
              materialType="student_contribution"
              canUpload={enrolled}
              title="Student Contributions"
              isOrganizerForCourse={isOrganizerForCourse}
            />
          </TabsContent>

          {isOrganizerForCourse && (
            <TabsContent value="attendance">
              <AttendanceTracker courseId={params.courseId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
