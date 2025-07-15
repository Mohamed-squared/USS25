"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, UserCheck, UserX } from "lucide-react"
import { format } from "date-fns"

interface Lecture {
  id: string
  lecture_date: string
  start_time: string
  end_time: string
  title: string
  description?: string
}

interface Student {
  id: string
  display_name: string
  avatar_url?: string
}

interface AttendanceRecord {
  id: string
  student_id: string
  status: "present" | "absent"
}

interface AttendanceTabProps {
  courseId: string
}

export function AttendanceTab({ courseId }: AttendanceTabProps) {
  const { user } = useAuth()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedLecture, setSelectedLecture] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLectures()
    fetchStudents()
  }, [courseId])

  useEffect(() => {
    if (selectedLecture) {
      fetchAttendanceRecords()
    }
  }, [selectedLecture])

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from("schedule")
        .select("*")
        .eq("course_id", courseId)
        .order("lecture_date", { ascending: false })

      if (error) throw error
      setLectures(data || [])
    } catch (error) {
      console.error("Error fetching lectures:", error)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          user_id,
          profiles:user_id(id, display_name, avatar_url)
        `)
        .eq("course_id", courseId)

      if (error) throw error

      const studentsData =
        data?.map((enrollment) => ({
          id: enrollment.profiles.id,
          display_name: enrollment.profiles.display_name,
          avatar_url: enrollment.profiles.avatar_url,
        })) || []

      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase.from("attendance_records").select("*").eq("lecture_id", selectedLecture)

      if (error) throw error
      setAttendanceRecords(data || [])
    } catch (error) {
      console.error("Error fetching attendance records:", error)
    }
  }

  const handleAttendanceChange = async (studentId: string, isPresent: boolean) => {
    setSaving(true)
    try {
      const status = isPresent ? "present" : "absent"

      const { error } = await supabase.from("attendance_records").upsert(
        {
          lecture_id: selectedLecture,
          student_id: studentId,
          status,
          organizer_id: user!.id,
        },
        {
          onConflict: "lecture_id,student_id",
        },
      )

      if (error) throw error

      await fetchAttendanceRecords()
    } catch (error) {
      console.error("Error updating attendance:", error)
    } finally {
      setSaving(false)
    }
  }

  const getAttendanceStatus = (studentId: string): "present" | "absent" | null => {
    const record = attendanceRecords.find((r) => r.student_id === studentId)
    return record ? record.status : null
  }

  const getAttendanceStats = () => {
    const present = attendanceRecords.filter((r) => r.status === "present").length
    const absent = attendanceRecords.filter((r) => r.status === "absent").length
    const total = students.length
    const notMarked = total - present - absent

    return { present, absent, notMarked, total }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const stats = selectedLecture ? getAttendanceStats() : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attendance Tracker</h3>
        <Badge variant="secondary">
          <Users className="h-4 w-4 mr-1" />
          {students.length} Students Enrolled
        </Badge>
      </div>

      {lectures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No lectures scheduled yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Lecture</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedLecture} onValueChange={setSelectedLecture}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lecture to take attendance" />
                </SelectTrigger>
                <SelectContent>
                  {lectures.map((lecture) => (
                    <SelectItem key={lecture.id} value={lecture.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{lecture.title}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(lecture.lecture_date), "MMM d, yyyy")} • {lecture.start_time} -{" "}
                          {lecture.end_time}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedLecture && (
            <>
              {/* Attendance Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{stats?.present || 0}</p>
                        <p className="text-sm text-gray-500">Present</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <UserX className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">{stats?.absent || 0}</p>
                        <p className="text-sm text-gray-500">Absent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-600">{stats?.notMarked || 0}</p>
                        <p className="text-sm text-gray-500">Not Marked</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{stats?.total || 0}</p>
                        <p className="text-sm text-gray-500">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Student Attendance List */}
              <Card>
                <CardHeader>
                  <CardTitle>Mark Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students.map((student) => {
                      const status = getAttendanceStatus(student.id)
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {student.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{student.display_name}</p>
                              {status && (
                                <Badge variant={status === "present" ? "default" : "destructive"} className="text-xs">
                                  {status === "present" ? "Present" : "Absent"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label htmlFor={`present-${student.id}`} className="text-sm font-medium">
                                Present
                              </label>
                              <Switch
                                id={`present-${student.id}`}
                                checked={status === "present"}
                                onCheckedChange={(checked) => handleAttendanceChange(student.id, checked)}
                                disabled={saving}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
