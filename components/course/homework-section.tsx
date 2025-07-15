"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { CalendarIcon, FileText, Download, CheckCircle, Clock, PlusCircle, ExternalLink } from "lucide-react"
import { format, isValid } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Assignment {
  id: string
  course_id: string
  organizer_id: string
  title: string
  description?: string
  file_url?: string
  due_date?: string
  created_at: string
  organizer: { display_name: string }
  submissions: Submission[] // Joined from DB
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  content?: string
  file_url?: string
  submitted_at: string
  graded_at?: string
  grade?: number
  feedback?: string
  student: { display_name: string; avatar_url?: string }
}

interface HomeworkSectionProps {
  courseId: string
  isOrganizer: boolean
}

export function HomeworkSection({ courseId, isOrganizer }: HomeworkSectionProps) {
  const { user, profile } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [createAssignmentDialogOpen, setCreateAssignmentDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    dueDate: new Date(),
    file: null as File | null,
  })
  const [submittingAssignment, setSubmittingAssignment] = useState(false)

  const [submitHomeworkDialogOpen, setSubmitHomeworkDialogOpen] = useState(false)
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<Assignment | null>(null)
  const [newSubmission, setNewSubmission] = useState({
    content: "",
    file: null as File | null,
  })
  const [submittingHomework, setSubmittingHomework] = useState(false)
  const [studentSubmission, setStudentSubmission] = useState<Submission | null>(null) // Student's own submission for current assignment

  const [viewSubmissionDialogOpen, setViewSubmissionDialogOpen] = useState(false)
  const [selectedSubmissionForView, setSelectedSubmissionForView] = useState<Submission | null>(null)
  const [gradingDetails, setGradingDetails] = useState({
    grade: 0,
    feedback: "",
  })
  const [isGrading, setIsGrading] = useState(false)
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<Assignment | null>(null) // Declare the variable

  useEffect(() => {
    fetchAssignments()
  }, [courseId])

  const fetchAssignments = async () => {
    setLoading(true)
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

      const { data: assignmentsData, error: assignmentsError } = await query

      if (assignmentsError) throw assignmentsError

      const assignmentsWithSubmissions = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: submissionsData, error: submissionsError } = await supabase
            .from("homework_submissions")
            .select(`
              id,
              assignment_id,
              student_id,
              content,
              file_url,
              submitted_at,
              graded_at,
              grade,
              feedback,
              student:profiles(display_name, avatar_url)
            `)
            .eq("assignment_id", assignment.id)

          if (submissionsError)
            console.error("Error fetching submissions for assignment:", assignment.id, submissionsError)

          return { ...assignment, submissions: submissionsData || [] }
        }),
      )

      setAssignments(assignmentsWithSubmissions || [])
    } catch (error) {
      console.error("Error fetching assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim() || !user || !isOrganizer) return

    setSubmittingAssignment(true)
    let fileUrl = null

    try {
      if (newAssignment.file) {
        const fileExt = newAssignment.file.name.split(".").pop()
        const fileName = `${courseId}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("homework-assignments")
          .upload(fileName, newAssignment.file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("homework-assignments").getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("homework_assignments").insert({
        course_id: courseId,
        organizer_id: user.id,
        title: newAssignment.title.trim(),
        description: newAssignment.description?.trim() || null,
        file_url: fileUrl,
        due_date: newAssignment.dueDate.toISOString(),
      })

      if (error) throw error

      setNewAssignment({ title: "", description: "", dueDate: new Date(), file: null })
      setCreateAssignmentDialogOpen(false)
      await fetchAssignments()
    } catch (error) {
      console.error("Error creating assignment:", error)
    } finally {
      setSubmittingAssignment(false)
    }
  }

  const openSubmitHomeworkDialog = (assignment: Assignment) => {
    setSelectedAssignmentForSubmission(assignment)
    setNewSubmission({ content: "", file: null })
    const studentExistingSubmission = assignment.submissions.find((sub) => sub.student_id === user?.id)
    setStudentSubmission(studentExistingSubmission || null)
    setSubmitHomeworkDialogOpen(true)
  }

  const handleSubmitHomework = async () => {
    if (!selectedAssignmentForSubmission || (!newSubmission.content.trim() && !newSubmission.file) || !user) return

    setSubmittingHomework(true)
    let fileUrl = null

    try {
      if (newSubmission.file) {
        const fileExt = newSubmission.file.name.split(".").pop()
        const fileName = `${user.id}/${selectedAssignmentForSubmission.id}_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("homework-submissions")
          .upload(fileName, newSubmission.file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("homework-submissions").getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
      }

      // Check if submission already exists (for update)
      const existingSubmission = studentSubmission

      if (existingSubmission) {
        const { error } = await supabase
          .from("homework_submissions")
          .update({
            content: newSubmission.content.trim() || null,
            file_url: fileUrl,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existingSubmission.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("homework_submissions").insert({
          assignment_id: selectedAssignmentForSubmission.id,
          student_id: user.id,
          content: newSubmission.content.trim() || null,
          file_url: fileUrl,
        })
        if (error) throw error
      }

      setSubmitHomeworkDialogOpen(false)
      await fetchAssignments()
    } catch (error) {
      console.error("Error submitting homework:", error)
    } finally {
      setSubmittingHomework(false)
    }
  }

  const openViewSubmissionDialog = (submission: Submission) => {
    setSelectedSubmissionForView(submission)
    setSelectedAssignmentForView(assignments.find((a) => a.id === submission.assignment_id) || null) // Set the variable
    setGradingDetails({
      grade: submission.grade || 0,
      feedback: submission.feedback || "",
    })
    setViewSubmissionDialogOpen(true)
  }

  const handleGradeSubmission = async () => {
    if (!selectedSubmissionForView || !user || !isOrganizer) return
    setIsGrading(true)
    try {
      const { error } = await supabase
        .from("homework_submissions")
        .update({
          grade: gradingDetails.grade,
          feedback: gradingDetails.feedback.trim(),
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmissionForView.id)

      if (error) throw error

      // Award credits for homework submission grade
      await supabase.from("credit_transactions").insert({
        user_id: selectedSubmissionForView.student_id,
        amount: gradingDetails.grade,
        reason: `Homework grade for "${selectedAssignmentForView?.title}"`,
        issuer_id: user.id, // Organizer issued credit
      })

      setViewSubmissionDialogOpen(false)
      await fetchAssignments() // Refresh assignments to show updated grades
    } catch (error) {
      console.error("Error grading submission:", error)
    } finally {
      setIsGrading(false)
    }
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Homework Assignments</h3>
        {user && isOrganizer && (
          <Dialog open={createAssignmentDialogOpen} onOpenChange={setCreateAssignmentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignment-title">Title</Label>
                  <Input
                    id="assignment-title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="e.g., Week 1 Problem Set"
                  />
                </div>
                <div>
                  <Label htmlFor="assignment-description">Description</Label>
                  <Textarea
                    id="assignment-description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder="Detailed instructions for the assignment"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="assignment-due-date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newAssignment.dueDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAssignment.dueDate ? (
                          format(newAssignment.dueDate, "PPP hh:mm a")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newAssignment.dueDate}
                        onSelect={(date) => setNewAssignment({ ...newAssignment, dueDate: date || new Date() })}
                        initialFocus
                      />
                      <div className="p-3 border-t border-border">
                        <Input
                          type="time"
                          value={format(newAssignment.dueDate, "HH:mm")}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":").map(Number)
                            const newDate = new Date(newAssignment.dueDate)
                            newDate.setHours(hours, minutes)
                            setNewAssignment({ ...newAssignment, dueDate: newDate })
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="assignment-file">Attach File (Optional)</Label>
                  <Input
                    id="assignment-file"
                    type="file"
                    onChange={(e) => setNewAssignment({ ...newAssignment, file: e.target.files?.[0] || null })}
                  />
                </div>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={!newAssignment.title.trim() || submittingAssignment}
                  className="w-full"
                >
                  {submittingAssignment ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Assignment"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No homework assignments yet.</p>
            {!user && <p className="text-sm text-gray-500 mt-2">Sign in to view assignments!</p>}
            {user && isOrganizer && <p className="text-sm text-gray-500 mt-2">Create the first assignment above!</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-xl font-semibold">
                  {assignment.title}
                  {user &&
                    !isOrganizer && ( // Student view
                      <Button
                        size="sm"
                        onClick={() => openSubmitHomeworkDialog(assignment)}
                        disabled={assignment.submissions.some((sub) => sub.student_id === user.id)}
                      >
                        {assignment.submissions.some((sub) => sub.student_id === user.id)
                          ? "Submitted"
                          : "Submit Homework"}
                      </Button>
                    )}
                </CardTitle>
                <CardDescription className="text-base">
                  <span className="font-medium">Due: </span>
                  {assignment.due_date && isValid(new Date(assignment.due_date))
                    ? format(new Date(assignment.due_date), "MMM d, yyyy 'at' hh:mm a")
                    : "N/A"}
                  <span className="ml-4 font-medium">By: </span>
                  {assignment.organizer?.display_name || "N/A"}
                </CardDescription>
                <CardDescription>{assignment.description}</CardDescription>
                {assignment.file_url && (
                  <Button variant="outline" size="sm" asChild className="mt-2 w-fit bg-transparent">
                    <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Assignment File
                    </a>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {user &&
                  !isOrganizer && // Student's own submission status
                  (assignment.submissions.find((sub) => sub.student_id === user.id) ? (
                    <Card className="mt-4 border-l-4 border-green-500 dark:border-green-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-lg mb-2">Your Submission</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {studentSubmission?.content}
                        </p>
                        {studentSubmission?.file_url && (
                          <Button variant="outline" size="sm" asChild className="mt-2 bg-transparent">
                            <a href={studentSubmission.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Your Submission File
                            </a>
                          </Button>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          {studentSubmission?.grade !== null && studentSubmission?.grade !== undefined ? (
                            <div className="flex items-center text-green-600 font-bold dark:text-green-400">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Grade: {studentSubmission.grade} Credits
                            </div>
                          ) : (
                            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                              <Clock className="h-4 w-4 mr-1" />
                              Awaiting Grade
                            </div>
                          )}
                          {studentSubmission?.feedback && (
                            <p className="text-gray-700 dark:text-gray-300">Feedback: {studentSubmission.feedback}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-gray-500 text-sm mt-4">You have not submitted this assignment yet.</p>
                  ))}

                {user &&
                  isOrganizer && ( // Organizer view: list of submissions
                    <div className="mt-4">
                      <h4 className="font-semibold text-lg mb-2">Submissions ({assignment.submissions.length})</h4>
                      {assignment.submissions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No submissions for this assignment yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Submitted At</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignment.submissions.map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={submission.student.avatar_url || ""} />
                                      <AvatarFallback>
                                        {submission.student.display_name?.charAt(0).toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{submission.student.display_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(submission.submitted_at), "MMM d, yyyy hh:mm a")}
                                </TableCell>
                                <TableCell>
                                  {submission.grade !== null && submission.grade !== undefined ? (
                                    <Badge variant="secondary">{submission.grade} Credits</Badge>
                                  ) : (
                                    <Badge variant="outline">Not Graded</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openViewSubmissionDialog(submission)}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View / Grade
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Homework Dialog (Student) */}
      {selectedAssignmentForSubmission && (
        <Dialog open={submitHomeworkDialogOpen} onOpenChange={setSubmitHomeworkDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Submit for: {selectedAssignmentForSubmission.title}</DialogTitle>
              <DialogDescription>
                {studentSubmission
                  ? "You have already submitted this assignment. You can update your submission here."
                  : "Submit your homework for this assignment."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="submission-content" className="text-right">
                  Answer
                </Label>
                <Textarea
                  id="submission-content"
                  placeholder="Type your answer here..."
                  className="col-span-3"
                  value={newSubmission.content}
                  onChange={(e) => setNewSubmission({ ...newSubmission, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="submission-file" className="text-right">
                  File
                </Label>
                <Input
                  id="submission-file"
                  type="file"
                  className="col-span-3"
                  onChange={(e) => setNewSubmission({ ...newSubmission, file: e.target.files?.[0] || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmitHomework}
                disabled={submittingHomework || (!newSubmission.content.trim() && !newSubmission.file)}
              >
                {submittingHomework ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Homework"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View/Grade Submission Dialog (Organizer) */}
      {selectedSubmissionForView && (
        <Dialog open={viewSubmissionDialogOpen} onOpenChange={setViewSubmissionDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                Submission by {selectedSubmissionForView.student.display_name} for "{selectedAssignmentForView?.title}"
              </DialogTitle>
              <DialogDescription>
                Submitted on {format(new Date(selectedSubmissionForView.submitted_at), "MMM d, yyyy 'at' hh:mm a")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Student's Answer:</h4>
                <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md whitespace-pre-wrap">
                  {selectedSubmissionForView.content || "No text content provided."}
                </p>
              </div>
              {selectedSubmissionForView.file_url && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Attached File:</h4>
                  <Button variant="outline" asChild>
                    <a href={selectedSubmissionForView.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Submitted File
                    </a>
                  </Button>
                </div>
              )}
              {isOrganizer && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade" className="text-right">
                      Grade (Credits)
                    </Label>
                    <Input
                      id="grade"
                      type="number"
                      min="0"
                      max="20"
                      className="col-span-3"
                      value={gradingDetails.grade}
                      onChange={(e) =>
                        setGradingDetails({ ...gradingDetails, grade: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="feedback" className="text-right">
                      Feedback
                    </Label>
                    <Textarea
                      id="feedback"
                      placeholder="Provide feedback to the student..."
                      className="col-span-3"
                      value={gradingDetails.feedback}
                      onChange={(e) => setGradingDetails({ ...gradingDetails, feedback: e.target.value })}
                    />
                  </div>
                </>
              )}
              {!isOrganizer &&
                selectedSubmissionForView.grade !== null &&
                selectedSubmissionForView.grade !== undefined && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Grade:</h4>
                    <Badge variant="secondary" className="text-lg py-1 px-3">
                      {selectedSubmissionForView.grade} Credits
                    </Badge>
                  </div>
                )}
              {!isOrganizer && selectedSubmissionForView.feedback && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Feedback:</h4>
                  <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md whitespace-pre-wrap">
                    {selectedSubmissionForView.feedback}
                  </p>
                </div>
              )}
            </div>
            {isOrganizer && (
              <DialogFooter>
                <Button onClick={handleGradeSubmission} disabled={isGrading}>
                  {isGrading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Grading...
                    </>
                  ) : (
                    "Submit Grade"
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
