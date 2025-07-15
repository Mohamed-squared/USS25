"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Lecture {
  id: string
  title: string
  lecture_date: string
  start_time: string
  end_time: string
}

interface StudentEnrollment {
  user_id: string
  profile: {
    display_name: string
    avatar_url?: string
  }
}

interface AttendanceRecord {
  student_id: string
  status: "present" | "absent"
}

interface AttendanceTrackerProps {
  courseId: string
}

export function AttendanceTracker({ courseId }: AttendanceTrackerProps) {
  const { user, profile } = useAuth()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [selectedLectureId, setSelectedLectureId] = useState<string>("")
  const [enrolledStudents, setEnrolledStudents] = useState<StudentEnrollment[]>([])
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({}) // { student_id: status }
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isOrganizer =
    profile?.role === "main_organizer" ||
    (profile?.id &&
      courseId &&
      lectures.some((lec) =>
        supabase.from("course_organizers").select("*").eq("user_id", profile.id).eq("course_id", courseId),
      )) // Needs to check if profile is organizer for THIS course

  useEffect(() => {
    fetchLecturesAndStudents()
  }, [courseId])

  useEffect(() => {
    if (selectedLectureId) {
      fetchAttendanceForLecture(selectedLectureId)
    } else {
      setAttendance({}) // Clear attendance if no lecture is selected
    }
  }, [selectedLectureId])

  const fetchLecturesAndStudents = async () => {
    setLoading(true)
    try {
      // Fetch lectures for the course
      const { data: lecturesData, error: lecturesError } = await supabase
        .from("schedule")
        .select("id, title, lecture_date, start_time, end_time")
        .eq("course_id", courseId)
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })

      if (lecturesError) throw lecturesError
      setLectures(lecturesData || [])

      // Fetch enrolled students for the course
      const { data: studentsData, error: studentsError } = await supabase
        .from("enrollments")
        .select(`
          user_id,
          profile:profiles(display_name, avatar_url)
        `)
        .eq("course_id", courseId)
        .order("profile.display_name")

      if (studentsError) throw studentsError
      setEnrolledStudents(studentsData || [])
    } catch (error) {
      console.error("Error fetching lectures or students:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceForLecture = async (lectureId: string) => {
    if (!user) return // Only authenticated users can view/manage attendance

    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("lecture_id", lectureId)

      if (error) throw error

      const currentAttendance: Record<string, "present" | "absent"> = {}
      ;(data || []).forEach((record) => {
        currentAttendance[record.student_id] = record.status as "present" | "absent"
      })
      setAttendance(currentAttendance)
    } catch (error) {
      console.error("Error fetching attendance for lecture:", error)
    }
  }

  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: isPresent ? "present" : "absent",
    }))
  }

  const handleSubmitAttendance = async () => {
    if (!selectedLectureId || !user || !isOrganizer) return

    setSubmitting(true)
    try {
      const recordsToInsert = []
      const recordsToUpdate = []

      for (const student of enrolledStudents) {
        const studentId = student.user_id
        const status = attendance[studentId] || "absent" // Default to absent if not explicitly set

        // Check if a record already exists for this student and lecture
        const { data: existingRecord, error: fetchError } = await supabase
          .from("attendance_records")
          .select("id, status")
          .eq("lecture_id", selectedLectureId)
          .eq("student_id", studentId)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 means no rows found
          console.error("Error checking existing attendance record:", fetchError)
          continue
        }

        if (existingRecord) {
          if (existingRecord.status !== status) {
            recordsToUpdate.push({
              id: existingRecord.id,
              status: status,
              organizer_id: user.id,
            })
          }
        } else {
          recordsToInsert.push({
            lecture_id: selectedLectureId,
            student_id: studentId,
            status: status,
            organizer_id: user.id,
          })
        }

        // Handle credits for 'present' status
        if (status === "present") {
          // Check if credit has already been awarded for this attendance record
          const { data: existingCredit, error: creditError } = await supabase
            .from("credit_transactions")
            .select("*")
            .eq("user_id", studentId)
            .eq("reason", `Attendance for lecture: "${lectures.find((l) => l.id === selectedLectureId)?.title}"`)
            .eq("amount", 5) // Fixed credit amount
            .single()

          if (creditError && creditError.code !== "PGRST116") {
            console.error("Error checking existing credit transaction:", creditError)
            continue
          }

          if (!existingCredit) {
            // Only award if not already awarded
            await supabase.from("credit_transactions").insert({
              user_id: studentId,
              amount: 5,
              reason: `Attendance for lecture: "${lectures.find((l) => l.id === selectedLectureId)?.title}"`,
              issuer_id: user.id,
            })
          }
        } else {
          // If status changed to absent, try to remove previously awarded credit (optional, but good for integrity)
          await supabase
            .from("credit_transactions")
            .delete()
            .eq("user_id", studentId)
            .eq("reason", `Attendance for lecture: "${lectures.find((l) => l.id === selectedLectureId)?.title}"`)
            .eq("amount", 5)
        }
      }

      if (recordsToInsert.length > 0) {
        const { error } = await supabase.from("attendance_records").insert(recordsToInsert)
        if (error) throw error
      }
      if (recordsToUpdate.length > 0) {
        for (const record of recordsToUpdate) {
          const { error } = await supabase
            .from("attendance_records")
            .update({ status: record.status, organizer_id: record.organizer_id })
            .eq("id", record.id)
          if (error) throw error
        }
      }

      alert("Attendance updated successfully!")
      await fetchAttendanceForLecture(selectedLectureId) // Re-fetch to confirm state
    } catch (error) {
      console.error("Error submitting attendance:", error)
      alert("Failed to update attendance. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || !isOrganizer) {
    // Restrict access to organizers only
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            You must be an organizer to manage attendance for this course.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Attendance Tracker</h3>
      <Card>
        <CardHeader>
          <CardTitle>Select Lecture</CardTitle>
          <CardDescription>Choose a lecture to mark student attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lecture-select">Lecture</Label>
              <Select onValueChange={setSelectedLectureId} value={selectedLectureId}>
                <SelectTrigger id="lecture-select">
                  <SelectValue placeholder="Select a lecture" />
                </SelectTrigger>
                <SelectContent>
                  {lectures.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No lectures found for this course.</p>
                  ) : (
                    lectures.map((lecture) => (
                      <SelectItem key={lecture.id} value={lecture.id}>
                        {format(new Date(lecture.lecture_date), "MMM d, yyyy")} - {lecture.title} ({lecture.start_time}-
                        {lecture.end_time})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedLectureId && (
              <div className="space-y-4">
                <h4 className="font-semibold text-md">Students in this Course</h4>
                {enrolledStudents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No students enrolled in this course yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {enrolledStudents.map((student) => (
                      <div key={student.user_id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.profile?.avatar_url || ""} />
                            <AvatarFallback>
                              {student.profile?.display_name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{student.profile?.display_name || "Unknown User"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`attendance-switch-${student.user_id}`} className="text-sm">
                            {attendance[student.user_id] === "present" ? "Present" : "Absent"}
                          </Label>
                          <Switch
                            id={`attendance-switch-${student.user_id}`}
                            checked={attendance[student.user_id] === "present"}
                            onCheckedChange={(checked) => handleAttendanceChange(student.user_id, checked)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={handleSubmitAttendance}
                  disabled={submitting || enrolledStudents.length === 0}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Attendance"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
