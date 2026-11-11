"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Activity, ArrowRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, FileText, LayoutDashboard, Plus, Sparkles, Target, Users } from "lucide-react"
import { Brand } from "./brand"
import { CommunityHub } from "./community-hub"
import { CohortManagement } from "./cohort-management"
import { LearnerProfile, LeaderboardCard } from "./learner-profile"
import { MentorMenteeIntake } from "./mentor-mentee-intake"
import { MentorOnboardingForm } from "./mentor-onboarding-form"
import { SessionInsightsEditor, type ApprovedSummary } from "./session-insights"
import { ThemeToggle } from "./theme-toggle"
import { roadmapContentSchema } from "@/lib/upmentor-ai-contracts"
import { getCohortAnalytics, getStudentAttention } from "@/lib/upmentor-analytics"
import { DEMO_STORAGE_KEY, LEARNING_RESOURCES, getMatchBreakdown, makeId, makePersonalizedRoadmap, makeRoadmapFromGenerated, seedDemoData, type AppNotification, type DemoData, type MentorshipSession, type Roadmap, type RoadmapTask, type Role, type UserProfile } from "@/lib/upmentor-demo-data"

type Section = { id: string; label: string; icon: typeof Target }
const sections: Record<Role, Section[]> = {
  mentee: [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "roadmap", label: "My roadmap", icon: BookOpen }, { id: "tasks", label: "Tasks & submissions", icon: ClipboardList }, { id: "sessions", label: "Sessions", icon: CalendarDays }, { id: "community", label: "Community & resources", icon: BookOpen }, { id: "profile", label: "My AI profile", icon: Target }, { id: "notifications", label: "Notifications", icon: Bell }],
  mentor: [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "mentees", label: "My mentees", icon: Users }, { id: "sessions", label: "Sessions", icon: CalendarDays }, { id: "reviews", label: "Reviews", icon: FileText }, { id: "community", label: "Community", icon: BookOpen }, { id: "profile", label: "My AI profile", icon: Target }, { id: "notifications", label: "Notifications", icon: Bell }],
  admin: [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "students", label: "Students", icon: Users }, { id: "mentors", label: "Mentors & matching", icon: Sparkles }, { id: "cohorts", label: "Cohorts", icon: BookOpen }, { id: "community", label: "Community & events", icon: CalendarDays }, { id: "profile", label: "Program profile", icon: Target }, { id: "notifications", label: "Notifications", icon: Bell }],
}
const roleMeta: Record<Role, { title: string; userId: string }> = {
  mentee: { title: "Student workspace", userId: "aryan" },
  mentor: { title: "Mentor workspace", userId: "kritika" },
  admin: { title: "Program workspace", userId: "nidhi" },
}
const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50"
const quietButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]"
const day = (value: string) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date set"
const dateInput = (offset = 14) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
function safeHttpsUrl(value?: string) {
  if (!value?.trim()) return null
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

function Card({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)] ${className}`}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[#172033]">{title}</h2>{action}</div>{children}</section>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">{label}{children}</label> }
function Notice({ children }: { children: ReactNode }) { return <div role="status" className="rounded-lg border border-[#e9e8ff] bg-[#f8f7ff] px-3.5 py-3 text-xs leading-5 text-[#5752a4]">{children}</div> }
function Empty({ children }: { children: ReactNode }) { return <p className="rounded-lg border border-dashed border-[#e1e4ed] px-4 py-7 text-center text-xs text-[#828b9c]">{children}</p> }
function fullName(data: DemoData, id: string) { return data.users.find((user) => user.id === id)?.name || "Unknown" }
function getAllTasks(data: DemoData) { return data.roadmaps.flatMap((roadmap) => roadmap.stages.flatMap((stage) => stage.tasks.map((task) => ({ roadmap, stage, task })))) }
function progressOf(roadmap?: Roadmap) {
  const tasks = roadmap?.stages.flatMap((stage) => stage.tasks) || []
  return tasks.length ? Math.round(tasks.filter((task) => task.status === "approved").length * 100 / tasks.length) : 0
}

export function Platform({ role }: { role: Role }) {
  const [data, setData] = useState<DemoData>(seedDemoData)
  const [ready, setReady] = useState(false)
  const [section, setSection] = useState("overview")
  const [accountId, setAccountId] = useState(roleMeta[role].userId)
  const [expandedStages, setExpandedStages] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [roadmapSource, setRoadmapSource] = useState<"ai" | "simulated" | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DEMO_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as DemoData
        if (parsed.version === 2 && Array.isArray(parsed.users) && Array.isArray(parsed.roadmaps) && Array.isArray(parsed.cohorts) && Array.isArray(parsed.events) && Array.isArray(parsed.sessions)) setData(parsed)
      }
    } catch {
      setMessage("Saved demo data could not be read. Your current session is still usable.")
    }
    setReady(true)
    const sync = (event: StorageEvent) => {
      if (event.key !== DEMO_STORAGE_KEY || !event.newValue) return
      try { setData(JSON.parse(event.newValue) as DemoData) } catch { /* Ignore malformed cross-tab demo data. */ }
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  useEffect(() => {
    if (!ready) return
    try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data)) } catch { setMessage("Browser storage is unavailable. Changes will last for this session only.") }
  }, [data, ready])

  const currentUser = data.users.find((user) => user.id === accountId && user.role === role) || data.users.find((user) => user.role === role)!
  const ownRoadmap = data.roadmaps.find((roadmap) => roadmap.studentId === currentUser.id)
  const mentorAssignments = data.assignments.filter((item) => item.mentorId === currentUser.id)
  const menteeIds = role === "mentee" ? [currentUser.id] : role === "mentor" ? mentorAssignments.map((item) => item.studentId) : data.users.filter((user) => user.role === "mentee").map((user) => user.id)
  const ownNotifications = data.notifications.filter((item) => role === "admin" || item.userId === currentUser.id)
  const unreadCount = ownNotifications.filter((item) => !item.read).length
  const title = sections[role].find((item) => item.id === section)?.label || sections[role][0].label
  const notify = (userId: string, text: string) => ({ id: makeId("notice"), userId, message: text, createdAt: new Date().toISOString(), read: false } satisfies AppNotification)
  const updateTask = (taskId: string, transform: (task: RoadmapTask) => RoadmapTask) => setData((old) => ({ ...old, roadmaps: old.roadmaps.map((roadmap) => ({ ...roadmap, stages: roadmap.stages.map((stage) => ({ ...stage, tasks: stage.tasks.map((task) => task.id === taskId ? transform(task) : task) })) })) }))
  const updateRoadmap = (studentId: string, roadmap: Roadmap) => setData((old) => ({ ...old, roadmaps: [...old.roadmaps.filter((item) => item.studentId !== studentId), roadmap] }))
  const assignedMentor = data.users.find((user) => data.assignments.some((assignment) => assignment.studentId === currentUser.id && assignment.mentorId === user.id))
  const completedCount = ownRoadmap?.stages.flatMap((stage) => stage.tasks).filter((task) => task.status === "approved").length || 0
  const allOwnTasks = ownRoadmap?.stages.flatMap((stage) => stage.tasks) || []

  const submitOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (generatingRoadmap) return
    const form = new FormData(event.currentTarget)
    const profile = data.users.find((user) => user.id === currentUser.id)!
    const hasExisting = data.roadmaps.some((item) => item.studentId === profile.id)
    if (hasExisting && !window.confirm("Regenerate this roadmap? Completed, submitted, and revision work will be preserved.")) return
    const domain = String(form.get("domain") || "").trim()
    const customDomain = String(form.get("customDomain") || "").trim()
    const updated: UserProfile = { ...profile, learningGoal: String(form.get("goal") || "").trim(), domain: domain === "Other" ? customDomain : domain, level: String(form.get("level")), skills: String(form.get("skills")).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12), availabilityHours: Number(form.get("hours")), targetDate: String(form.get("targetDate")) }
    const previous = data.roadmaps.find((item) => item.studentId === profile.id)
    setGeneratingRoadmap(true)
    setRoadmapSource(null)
    let source: "ai" | "simulated" = "simulated"
    let content: ReturnType<typeof roadmapContentSchema.parse> | undefined
    try {
      const response = await fetch("/api/roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: updated.learningGoal, domain: updated.domain, level: updated.level, skills: updated.skills, weeklyHours: updated.availabilityHours, targetDate: updated.targetDate }) })
      const result = await response.json()
      const parsed = roadmapContentSchema.safeParse(result.content)
      if (response.ok && result.source === "ai" && parsed.success) { source = "ai"; content = parsed.data }
    } catch { source = "simulated" }
    setData((old) => {
      const existing = old.roadmaps.find((item) => item.studentId === profile.id) || previous
      const roadmap = content ? makeRoadmapFromGenerated(updated, content, existing) : makePersonalizedRoadmap(updated, existing)
      return { ...old, users: old.users.map((user) => user.id === profile.id ? updated : user), roadmaps: [...old.roadmaps.filter((item) => item.studentId !== profile.id), roadmap] }
    })
    setRoadmapSource(source)
    setSection("roadmap")
    setMessage(source === "ai" ? "AI-generated roadmap ready. Review your milestones and recommended resources." : "A personalized demo roadmap is ready. AI is unavailable, so the built-in planner was used.")
    setGeneratingRoadmap(false)
  }

  const getRecommendations = (student: UserProfile) => data.users.filter((user) => user.role === "mentor").map((mentor) => {
    const workload = data.assignments.filter((assignment) => assignment.mentorId === mentor.id).length
    return { mentor, workload, score: getMatchBreakdown(student, mentor, workload) }
  }).sort((a, b) => b.score.total - a.score.total)

  const assignMentor = (student: UserProfile, mentorId: string, manual: boolean) => {
    const mentor = data.users.find((item) => item.id === mentorId && item.role === "mentor")
    if (!mentor) return
    setData((old) => {
      const assignments = [...old.assignments.filter((item) => item.studentId !== student.id), { studentId: student.id, mentorId, assignedAt: new Date().toISOString(), manual }]
      const cohortIds = old.cohorts.filter((cohort) => cohort.studentIds.includes(student.id)).map((cohort) => cohort.id)
      const cohorts = old.cohorts.map((cohort) => cohortIds.includes(cohort.id) ? { ...cohort, mentorIds: Array.from(new Set([...cohort.mentorIds, ...assignments.filter((item) => cohort.studentIds.includes(item.studentId)).map((item) => item.mentorId)])) } : cohort)
      return { ...old, assignments, cohorts, notifications: [notify(student.id, `${mentor.name} has been assigned as your mentor.`), ...old.notifications] }
    })
    setMessage(`${mentor.name} is now assigned to ${student.name}.`)
  }

  const addSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const studentId = String(form.get("studentId"))
    const session: MentorshipSession = { id: makeId("session"), mentorId: currentUser.id, studentId, startsAt: `${String(form.get("date"))}T${String(form.get("time"))}`, agenda: String(form.get("agenda")), status: "upcoming", actionItems: [] }
    setData((old) => ({ ...old, sessions: [...old.sessions, session], notifications: [notify(studentId, `${currentUser.name} scheduled a mentorship session for ${day(String(form.get("date")))}.`), ...old.notifications] }))
    event.currentTarget.reset()
    setMessage("Session scheduled and student notified.")
  }

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const studentId = String(form.get("studentId"))
    const student = data.users.find((user) => user.id === studentId && user.role === "mentee")
    if (!student) return
    const maxScore = Number(form.get("maxScore"))
    const resourceType = String(form.get("resourceType"))
    const rawResourceUrl = String(form.get("resourceUrl") || "").trim()
    if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000 || !["video", "quiz", "project"].includes(resourceType)) {
      setMessage("Choose a valid resource category and a maximum score between 1 and 1,000.")
      return
    }
    let resourceUrl = ""
    if (rawResourceUrl) {
      try {
        const parsed = new URL(rawResourceUrl)
        if (parsed.protocol !== "https:") throw new Error("HTTPS required")
        resourceUrl = parsed.toString()
      } catch {
        setMessage("Resource links must be valid HTTPS URLs.")
        return
      }
    }
    const task: RoadmapTask = { id: makeId("task"), title: String(form.get("title")).trim(), instructions: String(form.get("instructions")).trim(), deadline: String(form.get("deadline")), status: "todo", resourceType: resourceType as RoadmapTask["resourceType"], resourceUrl, maxScore }
    setData((old) => {
      const base = old.roadmaps.find((item) => item.studentId === studentId) || makePersonalizedRoadmap(student)
      const stageIndex = Math.max(0, base.stages.findIndex((stage) => stage.tasks.some((item) => item.status !== "approved")))
      const next = { ...base, stages: base.stages.map((stage, index) => index === stageIndex ? { ...stage, tasks: [...stage.tasks, task] } : stage), recommendedNextStep: task.title }
      return { ...old, roadmaps: [...old.roadmaps.filter((item) => item.studentId !== studentId), next], notifications: [notify(studentId, `A new task was assigned: ${task.title}.`), ...old.notifications] }
    })
    event.currentTarget.reset()
    setMessage(`Task assigned to ${student.name}.`)
  }

  const addMentee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const id = makeId("mentee")
    const cohortId = String(formData.get("cohortId") || "")
    const domain = String(formData.get("domain") || "Other")
    const enrollmentNumber = `TN${new Date().getFullYear().toString().slice(-2)}-${makeId("enrollment").slice(-6).toUpperCase()}`
    const student: UserProfile = {
      id,
      name: String(formData.get("name") || "").trim(),
      role: "mentee",
      email: `${id}@demo.techneeds.local`,
      domain,
      skills: String(formData.get("skills") || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
      availabilityHours: 4,
      weeklyCapacity: 8,
      level: "Beginner",
      learningGoal: `Explore ${domain} through a structured mentorship plan`,
      targetDate: dateInput(56),
      enrollmentNumber,
      ...(cohortId ? { cohortId } : {}),
    }
    const roadmap = makePersonalizedRoadmap(student)
    const enrollmentNotice = notify(id, `Your demo profile was added by ${currentUser.name}. Switch to the Mentee demo role to view the learner experience.`)
    const mentorNotice = notify(currentUser.id, `${student.name} joined your demo mentee roster.`)
    setData((old) => ({
      ...old,
      users: [...old.users, student],
      assignments: [...old.assignments, { studentId: id, mentorId: currentUser.id, assignedAt: new Date().toISOString(), manual: true }],
      roadmaps: [...old.roadmaps, roadmap],
      cohorts: old.cohorts.map((cohort) => cohort.id === cohortId ? { ...cohort, studentIds: [...new Set([...cohort.studentIds, id])], mentorIds: Array.from(new Set([...cohort.mentorIds, currentUser.id])) } : cohort),
      notifications: [enrollmentNotice, mentorNotice, ...old.notifications],
    }))
    form.reset()
    setMessage(`${student.name} added. Demo enrollment ID: ${enrollmentNumber}. This ID is not a login credential; password authentication is not enabled.`)
  }

  const submitTask = (event: FormEvent<HTMLFormElement>, taskId: string, studentId: string) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const description = String(form.get("description") || "").trim()
    const rawUrl = String(form.get("url") || "").trim()
    const url = rawUrl ? safeHttpsUrl(rawUrl) : ""
    if (rawUrl && !url) {
      setMessage("Submission links must be valid HTTPS URLs.")
      return
    }
    const submission = { description, url: url || "", submittedAt: new Date().toISOString() }
    updateTask(taskId, (task) => ({ ...task, status: "submitted", submission }))
    const assignment = data.assignments.find((item) => item.studentId === studentId)
    setData((old) => ({ ...old, notifications: assignment ? [notify(assignment.mentorId, `${fullName(old, studentId)} submitted “${old.roadmaps.flatMap((item) => item.stages).flatMap((stage) => stage.tasks).find((task) => task.id === taskId)?.title || "a task"}” for review.`), ...old.notifications] : old.notifications }))
    event.currentTarget.reset()
    setMessage("Submission sent to your mentor for review.")
  }

  const reviewTask = (taskId: string, studentId: string, outcome: "approved" | "revision", note: string, score: number) => {
    const reviewedTask = getAllTasks(data).find(({ task }) => task.id === taskId)?.task
    const maxScore = reviewedTask?.maxScore ?? 100
    if (outcome === "approved" && (!Number.isInteger(score) || score < 0 || score > maxScore)) {
      setMessage(`Enter a whole-number score between 0 and ${maxScore}.`)
      return
    }
    updateTask(taskId, (task) => ({ ...task, status: outcome, review: { note, outcome, reviewedAt: new Date().toISOString(), ...(outcome === "approved" ? { score } : {}) } }))
    setData((old) => ({ ...old, notifications: [notify(studentId, outcome === "approved" ? "Your project has been approved. Your roadmap progress is updated." : "Your mentor left feedback. Review it and submit an improved version."), ...old.notifications] }))
    setMessage(outcome === "approved" ? "Work approved. Student progress and program analytics are updated." : "Revision requested. The student has been notified.")
  }

  const saveManualSession = (sessionId: string, studentId: string, notes: string) => {
    if (!notes.trim()) return
    setData((old) => ({ ...old, sessions: old.sessions.map((session) => session.id === sessionId ? { ...session, status: "completed", notes: notes.trim(), rawNotes: notes.trim(), summarySource: "manual" } : session), notifications: [notify(studentId, `Session notes were added by ${currentUser.name}.`), ...old.notifications] }))
    setMessage("Session notes saved. No AI-generated details or tasks were added.")
  }

  const approveSessionSummary = (sessionId: string, studentId: string, approval: ApprovedSummary) => {
    const summary = approval.content.summaryQuotes.join(" ") || approval.rawNotes.trim()
    let createdTasks = 0
    setData((old) => {
      const student = old.users.find((user) => user.id === studentId && user.role === "mentee")
      if (!student) return old
      const existingPlan = old.roadmaps.find((roadmap) => roadmap.studentId === studentId)
      let plan = existingPlan || makePersonalizedRoadmap(student)
      const existingSessionTasks = plan.stages.flatMap((stage) => stage.tasks).filter((task) => task.sourceSessionId === sessionId).map((task) => task.title)
      const newTasks = approval.actionItems.filter((item) => item.title.trim() && !existingSessionTasks.includes(item.title))
      createdTasks = newTasks.length
      if (newTasks.length) {
        const stageIndex = Math.max(0, plan.stages.findIndex((stage) => stage.tasks.some((task) => task.status !== "approved")))
        const tasks = newTasks.map((item) => ({ id: makeId("task"), title: item.title, instructions: `Agreed follow-up from a mentoring session: ${item.title}`, deadline: item.deadline, status: "todo" as const, sourceSessionId: sessionId }))
        plan = { ...plan, stages: plan.stages.map((stage, index) => index === stageIndex ? { ...stage, tasks: [...stage.tasks, ...tasks] } : stage), recommendedNextStep: tasks[0].title }
      }
      const savedSession = old.sessions.find((session) => session.id === sessionId)
      const actionItems = Array.from(new Set([...(savedSession?.actionItems || []), ...newTasks.map((item) => item.title)]))
      const notice = notify(studentId, createdTasks ? `${currentUser.name} approved your session summary and assigned ${createdTasks} follow-up task${createdTasks === 1 ? "" : "s"}.` : `${currentUser.name} approved and saved your session summary.`)
      return { ...old, roadmaps: [...old.roadmaps.filter((roadmap) => roadmap.studentId !== studentId), plan], sessions: old.sessions.map((session) => session.id === sessionId ? { ...session, status: "completed", notes: summary, summary, rawNotes: approval.rawNotes, discussionPoints: approval.content.discussionQuotes, challenges: approval.content.challengeQuotes, nextSteps: approval.content.nextStepQuotes, actionItems, summarySource: approval.source } : session), notifications: [notice, ...old.notifications] }
    })
    setMessage(createdTasks ? `Summary approved; ${createdTasks} selected action item${createdTasks === 1 ? "" : "s"} added to the student roadmap.` : "Session summary approved and saved. No unselected action items were assigned.")
  }

  const markSessionMissed = (sessionId: string, studentId: string) => {
    setData((old) => ({ ...old, sessions: old.sessions.map((session) => session.id === sessionId ? { ...session, status: "missed" } : session), notifications: [notify(studentId, "A mentorship session was marked missed. Reach out to your mentor to schedule a supportive follow-up."), ...old.notifications] }))
    setMessage("Session marked missed; the student was notified and their support signal updated.")
  }

  const updateMentorProfile = (mentorId: string, changes: Partial<Pick<UserProfile, "domain" | "skills" | "availabilityHours" | "weeklyCapacity">>) => {
    setData((old) => ({ ...old, users: old.users.map((user) => user.id === mentorId && user.role === "mentor" ? { ...user, ...changes } : user) }))
    setMessage("Mentor profile updated. Workload and match recommendations have been recalculated.")
  }

  const toggleEventRsvp = (eventId: string) => {
    const event = data.events.find((item) => item.id === eventId)
    if (!event) return
    const alreadyJoined = data.eventRsvps[eventId]?.includes(currentUser.id) || false
    setData((old) => ({ ...old, eventRsvps: { ...old.eventRsvps, [eventId]: alreadyJoined ? (old.eventRsvps[eventId] || []).filter((id) => id !== currentUser.id) : [...(old.eventRsvps[eventId] || []), currentUser.id] } }))
    setMessage(alreadyJoined ? `You removed your RSVP for ${event.title}.` : `You’re marked as interested in ${event.title}.`)
  }

  const activeSessions = data.sessions.filter((session) => role === "mentor" ? session.mentorId === currentUser.id : role === "mentee" ? session.studentId === currentUser.id : true).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const pageTitle = role === "mentee" ? "Good to see you" : role === "mentor" ? "Your mentoring, in one place" : "Program overview"
  const nav = sections[role]

  return <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-[#e8eaf1] bg-white lg:flex"><div className="flex h-[68px] items-center border-b border-[#eef0f5] px-6"><Brand/></div><div className="px-4 pt-5"><label className="sr-only" htmlFor="demo-account">Demo account</label><select id="demo-account" className={`${inputClass} px-2.5 text-xs`} value={currentUser.id} onChange={(event) => setAccountId(event.target.value)}>{data.users.filter((user) => user.role === role).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div><nav aria-label="Main navigation" className="flex-1 px-3 pt-7"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.13em] text-[#a0a6b5]">Workspace</p>{nav.map((item) => <button key={item.id} onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${section === item.id ? "bg-[#f0efff] text-[#4f46e5]" : "text-[#697386] hover:bg-[#f7f8fc] hover:text-[#172033]"}`}><item.icon size={17}/>{item.label}{item.id === "notifications" && unreadCount > 0 && <span className="ml-auto rounded-full bg-[#fff2df] px-1.5 py-0.5 text-[10px] text-[#ba740e]">{unreadCount}</span>}</button>)}</nav><div className="border-t border-[#eef0f5] p-4"><div className="rounded-lg bg-[#f8f8ff] p-3"><p className="text-[10px] font-semibold text-[#5350a3]">Demo mode</p><p className="mt-1 text-[10px] leading-4 text-[#7b8294]">Changes are saved in this browser.</p></div><Link href="/demo" className="mt-3 flex items-center gap-2 px-2 text-xs text-[#778094]"><CircleHelp size={15}/> Switch role</Link></div></aside>
    <div className="lg:pl-[248px]"><header className="sticky top-0 z-10 flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e8eaf1] bg-white/95 px-4 backdrop-blur sm:px-8"><div><p className="text-[10px] text-[#9198a8]">{roleMeta[role].title}</p><p className="mt-0.5 text-sm font-semibold text-[#344054]">{title}</p></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor="mobile-account">Choose demo account</label><select id="mobile-account" className={`${inputClass} max-w-[150px] px-2 py-2 text-xs lg:hidden`} value={currentUser.id} onChange={(event) => setAccountId(event.target.value)}>{data.users.filter((user) => user.role === role).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><Link href="/demo" className={quietButton}>Switch role</Link><ThemeToggle/><span className="grid size-8 place-items-center rounded-full bg-[#f0efff] text-[10px] font-semibold text-[#4f46e5]">{currentUser.name.split(" ").map((part) => part[0]).join("")}</span></div></header>
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1.5 text-[10px] font-medium text-[#8b92a3]">TechNeeds IGDTUW <span className="mx-1">·</span> Sample workspace</p><h1 className="text-2xl font-semibold tracking-[-.04em] sm:text-[28px]">{pageTitle}, {currentUser.name.split(" ")[0]}<span className="text-[#4f46e5]">.</span></h1><p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#778094]">{role === "mentee" ? "Your goals, learning plan, sessions, and mentor feedback—connected in one place." : role === "mentor" ? "Support your assigned students, turn sessions into next steps, and review work." : "Manage the people, cohorts, and assignments that move your mentorship program forward."}</p></div><span className="rounded-full border border-[#e6e5ff] bg-[#fafaff] px-3 py-1.5 text-[10px] font-semibold text-[#5a52e8]">Fictional demo profiles · saved in this browser</span></div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">{nav.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`${section === item.id ? "bg-[#4f46e5] text-white" : "border border-[#e5e7ef] bg-white text-[#697386]"} shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold`}>{item.label}</button>)}</div>
    {message && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#dcefe7] bg-[#f1fbf6] px-3.5 py-2.5 text-xs text-[#27765e]" role="status">{message}<button className="font-semibold" onClick={() => setMessage("")}>Dismiss</button></div>}
    {!ready && <Notice>Loading your saved demo workspace…</Notice>}
    {ready && <>
      {section === "overview" && (role === "admin" ? <AdminOverview data={data} go={setSection}/> : <><Overview role={role} data={data} user={currentUser} roadmap={ownRoadmap} progress={progressOf(ownRoadmap)} completed={completedCount} total={allOwnTasks.length} sessions={activeSessions} mentees={menteeIds} unread={unreadCount} go={setSection}/>{role === "mentee" && <div className="mt-5"><LeaderboardCard data={data} currentUserId={currentUser.id}/></div>}</>)}
      {role === "mentee" && section === "roadmap" && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.75fr)]"><div className="flex flex-col gap-5"><Onboarding user={currentUser} roadmap={ownRoadmap} onSubmit={submitOnboarding} busy={generatingRoadmap} source={roadmapSource}/><RoadmapView roadmap={ownRoadmap} expanded={expandedStages} toggle={(id) => setExpandedStages((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id])} goTasks={() => setSection("tasks")}/></div><div className="flex flex-col gap-5"><Card title="Your mentor">{assignedMentor ? <><p className="text-sm font-semibold">{assignedMentor.name}</p><p className="mt-1 text-xs text-[#778094]">{assignedMentor.domain} · {assignedMentor.skills.join(", ")}</p></> : <Empty>No mentor assigned yet.</Empty>}<button className={`${quietButton} mt-4 w-full`} onClick={() => setSection("sessions")}>View sessions <ArrowRight size={14}/></button></Card><Card title="Your goal"><p className="text-xs leading-5 text-[#586174]">{ownRoadmap?.goal || currentUser.learningGoal || "Complete onboarding to set a learning goal."}</p><p className="mt-3 text-[10px] text-[#9299a8]">Target date: {day(ownRoadmap?.targetDate || currentUser.targetDate || "")}</p></Card></div></div>}
      {role === "mentee" && section === "tasks" && <TaskWorkspace user={currentUser} roadmap={ownRoadmap} onSubmit={submitTask}/>}
      {role === "mentee" && section === "sessions" && <StudentSessions sessions={activeSessions} data={data}/>}
      {role === "mentee" && section === "notifications" && <Notifications notifications={ownNotifications} data={data} markRead={(id) => setData((old) => ({ ...old, notifications: old.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }))}/>}
      {role === "mentor" && section === "mentees" && <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Card title="Assigned students" action={<span className="text-[10px] text-[#8b92a3]">{menteeIds.length} active</span>}>{menteeIds.length ? <div className="flex flex-col gap-3">{menteeIds.map((id) => { const student = data.users.find((item) => item.id === id)!; const roadmap = data.roadmaps.find((item) => item.studentId === id); return <div key={id} className="rounded-lg border border-[#eef0f5] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{student.name}</p><p className="mt-1 text-xs text-[#778094]">{student.domain} · {student.level || "Onboarding not complete"}</p></div><span className="text-xs font-semibold text-[#5550d6]">{progressOf(roadmap)}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef0f5]"><div className="h-full rounded-full bg-[#5a52e8]" style={{ width: `${progressOf(roadmap)}%` }}/></div><p className="mt-3 text-xs text-[#596275]">{roadmap?.goal || "Waiting for learning goal"}</p><p className="mt-1 text-[10px] text-[#9198a8]">{roadmap?.stages.flatMap((stage) => stage.tasks).filter((task) => task.status === "submitted").length || 0} submissions awaiting review</p></div>})}</div> : <Empty>No students are assigned to you yet. Ask a program admin to make an assignment.</Empty>}</Card><Card title="Assign a task" action={<span className="text-[10px] text-[#8b92a3]">Students receive a notification</span>}><TaskAssignmentForm students={data.users.filter((user) => menteeIds.includes(user.id))} onSubmit={addTask}/></Card><MentorMenteeIntake cohorts={data.cohorts} onSubmit={addMentee}/></div>}
      {role === "mentor" && section === "sessions" && <MentorSessions user={currentUser} students={data.users.filter((user) => menteeIds.includes(user.id))} sessions={activeSessions} data={data} addSession={addSession} update={(sessionId, transform) => setData((old) => ({ ...old, sessions: old.sessions.map((item) => item.id === sessionId ? transform(item) : item) }))} notify={(studentId, text) => setData((old) => ({ ...old, notifications: [notify(studentId, text), ...old.notifications] }))} saveManual={(sessionId, studentId, notes) => saveManualSession(sessionId, studentId, notes)} approveSummary={(sessionId, studentId, approval) => approveSessionSummary(sessionId, studentId, approval)} markMissed={markSessionMissed}/>}
      {role === "mentor" && section === "reviews" && <ReviewQueue data={data} review={reviewTask}/>}
      {role === "mentor" && section === "notifications" && <Notifications notifications={ownNotifications} data={data} markRead={(id) => setData((old) => ({ ...old, notifications: old.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }))}/>}
      {role === "admin" && section === "students" && <AdminStudents data={data} assign={assignMentor} recommendations={getRecommendations}/>}
      {role === "admin" && section === "mentors" && <div className="flex flex-col gap-5"><AdminMentors data={data} recommendations={getRecommendations} assign={assignMentor} saveProfile={updateMentorProfile}/><MentorOnboardingForm setData={setData}/></div>}
      {role === "admin" && section === "cohorts" && <CohortManagement data={data} setData={setData}/>}
      {section === "profile" && <LearnerProfile user={currentUser} data={data}/>}
      {section === "community" && <CommunityHub user={currentUser} data={data} onToggleRsvp={toggleEventRsvp}/>}
      {role === "admin" && section === "notifications" && <Notifications notifications={ownNotifications} data={data} markRead={(id) => setData((old) => ({ ...old, notifications: old.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }))}/>}
    </>}
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e9f0] py-5 text-[10px] text-[#969dad]"><span>Fictional sample profiles and events · No live TechNeeds member records · Saved in this browser</span><button className="text-[#6d7485] underline" onClick={() => { if (window.confirm("Reset this browser’s demo data to the original sample?")) { window.localStorage.removeItem(DEMO_STORAGE_KEY); window.location.reload() } }}>Reset demo data</button></footer></main></div></div>
}

function Overview({ role, data, user, roadmap, progress, completed, total, sessions, mentees, unread, go }: { role: Role; data: DemoData; user: UserProfile; roadmap?: Roadmap; progress: number; completed: number; total: number; sessions: MentorshipSession[]; mentees: string[]; unread: number; go: (section: string) => void }) {
  const upcoming = sessions.filter((session) => session.status === "upcoming" && new Date(session.startsAt).getTime() >= Date.now()).slice(0, 3)
  if (role === "mentee") return <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><div className="flex flex-col gap-5"><div className="grid gap-3 sm:grid-cols-3"><Stat label="Roadmap progress" value={`${progress}%`} icon={Target}/><Stat label="Approved tasks" value={`${completed} / ${total}`} icon={CheckCircle2}/><Stat label="Unread updates" value={`${unread}`} icon={Bell}/></div><Card title="Your learning journey" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("roadmap")}>Open roadmap <ArrowRight className="inline" size={13}/></button>}>{roadmap ? <><p className="text-sm font-semibold">{roadmap.goal}</p><p className="mt-1 text-xs text-[#8991a2]">{roadmap.domain} · Target {day(roadmap.targetDate)}</p><p className="mt-2 text-[11px] text-[#596275]"><span className="font-semibold">Next step:</span> {roadmap.recommendedNextStep}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef0f5]"><div className="h-full rounded-full bg-[#5a52e8]" style={{ width: `${progress}%` }}/></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{roadmap.stages.map((stage) => <div key={stage.id} className="rounded-lg bg-[#f8f8fc] p-3"><p className="text-xs font-semibold">{stage.title}</p><p className="mt-1 text-[10px] text-[#8991a2]">{stage.tasks.filter((task) => task.status === "approved").length}/{stage.tasks.length} tasks approved</p></div>)}</div></> : <div className="flex flex-col items-start gap-3"><p className="text-xs text-[#778094]">Tell us what you want to learn and we’ll build a demo roadmap with stages, milestones, and tasks.</p><button className={buttonClass} onClick={() => go("roadmap")}>Start onboarding <ArrowRight size={14}/></button></div>}</Card></div><div className="flex flex-col gap-5"><Card title="Next session">{upcoming.length ? upcoming.map((session) => <div key={session.id} className="mb-3 rounded-lg bg-[#f8f8ff] p-3 last:mb-0"><p className="text-xs font-semibold">{day(session.startsAt.slice(0, 10))} · {new Date(session.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 text-xs text-[#697386]">{session.agenda}</p><p className="mt-2 text-[10px] text-[#9299a8]">with {fullName(data, session.mentorId)}</p></div>) : <Empty>No upcoming sessions yet.</Empty>}<button className={`${quietButton} mt-3 w-full`} onClick={() => go("sessions")}>All sessions <ArrowRight size={14}/></button></Card><Card title="Recent feedback">{roadmap?.stages.flatMap((stage) => stage.tasks).filter((task) => task.review).slice(-1).map((task) => <div key={task.id}><p className="text-xs font-medium">{task.title}</p><p className="mt-2 text-xs leading-5 text-[#697386]">{task.review?.note}</p><p className="mt-2 text-[10px] text-[#9299a8]">{day(task.review?.reviewedAt || "")}</p></div>) || <Empty>Feedback will appear here after a mentor reviews your work.</Empty>}</Card></div></div>
  if (role === "mentor") { const reviews = getAllTasks(data).filter(({ task, roadmap }) => mentees.includes(roadmap.studentId) && task.status === "submitted"); return <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"><div className="flex flex-col gap-5"><div className="grid gap-3 sm:grid-cols-3"><Stat label="Assigned mentees" value={`${mentees.length}`} icon={Users}/><Stat label="Upcoming sessions" value={`${upcoming.length}`} icon={CalendarDays}/><Stat label="Reviews due" value={`${reviews.length}`} icon={FileText}/></div><Card title="Your mentees" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("mentees")}>Manage students <ArrowRight className="inline" size={13}/></button>}>{mentees.length ? <div className="divide-y divide-[#f0f1f5]">{mentees.map((id) => { const student = data.users.find((item) => item.id === id)!; const plan = data.roadmaps.find((item) => item.studentId === id); return <div key={id} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div><p className="text-xs font-semibold">{student.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{student.domain} · {plan?.goal || "Onboarding pending"}</p></div><span className="text-xs font-semibold text-[#5852d8]">{progressOf(plan)}%</span></div>})}</div> : <Empty>No mentees assigned. Admins can assign students from their workspace.</Empty>}</Card></div><Card title="This week’s sessions" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("sessions")}>Open calendar <ArrowRight className="inline" size={13}/></button>}>{upcoming.length ? upcoming.map((session) => <div key={session.id} className="mb-3 rounded-lg border border-[#eef0f5] p-3 last:mb-0"><div className="flex justify-between gap-2"><p className="text-xs font-semibold">{fullName(data, session.studentId)}</p><p className="text-[10px] text-[#777f91]">{day(session.startsAt.slice(0, 10))}</p></div><p className="mt-1 text-xs text-[#697386]">{session.agenda}</p></div>) : <Empty>No upcoming sessions. Schedule one with an assigned mentee.</Empty>}<button className={`${buttonClass} mt-4`} onClick={() => go("sessions")}><Plus size={14}/> Schedule session</button></Card></div> }
  const students = data.users.filter((item) => item.role === "mentee")
  const tasks = getAllTasks(data)
  const approved = tasks.filter(({ task }) => task.status === "approved").length
  return <div className="flex flex-col gap-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Students" value={`${students.length}`} icon={Users}/><Stat label="Mentors" value={`${data.users.filter((item) => item.role === "mentor").length}`} icon={Sparkles}/><Stat label="Cohorts" value={`${data.cohorts.length}`} icon={BookOpen}/><Stat label="Approved work" value={`${tasks.length ? Math.round(approved * 100 / tasks.length) : 0}%`} icon={Activity}/></div><div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"><Card title="Student progress" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("students")}>Manage students <ArrowRight className="inline" size={13}/></button>}>{students.map((student) => { const plan = data.roadmaps.find((item) => item.studentId === student.id); const mentor = data.users.find((item) => data.assignments.some((assignment) => assignment.studentId === student.id && assignment.mentorId === item.id)); return <div key={student.id} className="border-b border-[#f0f1f5] py-3 last:border-b-0"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold">{student.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{student.domain} · {mentor ? `Mentor: ${mentor.name}` : "Unassigned"}</p></div><span className="text-xs font-semibold text-[#5a52e8]">{progressOf(plan)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef0f5]"><div className="h-full rounded-full bg-[#5a52e8]" style={{ width: `${progressOf(plan)}%` }}/></div></div>})}</Card><Card title="Needs attention"><p className="text-2xl font-semibold">{tasks.filter(({ task }) => task.status === "submitted").length}</p><p className="mt-1 text-xs text-[#778094]">submissions awaiting review</p><button className={`${buttonClass} mt-4`} onClick={() => go("mentors")}>Manage mentor assignments <ArrowRight size={14}/></button><div className="mt-5 rounded-lg bg-[#f8f8ff] p-3 text-xs leading-5 text-[#67648f]">Analytics use shared demo records. Approving a student submission updates their roadmap progress and this overview.</div></Card></div></div>
}

function AdminOverview({ data, go }: { data: DemoData; go: (section: string) => void }) {
  const students = data.users.filter((user) => user.role === "mentee")
  const mentors = data.users.filter((user) => user.role === "mentor")
  const tasks = getAllTasks(data)
  const approved = tasks.filter(({ task }) => task.status === "approved").length
  const pending = tasks.filter(({ task }) => task.status === "submitted").length
  const attention = getStudentAttention(data)
  const cohorts = getCohortAnalytics(data)
  const rsvps = Object.values(data.eventRsvps).reduce((sum, ids) => sum + ids.length, 0)
  return <div className="flex flex-col gap-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Mentees" value={`${students.length}`} icon={Users}/><Stat label="Active mentor pairings" value={`${data.assignments.length}`} icon={Sparkles}/><Stat label="Task completion" value={`${tasks.length ? Math.round(approved * 100 / tasks.length) : 0}%`} icon={CheckCircle2}/><Stat label="Support check-ins" value={`${attention.length}`} icon={Activity}/></div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card title="Cohort progress" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("cohorts")}>Manage cohorts <ArrowRight className="inline" size={13}/></button>}>
        <p className="mb-4 text-[10px] leading-4 text-[#8991a2]">Average approved-task progress across enrolled students. Values are calculated from the demo roadmaps.</p>
        {cohorts.length ? <div className="flex flex-col gap-4">{cohorts.map(({ cohort, students: count, progress, approved: done, tasks: total, mentorAssignments, eventRsvps }) => <div key={cohort.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{cohort.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{count} students · {mentorAssignments} mentor pairings · {eventRsvps} event RSVPs</p></div><span className="text-xs font-semibold text-[#5a52e8]">{progress}%</span></div>
          <div role="progressbar" aria-label={`${cohort.name} average task completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef0f5]"><div className="h-full rounded-full bg-[#5a52e8] transition-all" style={{ width: `${progress}%` }}/></div>
          <p className="mt-1 text-[10px] text-[#9299a8]">{done} of {total} tasks approved{cohort.demoOnly ? " · demo learning track" : ""}</p>
        </div>)}</div> : <Empty>Create a cohort to see program progress.</Empty>}
      </Card>
      <Card title="Program activity" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("community")}>View community <ArrowRight className="inline" size={13}/></button>}>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-[#f8f8fc] p-3"><p className="text-[10px] text-[#8991a2]">Tasks awaiting review</p><p className="mt-1 text-xl font-semibold">{pending}</p></div><div className="rounded-lg bg-[#f8f8fc] p-3"><p className="text-[10px] text-[#8991a2]">Community RSVPs</p><p className="mt-1 text-xl font-semibold">{rsvps}</p></div><div className="rounded-lg bg-[#f8f8fc] p-3"><p className="text-[10px] text-[#8991a2]">Mentors</p><p className="mt-1 text-xl font-semibold">{mentors.length}</p></div><div className="rounded-lg bg-[#f8f8fc] p-3"><p className="text-[10px] text-[#8991a2]">Upcoming sessions</p><p className="mt-1 text-xl font-semibold">{data.sessions.filter((session) => session.status === "upcoming" && new Date(session.startsAt).getTime() >= Date.now()).length}</p></div></div>
        <div className="mt-4 rounded-lg border border-[#e7e9f1] bg-white p-3"><p className="text-[10px] font-semibold text-[#344054]">How check-ins are flagged</p><p className="mt-1 text-[10px] leading-4 text-[#778094]">Transparent rules look for overdue tasks, missed sessions, two weeks without approved progress, and 21 days without recorded activity. These are support prompts, not AI predictions.</p></div>
      </Card>
    </div>
    <Card title="Students to check in" action={<button className="text-xs font-semibold text-[#5a52e8]" onClick={() => go("students")}>Open student management <ArrowRight className="inline" size={13}/></button>}>
      {attention.length ? <div className="flex flex-col divide-y divide-[#f0f1f5]">{attention.map(({ student, severity, reasons, lastActivity, recommendedAction }) => <div key={student.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[1.1fr_1.3fr_1fr_1.3fr] md:items-center"><div><p className="text-xs font-semibold">{student.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{student.domain} · {student.cohortId ? data.cohorts.find((cohort) => cohort.id === student.cohortId)?.name || "No cohort" : "No cohort"}</p></div><div className="flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${severity === "high" ? "bg-[#fff1ed] text-[#b9483c]" : "bg-[#fff4e8] text-[#a76b17]"}`}>{severity === "high" ? "High attention" : "Check in"}</span>{reasons.map((reason) => <span key={reason} className="text-[10px] text-[#697386]">{reason}</span>)}</div><p className="text-[10px] text-[#8991a2]">Last activity: {lastActivity}</p><p className="text-[10px] leading-4 text-[#596275]"><span className="font-semibold">Suggested next step:</span> {recommendedAction}</p></div>)}</div> : <Empty>No students currently meet the check-in rules. This is recalculated from current records.</Empty>}
    </Card>
  </div>
}

function ResourceLinks({ ids }: { ids: string[] }) {
  const resources = ids.map((id) => LEARNING_RESOURCES.find((resource) => resource.id === id)).filter((resource): resource is (typeof LEARNING_RESOURCES)[number] => Boolean(resource))
  if (!resources.length) return null
  return <div className="flex flex-wrap gap-2 pt-3">{resources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e7ef] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#5148d7] hover:bg-[#f8f8fc]">{resource.provider}<span aria-hidden="true">↗</span></a>)}</div>
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Target }) { return <div className="rounded-xl border border-[#e7e9f1] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-[#7d8597]">{label}</p><Icon size={15} className="text-[#5a52e8]"/></div><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div> }

function Onboarding({ user, roadmap, onSubmit, busy, source }: { user: UserProfile; roadmap?: Roadmap; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; source: "ai" | "simulated" | null }) {
  const tracks = ["Web Development", "DSA in C/C++", "AI/ML"]
  const [domain, setDomain] = useState(tracks.includes(user.domain) ? user.domain : "Other")
  return <Card title={roadmap ? "Learning profile" : "Start your learning journey"} action={<span className="text-[10px] text-[#9299a8]">{roadmap ? "Edit profile or regenerate" : "About 2 minutes"}</span>}><form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}><Field label="Learning goal"><input className={inputClass} name="goal" required maxLength={220} defaultValue={user.learningGoal} placeholder="What would you like to achieve?"/></Field><Field label="Technical learning track"><select className={inputClass} name="domain" value={domain} onChange={(event) => setDomain(event.target.value)}><option>Web Development</option><option>DSA in C/C++</option><option>AI/ML</option><option>Other</option></select></Field>{domain === "Other" && <Field label="Other technical domain"><input className={inputClass} name="customDomain" required maxLength={80} defaultValue={user.domain === "Other" ? "" : user.domain} placeholder="e.g. Cybersecurity"/></Field>}<Field label="Current skill level"><select className={inputClass} name="level" defaultValue={user.level || "Beginner"}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field><Field label="Existing skills (comma-separated)"><input className={inputClass} name="skills" maxLength={600} defaultValue={user.skills.join(", ")} placeholder="C++, arrays, problem solving"/></Field><Field label="Hours available each week"><input className={inputClass} name="hours" type="number" min="1" max="40" required defaultValue={user.availabilityHours || 4}/></Field><Field label="Target completion date"><input className={inputClass} name="targetDate" type="date" min={dateInput(1)} required defaultValue={user.targetDate || dateInput(56)}/></Field><div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className={buttonClass} type="submit" disabled={busy}>{busy ? "Generating roadmap…" : roadmap ? "Regenerate roadmap" : "Generate my roadmap"}<Sparkles size={14}/></button><span className="text-[10px] text-[#9299a8]">{source === "ai" ? "AI-generated via Vercel AI Gateway" : source === "simulated" ? "Simulated, personalized fallback" : "AI-assisted when available · demo fallback included"}</span></div><p className="text-[10px] leading-4 text-[#8985a7] sm:col-span-2">Your goal, selected track, skills, weekly hours, and target date are sent for roadmap generation. Avoid including private personal details.</p></form></Card>
}

function RoadmapView({ roadmap, expanded, toggle, goTasks }: { roadmap?: Roadmap; expanded: string[]; toggle: (id: string) => void; goTasks: () => void }) {
  if (!roadmap) return <Card title="Your roadmap"><Empty>Complete the learning profile above to create your first roadmap.</Empty></Card>
  const tasks = roadmap.stages.flatMap((stage) => stage.tasks)
  const progress = progressOf(roadmap)
  return <Card title="Personalized roadmap" action={<span className="text-xs font-semibold text-[#5550d6]">{progress}% complete</span>}><div className="mb-4 rounded-lg bg-[#f8f8ff] p-3.5"><p className="text-xs font-semibold">{roadmap.goal}</p><p className="mt-1 text-[10px] text-[#828b9c]">{roadmap.domain} · target {day(roadmap.targetDate)} · {tasks.length} tasks</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e8f2]"><div className="h-full rounded-full bg-[#5a52e8] transition-all" style={{ width: `${progress}%` }}/></div></div><div className="flex flex-col gap-2">{roadmap.stages.map((stage, index) => { const isOpen = expanded.includes(stage.id); const done = stage.tasks.filter((task) => task.status === "approved").length; return <div key={stage.id} className="rounded-lg border border-[#eef0f5]"><button className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={isOpen} onClick={() => toggle(stage.id)}><span className={`grid size-8 shrink-0 place-items-center rounded-full ${done === stage.tasks.length ? "bg-[#e8f8f2] text-[#14836d]" : "bg-[#f1f0ff] text-[#5a52e8]"}`}>{done === stage.tasks.length ? <Check size={14}/> : <span className="text-[10px] font-semibold">0{index + 1}</span>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{stage.title}</span><span className="mt-0.5 block text-[10px] text-[#8991a2]">Milestone: {stage.milestone}</span></span><span className="text-[10px] text-[#8991a2]">{done}/{stage.tasks.length}</span><ChevronDown size={15} className={`text-[#8991a2] transition ${isOpen ? "rotate-180" : ""}`}/></button>{isOpen && <div className="border-t border-[#f0f1f5] px-3 pb-3"><ResourceLinks ids={stage.resources}/>{stage.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 border-b border-[#f2f3f7] py-3 last:border-b-0"><span className={`grid size-6 place-items-center rounded-full ${task.status === "approved" ? "bg-[#e8f8f2] text-[#14836d]" : task.status === "submitted" ? "bg-[#fff3e3] text-[#a76b17]" : "bg-[#f3f4f7] text-[#8d95a5]"}`}>{task.status === "approved" ? <Check size={12}/> : <ClipboardList size={12}/>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{task.title}</span><span className="mt-0.5 block text-[10px] text-[#9299a8]">Due {day(task.deadline)} · {task.status}</span></span><button className={quietButton} onClick={goTasks}>Open task</button></div>)}</div>}</div>})}</div></Card>
}

function TaskWorkspace({ user, roadmap, onSubmit }: { user: UserProfile; roadmap?: Roadmap; onSubmit: (event: FormEvent<HTMLFormElement>, taskId: string, studentId: string) => void }) {
  if (!roadmap) return <Card title="Tasks and submissions"><Empty>Complete onboarding to see your tasks.</Empty></Card>
  return <div className="flex flex-col gap-4">{roadmap.stages.flatMap((stage) => stage.tasks.map((task) => ({ stage, task }))).map(({ stage, task }) => <Card key={task.id} title={task.title} action={<span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${task.status === "approved" ? "bg-[#e9faf5] text-[#168b75]" : task.status === "submitted" ? "bg-[#fff4e8] text-[#b97819]" : task.status === "revision" ? "bg-[#fff1ed] text-[#c66054]" : "bg-[#f1f2f6] text-[#697386]"}`}>{task.status}</span>}><p className="text-[10px] font-medium text-[#7d8597]">{stage.title} · {task.resourceType || "learning task"} · Due {day(task.deadline)} · Up to {task.maxScore ?? 100} points</p><p className="mt-2 max-w-3xl text-xs leading-5 text-[#596275]">{task.instructions}</p>{safeHttpsUrl(task.resourceUrl) && <a className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#5148d7] underline" href={safeHttpsUrl(task.resourceUrl)!} target="_blank" rel="noreferrer">Open assigned resource <ArrowRight size={12}/></a>}{task.review && <div className="mt-3 rounded-lg bg-[#f8f8ff] p-3 text-xs leading-5 text-[#595583]"><span className="font-semibold">Mentor feedback:</span> {task.review.note}</div>}{task.status === "approved" ? <p className="mt-3 text-xs font-medium text-[#168b75]">Approved · {task.review?.score ?? 0} / {task.maxScore ?? 100} points · roadmap progress updated.</p> : <form className="mt-4 grid gap-3 rounded-lg border border-[#eef0f5] p-3 sm:grid-cols-2" onSubmit={(event) => onSubmit(event, task.id, user.id)}><Field label={task.resourceType === "quiz" ? "Quiz response" : task.resourceType === "video" ? "What you learned" : "Project summary"}><textarea className={`${inputClass} min-h-20 resize-y`} name="description" required defaultValue={task.submission?.description} placeholder="Describe what you did and what you learned."/></Field><div className="flex flex-col gap-3"><Field label={task.resourceType === "project" ? "Project or GitHub URL" : "Optional submission link"}><input className={inputClass} name="url" type="url" defaultValue={task.submission?.url} placeholder="https://github.com/…"/></Field><button className={`${buttonClass} self-start`} type="submit">{task.status === "submitted" ? "Update submission" : "Submit for review"}<ArrowRight size={14}/></button></div></form>}</Card>)}</div>
}

function StudentSessions({ sessions, data }: { sessions: MentorshipSession[]; data: DemoData }) {
  const upcoming = sessions.filter((session) => session.status === "upcoming" && new Date(session.startsAt).getTime() >= Date.now())
  const completed = sessions.filter((session) => session.status === "completed")
  const missed = sessions.filter((session) => session.status === "missed" || (session.status === "upcoming" && new Date(session.startsAt).getTime() < Date.now()))
  return <div className="grid gap-5 xl:grid-cols-2">
    <div className="flex flex-col gap-5">
      <Card title="Upcoming sessions">{upcoming.length ? upcoming.map((session) => <div key={session.id} className="mb-3 rounded-lg border border-[#eef0f5] p-4 last:mb-0"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-semibold">{day(session.startsAt.slice(0, 10))} · {new Date(session.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><span className="text-[10px] text-[#5a52e8]">with {fullName(data, session.mentorId)}</span></div><p className="mt-3 text-xs text-[#596275]"><strong>Agenda:</strong> {session.agenda}</p></div>) : <Empty>No sessions are scheduled yet.</Empty>}<p className="mt-4 text-[10px] leading-4 text-[#9299a8]">Need a different time? Bring it up with your mentor in your next session.</p></Card>
      {missed.length > 0 && <Card title="Sessions to follow up"><div className="flex flex-col gap-3">{missed.map((session) => <div key={session.id} className="rounded-lg border border-[#f0ddc0] bg-[#fffaf2] p-3"><p className="text-xs font-semibold">{day(session.startsAt.slice(0, 10))} · {fullName(data, session.mentorId)}</p><p className="mt-1 text-xs text-[#697386]">{session.agenda}</p><p className="mt-2 text-[10px] text-[#94681f]">Ask your mentor to find a new time that works.</p></div>)}</div></Card>}
    </div>
    <Card title="Session history">{completed.length ? completed.map((session) => {
      const taskDeadlines = new Map(getAllTasks(data).filter(({ task }) => task.sourceSessionId === session.id).map(({ task }) => [task.title, task.deadline]))
      return <details key={session.id} className="mb-3 rounded-lg border border-[#eef0f5] p-3 last:mb-0"><summary className="cursor-pointer text-xs font-semibold">{day(session.startsAt.slice(0, 10))} · {fullName(data, session.mentorId)}<span className="ml-2 rounded-full bg-[#f0efff] px-2 py-0.5 text-[9px] font-medium text-[#5148d7]">{session.summarySource === "ai" ? "AI-assisted · mentor approved" : session.summarySource === "simulated" ? "Simulated · mentor approved" : "Mentor notes"}</span></summary><p className="mt-3 text-xs leading-5 text-[#596275]">{session.summary || session.notes || "No summary was added."}</p>{session.discussionPoints?.length ? <SessionList title="Discussed" items={session.discussionPoints}/> : null}{session.challenges?.length ? <SessionList title="Challenges mentioned" items={session.challenges}/> : null}{session.nextSteps?.length ? <SessionList title="Next steps mentioned" items={session.nextSteps}/> : null}{session.actionItems.length > 0 && <><p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#8991a2]">Approved action items</p><ul className="mt-1 list-inside list-disc text-xs leading-6 text-[#596275]">{session.actionItems.map((item) => <li key={item}>{item}{taskDeadlines.has(item) ? ` · Due ${day(taskDeadlines.get(item)!)}` : ""}</li>)}</ul></>}</details>
    }) : <Empty>Approved session summaries and action items will appear here.</Empty>}</Card>
  </div>
}

function SessionList({ title, items }: { title: string; items: string[] }) { return <div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#8991a2]">{title}</p><ul className="mt-1 list-inside list-disc text-xs leading-5 text-[#596275]">{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></div> }

function TaskAssignmentForm({ students, onSubmit }: { students: UserProfile[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="flex flex-col gap-3" onSubmit={onSubmit}>
    <Field label="Student"><select className={inputClass} name="studentId" required>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></Field>
    <Field label="Resource title"><input className={inputClass} name="title" required maxLength={100} placeholder="e.g. Share your first prototype"/></Field>
    <Field label="Category"><select className={inputClass} name="resourceType" required><option value="video">Video module</option><option value="quiz">Quiz or assessment</option><option value="project">Project deliverable</option></select></Field>
    <Field label="Resource link (optional, HTTPS)"><input className={inputClass} name="resourceUrl" type="url" pattern="https://.*" placeholder="https://…"/></Field>
    <Field label="Instructions"><textarea className={`${inputClass} min-h-20`} name="instructions" required maxLength={1200} placeholder="Describe what the student should complete."/></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Deadline"><input className={inputClass} name="deadline" type="date" required defaultValue={dateInput(7)}/></Field><Field label="Maximum score"><input className={inputClass} name="maxScore" type="number" min={1} max={1000} step={1} required defaultValue={100}/></Field></div>
    <button className={`${buttonClass} self-start`} type="submit"><Plus size={14}/> Publish resource</button>
  </form>
}

function MentorSessions({ user, students, sessions, data, addSession, update, notify, saveManual, approveSummary, markMissed }: { user: UserProfile; students: UserProfile[]; sessions: MentorshipSession[]; data: DemoData; addSession: (event: FormEvent<HTMLFormElement>) => void; update: (id: string, transform: (session: MentorshipSession) => MentorshipSession) => void; notify: (studentId: string, message: string) => void; saveManual: (sessionId: string, studentId: string, notes: string) => void; approveSummary: (sessionId: string, studentId: string, approval: ApprovedSummary) => void; markMissed: (sessionId: string, studentId: string) => void }) {
  const [notes, setNotes] = useState<Record<string, string>>({})

  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <Card title="Schedule a session">
      <form className="flex flex-col gap-3" onSubmit={addSession}>
        <Field label="Mentee"><select className={inputClass} name="studentId" required>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></Field>
        <Field label="Date"><input className={inputClass} type="date" name="date" required defaultValue={dateInput(3)}/></Field>
        <Field label="Time"><input className={inputClass} type="time" name="time" required defaultValue="10:00"/></Field>
        <Field label="Agenda"><textarea className={`${inputClass} min-h-24`} name="agenda" required placeholder="What will you work on together?"/></Field>
        <button className={buttonClass} type="submit"><CalendarDays size={14}/> Schedule and notify</button>
      </form>
    </Card>
    <Card title="Session notes and history" action={<span className="text-[10px] text-[#8991a2]">AI drafts require mentor approval</span>}>
      {sessions.length ? sessions.map((session) => <article key={session.id} className="mb-4 rounded-lg border border-[#eef0f5] p-4 last:mb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs font-semibold">{fullName(data, session.studentId)} · {day(session.startsAt.slice(0, 10))}</p><p className="mt-1 text-xs text-[#697386]">{session.agenda}</p></div>
          <span className="rounded-full bg-[#f1f2f6] px-2 py-1 text-[10px] text-[#697386]">{session.status}</span>
        </div>
        {session.status === "upcoming" && <Field label="Agenda update"><textarea className={`${inputClass} mt-3 min-h-16`} value={session.agenda} onChange={(event) => update(session.id, (old) => ({ ...old, agenda: event.target.value }))}/></Field>}
        {session.status !== "missed" && <SessionInsightsEditor
          session={session}
          notes={notes[session.id] ?? session.rawNotes ?? session.notes ?? ""}
          onNotesChange={(value) => setNotes((old) => ({ ...old, [session.id]: value }))}
          onSaveManual={(value) => saveManual(session.id, session.studentId, value)}
          onApprove={(approval) => approveSummary(session.id, session.studentId, approval)}
          onMarkMissed={() => markMissed(session.id, session.studentId)}
        />}
        {session.actionItems.length > 0 && <ul className="mt-3 list-inside list-disc rounded-lg bg-[#f8f8ff] p-3 text-xs leading-5 text-[#596275]">{session.actionItems.map((item) => <li key={item}>{item}</li>)}</ul>}
      </article>) : <Empty>No sessions yet. Schedule one with an assigned mentee.</Empty>}
    </Card>
  </div>
}

function ReviewQueue({ data, review }: { data: DemoData; review: (taskId: string, studentId: string, outcome: "approved" | "revision", note: string, score: number) => void }) {
  const submissions = getAllTasks(data).filter(({ task }) => task.status === "submitted" || task.status === "revision")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, string>>({})

  return <Card title="Submission review queue" action={<span className="text-[10px] text-[#8991a2]">{submissions.filter(({ task }) => task.status === "submitted").length} awaiting review</span>}>
    {submissions.length ? <div className="flex flex-col gap-4">{submissions.map(({ roadmap, stage, task }) => {
      const maxScore = task.maxScore ?? 100
      const score = scores[task.id] ?? String(maxScore)
      return <article key={task.id} className="rounded-lg border border-[#e9ebf1] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-[10px] text-[#8991a2]">{fullName(data, roadmap.studentId)} · {stage.title} · submitted {day(task.submission?.submittedAt || "")}</p></div><span className="rounded-full bg-[#fff4e8] px-2 py-1 text-[10px] text-[#b97819]">{task.status === "revision" ? "Resubmitted" : "Needs review"}</span></div>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#596275]">{task.submission?.description}</p>
        {safeHttpsUrl(task.submission?.url) && <a className="mt-2 inline-block text-xs font-medium text-[#5148d7] underline" href={safeHttpsUrl(task.submission?.url)!} target="_blank" rel="noreferrer">Open submission link <ArrowRight className="inline" size={12}/></a>}
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px_auto_auto]">
          <label className="sr-only" htmlFor={`review-${task.id}`}>Feedback for {task.title}</label>
          <textarea id={`review-${task.id}`} className={`${inputClass} min-h-16`} value={notes[task.id] || ""} onChange={(event) => setNotes((old) => ({ ...old, [task.id]: event.target.value }))} placeholder="Share specific, constructive feedback"/>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275]">Score (max {maxScore})<input aria-label={`Score for ${task.title}`} className={`${inputClass} py-2`} type="number" min={0} max={maxScore} step={1} value={score} onChange={(event) => setScores((old) => ({ ...old, [task.id]: event.target.value }))}/></label>
          <button className={quietButton} onClick={() => { if (notes[task.id]?.trim()) review(task.id, roadmap.studentId, "revision", notes[task.id], Number(score)) }}>Request improvements</button>
          <button className={buttonClass} onClick={() => { if (notes[task.id]?.trim()) review(task.id, roadmap.studentId, "approved", notes[task.id], Number(score)) }}><Check size={14}/> Approve work</button>
        </div>
      </article>
    })}</div> : <Empty>No submissions waiting. Students can submit tasks from their Tasks & submissions workspace.</Empty>}
  </Card>
}

function Notifications({ notifications, data, markRead }: { notifications: AppNotification[]; data: DemoData; markRead: (id: string) => void }) { return <Card title="In-app notifications" action={<span className="text-[10px] text-[#8991a2]">Shared across the demo workspace</span>}>{notifications.length ? <div className="divide-y divide-[#f0f1f5]">{notifications.map((item) => <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-[#d9dce5]" : "bg-[#5a52e8]"}`}/><div className="min-w-0 flex-1"><p className={`text-xs leading-5 ${item.read ? "text-[#737c8e]" : "font-medium text-[#333d52]"}`}>{item.message}</p><p className="mt-1 text-[10px] text-[#a0a6b5]">{day(item.createdAt.slice(0, 10))}{data.users.find((user) => user.id === item.userId) ? ` · ${fullName(data, item.userId)}` : ""}</p></div>{!item.read && <button className="text-[10px] font-semibold text-[#5550d6]" onClick={() => markRead(item.id)}>Mark read</button>}</div>)}</div> : <Empty>You’re all caught up.</Empty>}</Card> }

function AdminStudents({ data, assign, recommendations }: { data: DemoData; assign: (student: UserProfile, mentorId: string, manual: boolean) => void; recommendations: (student: UserProfile) => { mentor: UserProfile; workload: number; score: ReturnType<typeof getMatchBreakdown> }[] }) { const [choice, setChoice] = useState<Record<string, string>>({}); const [search, setSearch] = useState(""); const students = data.users.filter((user) => user.role === "mentee" && `${user.name} ${user.domain}`.toLowerCase().includes(search.toLowerCase())); return <Card title="Student management" action={<input aria-label="Filter students" className={`${inputClass} max-w-56 py-2 text-xs`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter students"/>}><div className="flex flex-col gap-3">{students.map((student) => { const assigned = data.assignments.find((item) => item.studentId === student.id); const picks = recommendations(student); const current = choice[student.id] || assigned?.mentorId || picks[0]?.mentor.id || ""; const plan = data.roadmaps.find((item) => item.studentId === student.id); return <div key={student.id} className="grid gap-3 rounded-lg border border-[#eef0f5] p-4 lg:grid-cols-[1fr_1.2fr]"><div className="text-left"><p className="text-sm font-semibold">{student.name}</p><p className="mt-1 text-xs text-[#8991a2]">{student.domain} · {student.level || "Onboarding pending"}</p><p className="mt-2 text-[10px] text-[#697386]">{plan?.goal || "No roadmap yet"} · {progressOf(plan)}% complete</p></div><div className="flex flex-col gap-2"><label className="text-[10px] font-semibold uppercase tracking-wide text-[#8b92a3]">Mentor allocation</label><div className="flex flex-wrap gap-2"><select className={`${inputClass} min-w-40 flex-1 py-2 text-xs`} value={current} onChange={(event) => setChoice((old) => ({ ...old, [student.id]: event.target.value }))}>{picks.map(({ mentor, score }) => <option key={mentor.id} value={mentor.id}>{mentor.name} · {score.total}% match</option>)}</select><button className={buttonClass} onClick={() => assign(student, current, true)}>{assigned?.mentorId === current ? "Save override" : "Assign mentor"}</button></div>{picks[0] && <p className="text-[10px] leading-4 text-[#828b9c]">Top match: {picks[0].mentor.name} ({picks[0].score.total}%). Skill {picks[0].score.skill}% × 40 · goal {picks[0].score.goal}% × 30 · availability {picks[0].score.availability}% × 20 · capacity {picks[0].score.capacity}% × 10.</p>}</div></div>})}{!students.length && <Empty>No students match that filter.</Empty>}</div></Card> }

function AdminMentors({ data, recommendations, assign }: { data: DemoData; recommendations: (student: UserProfile) => { mentor: UserProfile; workload: number; score: ReturnType<typeof getMatchBreakdown> }[]; assign: (student: UserProfile, mentorId: string, manual: boolean) => void; saveProfile: (mentorId: string, changes: Partial<Pick<UserProfile, "domain" | "skills" | "availabilityHours" | "weeklyCapacity">>) => void }) { const mentors = data.users.filter((user) => user.role === "mentor"); const students = data.users.filter((user) => user.role === "mentee"); const [selectedStudent, setSelectedStudent] = useState(students[0]?.id || ""); const student = students.find((item) => item.id === selectedStudent); return <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card title="Mentor availability and workload">{mentors.map((mentor) => { const assigned = data.assignments.filter((item) => item.mentorId === mentor.id).length; const capacity = mentor.weeklyCapacity ? Math.min(100, Math.round(assigned * 100 / mentor.weeklyCapacity)) : 0; return <div key={mentor.id} className="border-b border-[#f0f1f5] py-3 last:border-0"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold">{mentor.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{mentor.domain} · {mentor.skills.join(", ")}</p></div><p className="text-[10px] text-[#697386]">{mentor.availabilityHours}h available / week</p></div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef0f5]"><div className="h-full rounded-full bg-[#5a52e8]" style={{ width: `${capacity}%` }}/></div><span className="text-[10px] text-[#8991a2]">{assigned}/{mentor.weeklyCapacity} students</span></div></div>})}</Card><Card title="Explainable recommendations"><Field label="Find the best mentor for"><select className={inputClass} value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)}>{students.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.domain}</option>)}</select></Field>{student && <div className="mt-4 flex flex-col gap-2">{recommendations(student).map(({ mentor, workload, score }) => <div key={mentor.id} className="rounded-lg border border-[#eef0f5] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{mentor.name}</p><span className="rounded-full bg-[#f0efff] px-2 py-1 text-[10px] font-semibold text-[#5148d7]">{score.total}%</span></div><p className="mt-1 text-[10px] text-[#8991a2]">{mentor.domain} · {workload}/{mentor.weeklyCapacity} current students</p><p className="mt-2 text-[10px] leading-4 text-[#697386]">Skill compatibility {score.skill}% (40%) · goal alignment {score.goal}% (30%) · availability {score.availability}% (20%) · capacity {score.capacity}% (10%)</p><button className={`${quietButton} mt-2`} onClick={() => assign(student, mentor.id, false)}>Assign recommendation</button></div>)}</div>}</Card></div> }

function AdminCohorts({ data, setData }: { data: DemoData; setData: (updater: (old: DemoData) => DemoData) => void }) { const [studentName, setStudentName] = useState(""); const [domain, setDomain] = useState(""); const [studentCohort, setStudentCohort] = useState(data.cohorts[0]?.id || ""); const [cohortName, setCohortName] = useState(""); const [mentorName, setMentorName] = useState(""); const [mentorDomain, setMentorDomain] = useState(""); return <div className="grid gap-5 xl:grid-cols-2"><Card title="Cohorts"><form className="mb-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); if (!cohortName.trim()) return; setData((old) => ({ ...old, cohorts: [...old.cohorts, { id: makeId("cohort"), name: cohortName.trim(), track: "Other", startDate: dateInput(0), studentIds: [], mentorIds: [] }] })); setCohortName("") }}><label className="sr-only" htmlFor="new-cohort">Cohort name</label><input id="new-cohort" className={`${inputClass} min-w-44 flex-1`} value={cohortName} onChange={(event) => setCohortName(event.target.value)} placeholder="New cohort name" required/><button className={buttonClass}><Plus size={14}/> Create cohort</button></form>{data.cohorts.map((cohort) => <div key={cohort.id} className="mb-2 flex items-center justify-between rounded-lg border border-[#eef0f5] p-3"><div><p className="text-xs font-semibold">{cohort.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">Started {day(cohort.startDate)} · {cohort.studentIds.length} added students</p></div><span className="text-xs text-[#5a52e8]">{data.users.filter((user) => user.cohortId === cohort.id).length} students</span></div>)}</Card><div className="flex flex-col gap-5"><Card title="Add a student"><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const cohort = data.cohorts.find((item) => item.id === studentCohort); const student: UserProfile = { id: makeId("student"), name: studentName.trim(), email: `${makeId("student")}@example.com`, role: "mentee", domain: domain.trim(), skills: [], availabilityHours: 4, weeklyCapacity: 8, cohortId: cohort?.id }; setData((old) => ({ ...old, users: [...old.users, student], cohorts: old.cohorts.map((item) => item.id === cohort?.id ? { ...item, studentIds: [...item.studentIds, student.id] } : item), notifications: [...old.notifications, { id: makeId("notice"), userId: "nidhi", message: `${student.name} was added to the program.`, createdAt: new Date().toISOString(), read: false }] })); setStudentName(""); setDomain("") }}><Field label="Student name"><input className={inputClass} required value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Full name"/></Field><Field label="Learning domain"><input className={inputClass} required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="e.g. Product design"/></Field><Field label="Cohort"><select className={inputClass} value={studentCohort} onChange={(event) => setStudentCohort(event.target.value)}><option value="">No cohort</option>{data.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></Field><button className={`${buttonClass} sm:col-span-2`}><Plus size={14}/> Add student</button></form><p className="mt-3 text-[10px] text-[#9299a8]">New students can sign in through the Mentee demo role and complete onboarding.</p></Card><Card title="Add a mentor"><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const mentor: UserProfile = { id: makeId("mentor"), name: mentorName.trim(), email: `${makeId("mentor")}@example.com`, role: "mentor", domain: mentorDomain.trim(), skills: mentorDomain.split(/[,&]/).map((item) => item.trim()).filter(Boolean), availabilityHours: 6, weeklyCapacity: 6 }; setData((old) => ({ ...old, users: [...old.users, mentor] })); setMentorName(""); setMentorDomain("") }}><Field label="Mentor name"><input className={inputClass} required value={mentorName} onChange={(event) => setMentorName(event.target.value)} placeholder="Full name"/></Field><Field label="Domain or skills"><input className={inputClass} required value={mentorDomain} onChange={(event) => setMentorDomain(event.target.value)} placeholder="Product design, Figma"/></Field><button className={`${buttonClass} sm:col-span-2`}><Plus size={14}/> Add mentor</button></form></Card></div></div> }
