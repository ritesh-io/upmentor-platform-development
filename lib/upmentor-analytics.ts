import type { DemoData, Roadmap, UserProfile } from "@/lib/upmentor-demo-data"

const DAY_MS = 86_400_000
const getTasks = (roadmap?: Roadmap) => roadmap?.stages.flatMap((stage) => stage.tasks) || []
const safeTime = (value?: string) => {
  if (!value) return Number.NaN
  const time = new Date(value.length === 10 ? `${value}T12:00:00` : value).getTime()
  return Number.isFinite(time) ? time : Number.NaN
}

export function roadmapProgress(roadmap?: Roadmap) {
  const tasks = getTasks(roadmap)
  return tasks.length ? Math.round(tasks.filter((task) => task.status === "approved").length * 100 / tasks.length) : 0
}

export type AttentionSignal = {
  student: UserProfile
  severity: "high" | "medium"
  reasons: string[]
  lastActivity: string
  recommendedAction: string
  overdueTasks: number
  missedSessions: number
}

export function getStudentAttention(data: DemoData, now = Date.now()): AttentionSignal[] {
  const today = new Date(now).toISOString().slice(0, 10)
  const students = data.users.filter((user) => user.role === "mentee")
  return students.flatMap((student) => {
    const roadmap = data.roadmaps.find((item) => item.studentId === student.id)
    const tasks = getTasks(roadmap)
    const assignment = data.assignments.find((item) => item.studentId === student.id)
    const studentSessions = data.sessions.filter((session) => session.studentId === student.id)
    const overdueTasks = tasks.filter((task) => (task.status === "todo" || task.status === "revision") && task.deadline < today)
    const missedSessions = studentSessions.filter((session) => session.status === "missed" || (session.status === "upcoming" && safeTime(session.startsAt) < now))
    const completedCount = tasks.filter((task) => task.status === "approved").length
    const activityDates = [
      ...tasks.flatMap((task) => [task.submission?.submittedAt, task.review?.reviewedAt]),
      ...studentSessions.filter((session) => session.status === "completed").map((session) => session.startsAt),
      assignment?.assignedAt,
    ].map(safeTime).filter(Number.isFinite)
    const latestActivity = activityDates.length ? Math.max(...activityDates) : Number.NaN
    const daysInactive = Number.isFinite(latestActivity) ? Math.max(0, Math.floor((now - latestActivity) / DAY_MS)) : Number.POSITIVE_INFINITY
    const daysSinceAssignment = assignment ? Math.max(0, Math.floor((now - safeTime(assignment.assignedAt)) / DAY_MS)) : 0
    const hasRecentWork = tasks.some((task) => Boolean(task.submission?.submittedAt)) || studentSessions.some((session) => session.status === "completed")
    const noProgress = completedCount === 0 && !hasRecentWork && daysSinceAssignment >= 14
    const inactive = Number.isFinite(latestActivity) && daysInactive >= 21
    const reasons = [
      overdueTasks.length ? `${overdueTasks.length} overdue learning task${overdueTasks.length === 1 ? "" : "s"}` : "",
      missedSessions.length ? `${missedSessions.length} missed session${missedSessions.length === 1 ? "" : "s"}` : "",
      noProgress ? "No approved roadmap progress after two weeks" : "",
      inactive ? `${daysInactive} days without recorded activity` : "",
    ].filter(Boolean)
    if (!reasons.length) return []
    const lastActivity = Number.isFinite(latestActivity) ? `${daysInactive} days ago · ${completedCount}/${tasks.length} tasks approved` : "No activity has been recorded yet"
    const recommendedAction = missedSessions.length
      ? "Send a low-pressure check-in and offer a new session time."
      : overdueTasks.length
        ? "Agree on one smaller task and a realistic next deadline."
        : "Ask what is getting in the way and revisit the weekly plan together."
    const high = overdueTasks.length >= 2 || (missedSessions.length > 0 && (inactive || noProgress)) || (noProgress && inactive)
    return [{ student, severity: high ? "high" as const : "medium" as const, reasons, lastActivity, recommendedAction, overdueTasks: overdueTasks.length, missedSessions: missedSessions.length }]
  }).sort((a, b) => (a.severity === b.severity ? b.overdueTasks + b.missedSessions - a.overdueTasks - a.missedSessions : a.severity === "high" ? -1 : 1))
}

export function getCohortAnalytics(data: DemoData) {
  return data.cohorts.map((cohort) => {
    const students = data.users.filter((user) => cohort.studentIds.includes(user.id) && user.role === "mentee")
    const roadmaps = students.map((student) => data.roadmaps.find((roadmap) => roadmap.studentId === student.id))
    const allTasks = roadmaps.flatMap(getTasks)
    const approved = allTasks.filter((task) => task.status === "approved").length
    const enrolledMentors = data.assignments.filter((assignment) => cohort.mentorIds.includes(assignment.mentorId) && students.some((student) => student.id === assignment.studentId)).length
    return {
      cohort,
      students: students.length,
      progress: roadmaps.length ? Math.round(roadmaps.reduce((sum, roadmap) => sum + roadmapProgress(roadmap), 0) / roadmaps.length) : 0,
      approved,
      tasks: allTasks.length,
      mentorAssignments: enrolledMentors,
      eventRsvps: Object.entries(data.eventRsvps).reduce((sum, [eventId, userIds]) => {
        const event = data.events.find((item) => item.id === eventId)
        return sum + (event?.tracks.includes(cohort.track) ? userIds.filter((id) => students.some((student) => student.id === id)).length : 0)
      }, 0),
    }
  })
}
