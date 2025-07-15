"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Calendar, Clock, AlertCircle } from "lucide-react"
import { format, parseISO, differenceInMinutes } from "date-fns"

interface ScheduleItem {
  id: string
  lecture_date: string
  start_time: string
  end_time: string
  title: string
  description?: string
  course_id?: string
}

export function ScheduleWidget() {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingLecture, setUpcomingLecture] = useState<ScheduleItem | null>(null)

  useEffect(() => {
    if (user) {
      fetchTodaySchedule()
      const interval = setInterval(checkUpcomingLectures, 60000) // Check every minute
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchTodaySchedule = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]

      const { data, error } = await supabase.from("schedule").select("*").eq("lecture_date", today).order("start_time")

      if (error) throw error
      setSchedule(data || [])
      checkUpcomingLectures(data || [])
    } catch (error) {
      console.error("Error fetching schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkUpcomingLectures = (scheduleData?: ScheduleItem[]) => {
    const currentSchedule = scheduleData || schedule
    const now = new Date()
    const currentTime = format(now, "HH:mm:ss")

    for (const item of currentSchedule) {
      const lectureStart = parseISO(`${item.lecture_date}T${item.start_time}`)
      const lectureEnd = parseISO(`${item.lecture_date}T${item.end_time}`)
      const minutesUntilStart = differenceInMinutes(lectureStart, now)

      // Check if lecture is starting in 15 minutes or is currently in progress
      if (minutesUntilStart <= 15 && minutesUntilStart >= 0) {
        setUpcomingLecture(item)
        return
      } else if (now >= lectureStart && now <= lectureEnd) {
        setUpcomingLecture(item)
        return
      }
    }
    setUpcomingLecture(null)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Lecture Alert */}
      {upcomingLecture && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>{upcomingLecture.title}</strong> is starting soon!
            {format(parseISO(`${upcomingLecture.lecture_date}T${upcomingLecture.start_time}`), " at h:mm a")}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedule.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No lectures scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {schedule.map((item) => {
                const startTime = format(parseISO(`${item.lecture_date}T${item.start_time}`), "h:mm a")
                const endTime = format(parseISO(`${item.lecture_date}T${item.end_time}`), "h:mm a")
                const now = new Date()
                const lectureStart = parseISO(`${item.lecture_date}T${item.start_time}`)
                const lectureEnd = parseISO(`${item.lecture_date}T${item.end_time}`)
                const isInProgress = now >= lectureStart && now <= lectureEnd

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      isInProgress
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-1" />
                          {startTime} - {endTime}
                        </div>
                      </div>
                      {isInProgress && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          Live
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
