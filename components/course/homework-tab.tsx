"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, Plus, GraduationCap, Clock } from "lucide-react"
import { format, isPast } from "date-fns"

interface Assignment {
  id: string
  title: string
  description?: string
  file_url?: string
  due_date?: string
  created_at: string
  organizer: {
    display_name: string
  }
  submissions?: Submission[]
}

interface Submission {
  id: string
  content?: string
  file_url?: string
  submitted_at: string
  graded_at?: string
  grade?: number
  feedback?: string
  student: {
    id: string
    display_name: string
  }
}

interface HomeworkTabProps {
  courseId: string
  isOrganizer: boolean
}

export function HomeworkTab({ courseId, isOrganizer }: HomeworkTabProps) {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false)
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  // Form states
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    due_date: "",
    file: null as File | null,
  })
  const [newSubmission, setNewSubmission] = useState({
    content: "",
    file: null as File | null,
  })
  const [grading, setGrading] = useState({
    grade: "",
    feedback: "",
  })

  useEffect(() => {
    fetchAssignments()
  }, [courseId])

  const fetchAssignments = async () => {
    try {
      const query = supabase
        .from("homework_assignments")
        .select(`
          id,
          title,
          description,
          file_url,
          due_date,
          created_at,
          organizer:profiles(display_name)
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })

      const { data: assignmentsData, error } = await query

      if (error) throw error

      // Fetch submissions for each assignment
      const assignmentsWithSubmissions = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          if (isOrganizer) {
            // Organizers see all submissions
            const { data: submissions } = await supabase
              .from("homework_submissions")
              .select(`
                id,
                content,
                file_url,
                submitted_at,
                graded_at,
                grade,
                feedback,
                student:profiles(id, display_name)
              `)
              .eq("assignment_id", assignment.id)
              .order("submitted_at", { ascending: false })

            return { ...assignment, submissions: submissions || [] }
          } else {
            // Students see only their own submission
            const { data: submissions } = await supabase
              .from("homework_submissions")
              .select(`
                id,
                content,
                file_url,
                submitted_at,
                graded_at,
                grade,
                feedback,
                student:profiles(id, display_name)
              `)
              .eq("assignment_id", assignment.id)
              .eq("student_id", user!.id)

            return { ...assignment, submissions: submissions || [] }
          }
        }),
      )

      setAssignments(assignmentsWithSubmissions)
    } catch (error) {
      console.error("Error fetching assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) return

    try {
      let fileUrl = null
      if (newAssignment.file) {
        const fileExt = newAssignment.file.name.split(".").pop()
        const fileName = `${courseId}/${Date.now()}.${fileExt}`

        const { data, error: uploadError } = await supabase.storage
          .from("homework-assignments")
          .upload(fileName, newAssignment.file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("homework-assignments").getPublicUrl(fileName)

        fileUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("homework_assignments").insert({
        course_id: courseId,
        organizer_id: user!.id,
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim() || null,
        file_url: fileUrl,
        due_date: newAssignment.due_date || null,
      })

      if (error) throw error

      setNewAssignment({ title: "", description: "", due_date: "", file: null })
      setCreateDialogOpen(false)
      await fetchAssignments()
    } catch (error) {
      console.error("Error creating assignment:", error)
    }
  }

  const handleSubmitHomework = async () => {
    if (!selectedAssignment || (!newSubmission.content.trim() && !newSubmission.file)) return

    try {
      let fileUrl = null
      if (newSubmission.file) {
        const fileExt = newSubmission.file.name.split(".").pop()
        const fileName = `${user!.id}/${selectedAssignment.id}/${Date.now()}.${fileExt}`

        const { data, error: uploadError } = await supabase.storage
          .from("homework-submissions")
          .upload(fileName, newSubmission.file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("homework-submissions").getPublicUrl(fileName)

        fileUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("homework_submissions").insert({
        assignment_id: selectedAssignment.id,
        student_id: user!.id,
        content: newSubmission.content.trim() || null,
        file_url: fileUrl,
      })

      if (error) throw error

      setNewSubmission({ content: "", file: null })
      setSubmissionDialogOpen(false)
      setSelectedAssignment(null)
      await fetchAssignments()
    } catch (error) {
      console.error("Error submitting homework:", error)
    }
  }

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !grading.grade.trim()) return

    try {
      const grade = Number.parseInt(grading.grade)

      const { error } = await supabase
        .from("homework_submissions")
        .update({
          grade,
          feedback: grading.feedback.trim() || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id)

      if (error) throw error

      // Award credits for the grade
      await supabase.rpc("award_credits", {
        user_id: selectedSubmission.student.id,
        amount: grade,
        reason: `Homework grade: ${grade} credits`,
        issuer_id: user!.id,
      })

      setGrading({ grade: "", feedback: "" })
      setGradingDialogOpen(false)
      setSelectedSubmission(null)
      await fetchAssignments()
    } catch (error) {
      console.error("Error grading submission:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Homework Assignments</h3>
        {isOrganizer && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Assignment title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder="Assignment description and instructions"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="file">Attachment (Optional)</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setNewAssignment({ ...newAssignment, file: e.target.files?.[0] || null })}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                  />
                </div>
                <Button onClick={handleCreateAssignment} className="w-full">
                  Create Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No assignments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date))
            const userSubmission = assignment.submissions?.find((s) => s.student.id === user!.id)

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{assignment.title}</span>
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                        {userSubmission?.graded_at && (
                          <Badge variant="secondary">Graded: {userSubmission.grade}/20</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        By {assignment.organizer.display_name} •{" "}
                        {format(new Date(assignment.created_at), "MMM d, yyyy")}
                        {assignment.due_date && (
                          <span className="ml-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Due: {format(new Date(assignment.due_date), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignment.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                      {assignment.description}
                    </p>
                  )}

                  {assignment.file_url && (
                    <div className="mb-4">
                      <Button variant="outline" size="sm" asChild>
                        <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Assignment File
                        </a>
                      </Button>
                    </div>
                  )}

                  {isOrganizer ? (
                    // Organizer view - show all submissions
                    <div className="space-y-4">
                      <h4 className="font-semibold">Submissions ({assignment.submissions?.length || 0})</h4>
                      {assignment.submissions?.length === 0 ? (
                        <p className="text-gray-500">No submissions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {assignment.submissions?.map((submission) => (
                            <div
                              key={submission.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <span className="font-medium">{submission.student.display_name}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  Submitted {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                                {submission.graded_at && (
                                  <Badge variant="secondary" className="ml-2">
                                    Grade: {submission.grade}/20
                                  </Badge>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {submission.file_url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Submission by {submission.student.display_name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {submission.content && (
                                        <div>
                                          <Label>Answer</Label>
                                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="whitespace-pre-wrap">{submission.content}</p>
                                          </div>
                                        </div>
                                      )}
                                      {submission.file_url && (
                                        <div>
                                          <Label>File Attachment</Label>
                                          <Button variant="outline" asChild>
                                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                              <Download className="h-4 w-4 mr-2" />
                                              Download File
                                            </a>
                                          </Button>
                                        </div>
                                      )}
                                      {submission.graded_at ? (
                                        <div className="space-y-2">
                                          <div>
                                            <Label>Grade</Label>
                                            <p className="font-semibold">{submission.grade}/20 credits</p>
                                          </div>
                                          {submission.feedback && (
                                            <div>
                                              <Label>Feedback</Label>
                                              <p className="text-gray-700 dark:text-gray-300">{submission.feedback}</p>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <Button
                                          onClick={() => {
                                            setSelectedSubmission(submission)
                                            setGradingDialogOpen(true)
                                          }}
                                        >
                                          Grade Submission
                                        </Button>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Student view - show submission status
                    <div className="space-y-4">
                      {userSubmission ? (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <h4 className="font-semibold text-green-800 dark:text-green-200">Submitted</h4>
                          <p className="text-sm text-green-600 dark:text-green-300">
                            Submitted on {format(new Date(userSubmission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {userSubmission.graded_at && (
                            <div className="mt-2">
                              <p className="font-semibold">Grade: {userSubmission.grade}/20 credits</p>
                              {userSubmission.feedback && (
                                <div className="mt-2">
                                  <Label>Feedback</Label>
                                  <p className="text-sm">{userSubmission.feedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setSubmissionDialogOpen(true)
                          }}
                          disabled={isOverdue}
                        >
                          {isOverdue ? "Submission Closed" : "Submit Homework"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Submission Dialog */}
      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Homework: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Your Answer</Label>
              <Textarea
                id="content"
                value={newSubmission.content}
                onChange={(e) => setNewSubmission({ ...newSubmission, content: e.target.value })}
                placeholder="Write your answer here..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="submission_file">File Attachment (Optional)</Label>
              <Input
                id="submission_file"
                type="file"
                onChange={(e) => setNewSubmission({ ...newSubmission, file: e.target.files?.[0] || null })}
              />
            </div>
            <Button onClick={handleSubmitHomework} className="w-full">
              Submit Homework
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">Grade (Credits: 0-20)</Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="20"
                value={grading.grade}
                onChange={(e) => setGrading({ ...grading, grade: e.target.value })}
                placeholder="Enter grade (0-20)"
              />
            </div>
            <div>
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={grading.feedback}
                onChange={(e) => setGrading({ ...grading, feedback: e.target.value })}
                placeholder="Provide feedback to the student..."
                rows={4}
              />
            </div>
            <Button onClick={handleGradeSubmission} className="w-full">
              Submit Grade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
