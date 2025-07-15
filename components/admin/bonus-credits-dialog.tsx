"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Trophy } from "lucide-react"
import { useEffect } from "react"

interface Student {
  id: string
  display_name: string
  total_credits: number
}

interface BonusCreditsDialogProps {
  courseId?: string
}

export function BonusCreditsDialog({ courseId }: BonusCreditsDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchStudents()
    }
  }, [open, courseId])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("profiles")
        .select("id, display_name, total_credits")
        .eq("role", "student")
        .order("display_name")

      if (courseId) {
        // If courseId is provided, only show enrolled students
        const { data: enrollments } = await supabase.from("enrollments").select("user_id").eq("course_id", courseId)

        const enrolledUserIds = enrollments?.map((e) => e.user_id) || []

        if (enrolledUserIds.length > 0) {
          query = query.in("id", enrolledUserIds)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAwardCredits = async () => {
    if (!selectedStudent || !amount.trim() || !reason.trim()) return

    setSubmitting(true)
    try {
      const creditAmount = Number.parseInt(amount)

      const { error } = await supabase.rpc("award_credits", {
        user_id: selectedStudent,
        amount: creditAmount,
        reason: reason.trim(),
        issuer_id: user!.id,
      })

      if (error) throw error

      // Reset form
      setSelectedStudent("")
      setAmount("")
      setReason("")
      setOpen(false)
    } catch (error) {
      console.error("Error awarding credits:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Trophy className="h-4 w-4 mr-2" />
          Award Bonus Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Award Bonus Credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="student">Select Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{student.display_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{student.total_credits} credits</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Credit Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter number of credits"
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you're awarding these credits..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAwardCredits}
                disabled={!selectedStudent || !amount.trim() || !reason.trim() || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Awarding Credits...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Award {amount} Credits
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
