export type Role = "mentee" | "mentor" | "admin"
export type TaskStatus = "todo" | "submitted" | "revision" | "approved"

export type UserProfile = {
  id: string
  name: string
  role: Role
  email: string
  domain: string
  skills: string[]
  availabilityHours: number
  weeklyCapacity: number
  learningGoal?: string
  level?: string
  targetDate?: string
  cohortId?: string
}

export type RoadmapTask = {
  id: string
  title: string
  instructions: string
  deadline: string
  status: TaskStatus
  submission?: { description: string; url: string; submittedAt: string }
  review?: { note: string; outcome: "revision" | "approved"; reviewedAt: string }
}

export type RoadmapStage = { id: string; title: string; milestone: string; tasks: RoadmapTask[] }
export type Roadmap = { studentId: string; goal: string; domain: string; targetDate: string; stages: RoadmapStage[] }
export type MentorAssignment = { studentId: string; mentorId: string; assignedAt: string; manual: boolean }
export type MentorshipSession = { id: string; mentorId: string; studentId: string; startsAt: string; agenda: string; status: "upcoming" | "completed"; notes?: string; actionItems: string[] }
export type Cohort = { id: string; name: string; startDate: string; studentIds: string[] }
export type AppNotification = { id: string; userId: string; message: string; createdAt: string; read: boolean }

export type DemoData = {
  version: 1
  users: UserProfile[]
  cohorts: Cohort[]
  assignments: MentorAssignment[]
  roadmaps: Roadmap[]
  sessions: MentorshipSession[]
  notifications: AppNotification[]
}

const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export const DEMO_STORAGE_KEY = "upmentor.demo.v1"

export const seedDemoData: DemoData = {
  version: 1,
  users: [
    { id: "maya", name: "Maya Chen", role: "mentee", email: "maya@example.com", domain: "Product Design", skills: ["Figma", "User research"], availabilityHours: 6, weeklyCapacity: 8, learningGoal: "Build a portfolio-ready product design case study", level: "Intermediate", targetDate: date(56), cohortId: "cohort-design" },
    { id: "ethan", name: "Ethan Brooks", role: "mentee", email: "ethan@example.com", domain: "Frontend Engineering", skills: ["JavaScript", "HTML"], availabilityHours: 5, weeklyCapacity: 8, learningGoal: "Build and deploy a polished web application", level: "Beginner", targetDate: date(70), cohortId: "cohort-design" },
    { id: "sofia", name: "Sofia Patel", role: "mentee", email: "sofia@example.com", domain: "Product Strategy", skills: ["Research", "Roadmapping"], availabilityHours: 4, weeklyCapacity: 8, learningGoal: "Develop a confident product strategy practice", level: "Intermediate", targetDate: date(63), cohortId: "cohort-design" },
    { id: "jordan", name: "Jordan Rivera", role: "mentor", email: "jordan@example.com", domain: "Product Design", skills: ["Figma", "User research", "Design systems", "Prototyping"], availabilityHours: 8, weeklyCapacity: 12 },
    { id: "alex", name: "Alex Lee", role: "admin", email: "alex@example.com", domain: "Program operations", skills: ["Program design"], availabilityHours: 0, weeklyCapacity: 0 },
    { id: "priya", name: "Priya Nair", role: "mentor", email: "priya@example.com", domain: "Frontend Engineering", skills: ["JavaScript", "React", "Accessibility"], availabilityHours: 10, weeklyCapacity: 12 },
    { id: "marcus", name: "Marcus Hill", role: "mentor", email: "marcus@example.com", domain: "Product Strategy", skills: ["Research", "Roadmapping", "Analytics"], availabilityHours: 5, weeklyCapacity: 8 },
  ],
  cohorts: [{ id: "cohort-design", name: "Product Design · Fall", startDate: date(-28), studentIds: ["maya", "ethan", "sofia"] }],
  assignments: [
    { studentId: "maya", mentorId: "jordan", assignedAt: date(-22), manual: false },
    { studentId: "ethan", mentorId: "priya", assignedAt: date(-18), manual: false },
    { studentId: "sofia", mentorId: "marcus", assignedAt: date(-15), manual: false },
  ],
  roadmaps: [
    { studentId: "maya", goal: "Build a portfolio-ready product design case study", domain: "Product Design", targetDate: date(56), stages: [
      { id: "maya-stage-1", title: "Research & discovery", milestone: "Validate a real user problem", tasks: [
        { id: "maya-task-1", title: "Interview three target users", instructions: "Prepare a short interview guide, speak with three people in your target audience, and summarize recurring needs.", deadline: date(-14), status: "approved", review: { note: "Clear synthesis and thoughtful follow-up questions.", outcome: "approved", reviewedAt: date(-12) } },
        { id: "maya-task-2", title: "Map the opportunity space", instructions: "Turn interview findings into a problem statement and opportunity map.", deadline: date(-8), status: "approved", review: { note: "Strong framing. Keep the target user specific.", outcome: "approved", reviewedAt: date(-7) } },
      ] },
      { id: "maya-stage-2", title: "Design systems", milestone: "Create a consistent, accessible interface", tasks: [
        { id: "maya-task-3", title: "Build a component inventory", instructions: "Audit the key screens and define reusable components, states, and accessibility notes.", deadline: date(4), status: "todo" },
        { id: "maya-task-4", title: "Prototype the core flow", instructions: "Create a clickable prototype for the most important user journey.", deadline: date(11), status: "todo" },
      ] },
      { id: "maya-stage-3", title: "Testing & portfolio", milestone: "Share a validated case study", tasks: [
        { id: "maya-task-5", title: "Run a usability check", instructions: "Test the prototype with three people and prioritize improvements by impact.", deadline: date(25), status: "todo" },
        { id: "maya-task-6", title: "Publish your case study", instructions: "Tell the story from initial problem through research, decisions, and measured outcomes.", deadline: date(42), status: "todo" },
      ] },
    ] },
  ],
  sessions: [
    { id: "session-1", mentorId: "jordan", studentId: "maya", startsAt: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16), agenda: "Review component inventory and unblock the prototype", status: "upcoming", actionItems: [] },
    { id: "session-2", mentorId: "jordan", studentId: "maya", startsAt: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 16), agenda: "Research synthesis and opportunity framing", status: "completed", notes: "Maya found a strong pattern around first-time setup. We agreed to focus the prototype on the activation moment.", actionItems: ["Sketch two activation concepts", "Bring one open question to the next session"] },
  ],
  notifications: [
    { id: "notice-1", userId: "maya", message: "Jordan Rivera is your mentor. Your next session is on the calendar.", createdAt: date(-2), read: false },
    { id: "notice-2", userId: "jordan", message: "Maya Chen submitted a research synthesis for review.", createdAt: date(-1), read: false },
  ],
}

