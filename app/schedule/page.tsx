"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Clock, BookOpen } from "lucide-react"
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns"

interface ScheduleItem {
  id: string
  lecture_date: string
  start_time: string
  end_time: string
  title: string
  description?: string
  course_id?: string
}

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      fetchSchedule()
    }
  }, [user, authLoading, router, currentWeek])

  const fetchSchedule = async () => {
    try {
      const weekStart = startOfWeek(currentWeek)
      const weekEnd = endOfWeek(currentWeek)

      const { data, error } = await supabase
        .from("schedule")
        .select("*")
        .gte("lecture_date", format(weekStart, "yyyy-MM-dd"))
        .lte("lecture_date", format(weekEnd, "yyyy-MM-dd"))
        .order("lecture_date")
        .order("start_time")

      if (error) throw error
      setSchedule(data || [])
    } catch (error) {
      console.error("Error fetching schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek),
    end: endOfWeek(currentWeek),
  })

  const getScheduleForDay = (day: Date) => {
    return schedule.filter((item) => isSameDay(parseISO(item.lecture_date), day))
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-playfair">Schedule</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Weekly schedule for USS25 lectures and activities</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            ← Previous Week
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {format(startOfWeek(currentWeek), "MMM d")} - {format(endOfWeek(currentWeek), "MMM d, yyyy")}
          </h2>
          <button
            onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Next Week →
          </button>
        </div>

        {/* Weekly Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const daySchedule = getScheduleForDay(day)
            const isDayToday = isToday(day)

            return (
              <Card key={day.toISOString()} className={isDayToday ? "ring-2 ring-blue-500" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{format(day, "EEE")}</span>
                    <span className={`text-sm ${isDayToday ? "text-blue-600 font-bold" : "text-gray-500"}`}>
                      {format(day, "MMM d")}
                    </span>
                  </CardTitle>
                  {isDayToday && (
                    <Badge variant="default" className="w-fit">
                      Today
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {daySchedule.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No lectures</p>
                  ) : (
                    <div className="space-y-3">
                      {daySchedule.map((item) => {
                        const startTime = format(parseISO(`${item.lecture_date}T${item.start_time}`), "h:mm a")
                        const endTime = format(parseISO(`${item.lecture_date}T${item.end_time}`), "h:mm a")

                        return (
                          <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-start space-x-2 mb-2">
                              <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="h-3 w-3 mr-1" />
                              {startTime} - {endTime}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
