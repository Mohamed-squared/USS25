"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Calendar, Plus, Edit, Trash2, UserPlus } from "lucide-react"

interface User {
  id: string
  display_name: string
  avatar_url?: string
  role: "student" | "main_organizer"
  total_credits: number
  email?: string
}

interface Course {
  id: string
  title: string
}

interface ScheduleItem {
  id: string
  lecture_date: string
  start_time: string
  end_time: string
  title: string
  description?: string
  course_id?: string
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [organizerDialogOpen, setOrganizerDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null)

  const [scheduleForm, setScheduleForm] = useState({
    lecture_date: "",
    start_time: "",
    end_time: "",
    title: "",
    description: "",
    course_id: "",
  })

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "main_organizer")) {
      router.push("/dashboard")
      return
    }

    if (user && profile?.role === "main_organizer") {
      fetchData()
    }
  }, [user, profile, authLoading, router])

  const fetchData = async () => {
    try {
      const [usersResult, coursesResult, scheduleResult] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, role, total_credits").order("display_name"),
        supabase.from("courses").select("id, title").order("title"),
        supabase.from("schedule").select("*").order("lecture_date").order("start_time"),
      ])

      if (usersResult.error) throw usersResult.error
      if (coursesResult.error) throw coursesResult.error
      if (scheduleResult.error) throw scheduleResult.error

      setUsers(usersResult.data || [])
      setCourses(coursesResult.data || [])
      setSchedule(scheduleResult.data || [])
    } catch (error) {
      console.error("Error fetching admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignOrganizer = async (userId: string, courseId: string) => {
    try {
      const { error } = await supabase.from("course_organizers").insert({
        user_id: userId,
        course_id: courseId,
      })

      if (error) throw error
      setOrganizerDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error assigning organizer:", error)
    }
  }

  const handleScheduleSubmit = async () => {
    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from("schedule")
          .update({
            lecture_date: scheduleForm.lecture_date,
            start_time: scheduleForm.start_time,
            end_time: scheduleForm.end_time,
            title: scheduleForm.title,
            description: scheduleForm.description || null,
            course_id: scheduleForm.course_id || null,
          })
          .eq("id", editingSchedule.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("schedule").insert({
          lecture_date: scheduleForm.lecture_date,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          title: scheduleForm.title,
          description: scheduleForm.description || null,
          course_id: scheduleForm.course_id || null,
        })

        if (error) throw error
      }

      setScheduleDialogOpen(false)
      setEditingSchedule(null)
      setScheduleForm({
        lecture_date: "",
        start_time: "",
        end_time: "",
        title: "",
        description: "",
        course_id: "",
      })
      await fetchData()
    } catch (error) {
      console.error("Error saving schedule:", error)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from("schedule").delete().eq("id", id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error deleting schedule:", error)
    }
  }

  const openEditSchedule = (item: ScheduleItem) => {
    setEditingSchedule(item)
    setScheduleForm({
      lecture_date: item.lecture_date,
      start_time: item.start_time,
      end_time: item.end_time,
      title: item.title,
      description: item.description || "",
      course_id: item.course_id || "",
    })
    setScheduleDialogOpen(true)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (profile?.role !== "main_organizer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">You don't have permission to access this page.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage users, course organizers, and schedule</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="schedule">Schedule Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{user.display_name}</h4>
                            {user.role === "main_organizer" && <Badge variant="default">Main Organizer</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{user.total_credits} credits</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setOrganizerDialogOpen(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign as Organizer
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Schedule Management
                  </CardTitle>
                  <Button onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lecture
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedule.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          {item.lecture_date} • {item.start_time} - {item.end_time}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditSchedule(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteSchedule(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Organizer Dialog */}
        <Dialog open={organizerDialogOpen} onOpenChange={setOrganizerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Course Organizer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Assign {selectedUser?.display_name} as organizer for:</p>
              <Select onValueChange={(courseId) => handleAssignOrganizer(selectedUser!.id, courseId)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Lecture" : "Add New Lecture"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduleForm.lecture_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, lecture_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="course">Course (Optional)</Label>
                <Select
                  value={scheduleForm.course_id}
                  onValueChange={(value) => setScheduleForm({ ...scheduleForm, course_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleScheduleSubmit} className="w-full">
                {editingSchedule ? "Update Lecture" : "Add Lecture"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