export function makeId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`
}

export function makePersonalizedRoadmap(profile: UserProfile, previous?: Roadmap): Roadmap {
  const goal = profile.learningGoal?.trim() || `Build confidence in ${profile.domain}`
  const domain = profile.domain || "Product Design"
  const target = profile.targetDate || date(56)
  const templates = [
    { title: "Define the opportunity", milestone: `Clarify the problem behind: ${goal}`, tasks: [`Research the ${domain} context`, "Write a focused problem statement"] },
    { title: "Practice the core craft", milestone: `Apply your ${profile.level?.toLowerCase() || "current"} skills to a real example`, tasks: [`Create a first ${domain.toLowerCase()} artifact`, "Share a draft for mentor feedback"] },
    { title: "Validate and share", milestone: "Demonstrate what changed and what you learned", tasks: ["Test your work and prioritize improvements", "Package the outcome into a portfolio-ready story"] },
  ]
  const start = Date.now()
  const milestones = templates.map((stage, stageIndex) => {
    const existingStage = previous?.stages[stageIndex]
    return {
      id: existingStage?.id || makeId("stage"),
      title: stage.title,
      milestone: stage.milestone,
      tasks: stage.tasks.map((taskTitle, taskIndex) => {
        const existing = existingStage?.tasks[taskIndex]
        return {
          id: existing?.id || makeId("task"),
          title: taskTitle,
          instructions: `Work on this step for about ${Math.max(1, Math.round((profile.availabilityHours || 4) / 2))} hours each week. Capture your process, decisions, and questions so your mentor can give specific feedback.`,
          deadline: existing?.deadline || new Date(start + Math.round((stageIndex * 2 + taskIndex + 1) * 7 * 86_400_000)).toISOString().slice(0, 10),
          status: (existing?.status === "approved" || existing?.status === "submitted" ? existing.status : "todo") as TaskStatus,
          ...(existing?.submission ? { submission: existing.submission } : {}),
          ...(existing?.review ? { review: existing.review } : {}),
        }
      }),
    }
  })
  return { studentId: profile.id, goal, domain, targetDate: target, stages: milestones }
}

export function getMatchBreakdown(student: UserProfile, mentor: UserProfile, currentLoad: number) {
  const studentSkills = student.skills.map((skill) => skill.toLowerCase())
  const overlap = mentor.skills.filter((skill) => studentSkills.includes(skill.toLowerCase())).length
  const skill = Math.round((overlap / Math.max(1, Math.min(mentor.skills.length, 3))) * 100)
  const goalText = `${student.domain} ${student.learningGoal || ""}`.toLowerCase()
  const goal = mentor.domain.toLowerCase().split(/\s+/).some((word) => word.length > 3 && goalText.includes(word)) ? 100 : (mentor.domain.toLowerCase() === student.domain.toLowerCase() ? 100 : 35)
  const availability = Math.min(100, Math.round((mentor.availabilityHours / Math.max(1, student.availabilityHours)) * 60))
  const capacity = Math.max(0, Math.round(((mentor.weeklyCapacity - currentLoad) / Math.max(1, mentor.weeklyCapacity)) * 100))
  const total = Math.round(skill * 0.4 + goal * 0.3 + availability * 0.2 + capacity * 0.1)
  return { skill, goal, availability, capacity, total }
}
