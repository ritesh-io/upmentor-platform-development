export type Role = "mentee" | "mentor" | "admin"
export type TaskStatus = "todo" | "submitted" | "revision" | "approved"
export type ResourceType = "video" | "quiz" | "project"
export type EventKind = "intro" | "hackathon" | "speaker" | "study-circle"

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
  enrollmentNumber?: string
}

export type RoadmapTask = {
  id: string
  title: string
  instructions: string
  deadline: string
  status: TaskStatus
  resourceType?: ResourceType
  resourceUrl?: string
  maxScore?: number
  sourceSessionId?: string
  submission?: { description: string; url: string; submittedAt: string }
  review?: { note: string; outcome: "revision" | "approved"; reviewedAt: string; score?: number }
}

export type RoadmapStage = { id: string; title: string; milestone: string; tasks: RoadmapTask[]; resources: string[] }
export type Roadmap = { studentId: string; goal: string; domain: string; targetDate: string; recommendedNextStep: string; stages: RoadmapStage[] }
export type GeneratedRoadmapContent = {
  recommendedNextStep: string
  stages: Array<{
    title: string
    milestone: string
    tasks: Array<{ title: string; instructions: string }>
    resources: string[]
  }>
}
export type MentorAssignment = { studentId: string; mentorId: string; assignedAt: string; manual: boolean }
export type MentorshipSession = {
  id: string
  mentorId: string
  studentId: string
  startsAt: string
  agenda: string
  status: "upcoming" | "completed" | "missed"
  notes?: string
  rawNotes?: string
  summary?: string
  discussionPoints?: string[]
  challenges?: string[]
  nextSteps?: string[]
  actionItems: string[]
  summarySource?: "ai" | "simulated" | "manual"
}
export type Cohort = { id: string; name: string; track: string; startDate: string; studentIds: string[]; mentorIds: string[]; demoOnly?: boolean }
export type CommunityEvent = { id: string; title: string; kind: EventKind; startsAt: string; format: string; description: string; tracks: string[]; demoOnly: true }
export type AppNotification = { id: string; userId: string; message: string; createdAt: string; read: boolean }

export type DemoData = {
  version: 2
  users: UserProfile[]
  cohorts: Cohort[]
  events: CommunityEvent[]
  eventRsvps: Record<string, string[]>
  assignments: MentorAssignment[]
  roadmaps: Roadmap[]
  sessions: MentorshipSession[]
  notifications: AppNotification[]
}

const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
const dateTime = (days: number, hour = 15) => {
  const value = new Date(Date.now() + days * 86_400_000)
  value.setHours(hour, 0, 0, 0)
  return value.toISOString().slice(0, 16)
}

export const DEMO_STORAGE_KEY = "upmentor.demo.v2"

export const LEARNING_RESOURCES = [
  { id: "mdn-learn", title: "Learn web development", provider: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development", tracks: ["Web Development"] },
  { id: "web-dev", title: "Learn web.dev", provider: "Google web.dev", url: "https://web.dev/learn/", tracks: ["Web Development"] },
  { id: "react-learn", title: "Learn React", provider: "React documentation", url: "https://react.dev/learn", tracks: ["Web Development"] },
  { id: "cpp-reference", title: "C++ language reference", provider: "cppreference", url: "https://en.cppreference.com/w/", tracks: ["DSA in C/C++"] },
  { id: "cses", title: "CSES Problem Set", provider: "CSES", url: "https://cses.fi/problemset/", tracks: ["DSA in C/C++"] },
  { id: "cp-algorithms", title: "Algorithms reference", provider: "CP-Algorithms", url: "https://cp-algorithms.com/", tracks: ["DSA in C/C++"] },
  { id: "kaggle", title: "Python and machine learning", provider: "Kaggle Learn", url: "https://www.kaggle.com/learn", tracks: ["AI/ML"] },
  { id: "ml-crash-course", title: "Machine Learning Crash Course", provider: "Google for Developers", url: "https://developers.google.com/machine-learning/crash-course", tracks: ["AI/ML"] },
  { id: "sklearn", title: "scikit-learn user guide", provider: "scikit-learn", url: "https://scikit-learn.org/stable/user_guide.html", tracks: ["AI/ML"] },
  { id: "github-skills", title: "Practice with GitHub Skills", provider: "GitHub", url: "https://skills.github.com/", tracks: ["Web Development", "DSA in C/C++", "AI/ML", "Other"] },
] as const

const seedUsers: UserProfile[] = [
  { id: "aryan", name: "Aryan Mehta", role: "mentee", email: "aryan@demo.techneeds.local", enrollmentNumber: "TN26-0041", domain: "Web Development", skills: ["HTML", "CSS", "JavaScript"], availabilityHours: 6, weeklyCapacity: 8, learningGoal: "Build and deploy an accessible web project", level: "Beginner", targetDate: date(56), cohortId: "cohort-web" },
  { id: "mohit", name: "Mohit Kumar", role: "mentee", email: "mohit@demo.techneeds.local", enrollmentNumber: "TN26-0042", domain: "DSA in C/C++", skills: ["C++", "Arrays", "Problem solving"], availabilityHours: 5, weeklyCapacity: 8, learningGoal: "Build consistency solving core DSA problems in C++", level: "Beginner", targetDate: date(70), cohortId: "cohort-dsa" },
  { id: "hrithik", name: "Hrithik Singh", role: "mentee", email: "hrithik@demo.techneeds.local", enrollmentNumber: "TN26-0043", domain: "AI/ML", skills: ["Python", "Pandas", "Statistics"], availabilityHours: 7, weeklyCapacity: 8, learningGoal: "Create a reproducible beginner machine-learning project", level: "Intermediate", targetDate: date(63), cohortId: "cohort-ai-ml" },
  { id: "ayush", name: "Ayush Sharma", role: "mentee", email: "ayush@demo.techneeds.local", enrollmentNumber: "TN26-0044", domain: "Web Development", skills: ["JavaScript", "React", "Git"], availabilityHours: 4, weeklyCapacity: 8, learningGoal: "Ship a polished React project and explain the decisions", level: "Intermediate", targetDate: date(56), cohortId: "cohort-web" },
  { id: "kritika", name: "Kritika Sharma", role: "mentor", email: "kritika@demo.techneeds.local", domain: "Web Development", skills: ["HTML", "CSS", "JavaScript", "React", "Accessibility"], availabilityHours: 8, weeklyCapacity: 3 },
  { id: "anushka", name: "Anushka Verma", role: "mentor", email: "anushka@demo.techneeds.local", domain: "DSA in C/C++", skills: ["C++", "Algorithms", "Problem solving", "Complexity"], availabilityHours: 7, weeklyCapacity: 3 },
  { id: "sonakshi", name: "Sonakshi Gupta", role: "mentor", email: "sonakshi@demo.techneeds.local", domain: "AI/ML", skills: ["Python", "Pandas", "Statistics", "scikit-learn"], availabilityHours: 6, weeklyCapacity: 2 },
  { id: "simran", name: "Simran Kapoor", role: "mentor", email: "simran@demo.techneeds.local", domain: "Web Development", skills: ["JavaScript", "React", "Git", "CSS"], availabilityHours: 10, weeklyCapacity: 3 },
  { id: "nidhi", name: "Nidhi Rao", role: "admin", email: "nidhi@demo.techneeds.local", domain: "Program operations", skills: ["Cohort management", "Student support"], availabilityHours: 0, weeklyCapacity: 0 },
]

export const seedDemoData: DemoData = {
  version: 2,
  users: seedUsers,
  cohorts: [
    { id: "cohort-web", name: "Web Development · Mentorship Cohort", track: "Web Development", startDate: date(-35), studentIds: ["aryan", "ayush"], mentorIds: ["kritika", "simran"] },
    { id: "cohort-dsa", name: "DSA in C/C++ · Mentorship Cohort", track: "DSA in C/C++", startDate: date(-28), studentIds: ["mohit"], mentorIds: ["anushka"] },
    { id: "cohort-ai-ml", name: "AI/ML independent practice · Demo track", track: "AI/ML", startDate: date(-18), studentIds: ["hrithik"], mentorIds: ["sonakshi"], demoOnly: true },
  ],
  events: [
    { id: "event-intro", title: "Getting started with Git and GitHub", kind: "intro", startsAt: dateTime(4, 16), format: "Online · sample schedule", description: "A beginner-friendly introduction to version control, branches, and collaborating on a small project.", tracks: ["Web Development", "DSA in C/C++", "AI/ML"], demoOnly: true },
    { id: "event-dsa-circle", title: "DSA problem-solving circle", kind: "study-circle", startsAt: dateTime(8, 17), format: "Online · sample schedule", description: "Work through a C++ problem together, compare approaches, and discuss complexity.", tracks: ["DSA in C/C++"], demoOnly: true },
    { id: "event-hackathon", title: "TechNeeds community hackathon", kind: "hackathon", startsAt: dateTime(15, 10), format: "Community event · sample schedule", description: "A collaborative build day for small, useful projects. Pair up, scope a problem, and share a working demo.", tracks: ["Web Development", "DSA in C/C++", "AI/ML"], demoOnly: true },
    { id: "event-speaker", title: "From first project to first internship", kind: "speaker", startsAt: dateTime(22, 18), format: "Guest session · sample schedule", description: "A sample speaker-session listing about learning in public, building projects, and asking for feedback.", tracks: ["Web Development", "DSA in C/C++", "AI/ML"], demoOnly: true },
  ],
  eventRsvps: { "event-intro": ["aryan", "hrithik"], "event-dsa-circle": ["mohit"] },
  assignments: [
    { studentId: "aryan", mentorId: "kritika", assignedAt: date(-10), manual: false },
    { studentId: "mohit", mentorId: "anushka", assignedAt: date(-20), manual: false },
    { studentId: "hrithik", mentorId: "sonakshi", assignedAt: date(-12), manual: false },
    { studentId: "ayush", mentorId: "simran", assignedAt: date(-34), manual: false },
  ],
  roadmaps: [
    makeSeedRoadmap(seedUsers[0], ["approved", "approved", "todo", "todo", "todo", "todo"]),
    makeSeedRoadmap(seedUsers[1], ["approved", "submitted", "todo", "todo", "todo", "todo"]),
    makeSeedRoadmap(seedUsers[2], ["approved", "todo", "todo", "todo", "todo", "todo"]),
    makeSeedRoadmap(seedUsers[3], ["todo", "todo", "todo", "todo", "todo", "todo"], [0, 1]),
  ],
  sessions: [
    { id: "session-aryan-upcoming", mentorId: "kritika", studentId: "aryan", startsAt: dateTime(2, 15), agenda: "Review the first web project and plan the next accessible UI component", status: "upcoming", actionItems: [] },
    { id: "session-aryan-complete", mentorId: "kritika", studentId: "aryan", startsAt: dateTime(-4, 15), agenda: "HTML semantics and responsive layout", status: "completed", notes: "Aryan shared the first responsive page and asked about semantic landmarks. The agreed next step was to refine the page structure before adding interactions.", actionItems: ["Refine the page landmarks before adding interactions"] },
    { id: "session-mohit-missed", mentorId: "anushka", studentId: "mohit", startsAt: dateTime(-3, 17), agenda: "Review array and two-pointer practice", status: "missed", actionItems: [] },
    { id: "session-hrithik-upcoming", mentorId: "sonakshi", studentId: "hrithik", startsAt: dateTime(5, 16), agenda: "Review data cleaning and choose an evaluation metric", status: "upcoming", actionItems: [] },
    { id: "session-hrithik-complete", mentorId: "sonakshi", studentId: "hrithik", startsAt: dateTime(-2, 16), agenda: "Python notebook structure and dataset checks", status: "completed", notes: "Hrithik separated the data preparation cells and checked for missing values. The next step is to record a simple baseline metric.", actionItems: ["Record the baseline metric in the notebook"] },
    { id: "session-ayush-complete", mentorId: "simran", studentId: "ayush", startsAt: dateTime(-26, 11), agenda: "Set up the React project and choose a feature", status: "completed", notes: "Ayush set up the project and chose a small campus-focused feature. No follow-up was recorded after the meeting.", actionItems: [] },
  ],
  notifications: [
    { id: "notice-aryan", userId: "aryan", message: "Kritika Sharma is your mentor. Your next Web Development session is on the calendar.", createdAt: date(-1), read: false },
    { id: "notice-anushka", userId: "anushka", message: "Mohit Kumar submitted an array-practice reflection for review.", createdAt: date(-1), read: false },
    { id: "notice-admin", userId: "nidhi", message: "The DSA in C/C++ cohort recorded a missed mentorship session. A supportive follow-up may help.", createdAt: date(-2), read: false },
  ],
}

function makeSeedRoadmap(profile: UserProfile, statuses: TaskStatus[], overdue: number[] = []): Roadmap {
  const roadmap = makePersonalizedRoadmap(profile)
  let taskIndex = 0
  return {
    ...roadmap,
    stages: roadmap.stages.map((stage, stageIndex) => ({
      ...stage,
      id: `${profile.id}-stage-${stageIndex + 1}`,
      tasks: stage.tasks.map((task, itemIndex) => {
        const index = taskIndex++
        const status = statuses[index] || "todo"
        const due = overdue.includes(index) ? date(-8 + overdue.indexOf(index) * 2) : task.deadline
        const submission = status === "approved" || status === "submitted"
          ? { description: `${profile.name} shared a short reflection on the work, what they learned, and one question to discuss with their mentor.`, url: "", submittedAt: date(status === "submitted" ? -1 : -3) }
          : undefined
        const review = status === "approved"
          ? { note: "Good progress. The work is clear and the next step is specific.", outcome: "approved" as const, reviewedAt: date(-2), score: 76 + (index * 7 % 25) }
          : undefined
        return { ...task, id: `${profile.id}-task-${index + 1}`, deadline: due, status, ...(submission ? { submission } : {}), ...(review ? { review } : {}) }
      }),
    })),
  }
}

export function makeId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`
}

export function resourceIdsForDomain(domain: string) {
  const normalized = domain.toLowerCase()
  if (normalized.includes("dsa") || normalized.includes("c/c++") || normalized.includes("algorithm")) return ["cpp-reference", "cses", "cp-algorithms", "github-skills"]
  if (normalized.includes("ai") || normalized.includes("machine learning") || normalized.includes("ml")) return ["kaggle", "ml-crash-course", "sklearn", "github-skills"]
  if (normalized.includes("web") || normalized.includes("front") || normalized.includes("react")) return ["mdn-learn", "web-dev", "react-learn", "github-skills"]
  return ["mdn-learn", "cses", "kaggle", "github-skills"]
}

export function getMatchBreakdown(student: UserProfile, mentor: UserProfile, workload: number) {
  const learnerSkills = student.skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean)
  const mentorSkills = new Set(mentor.skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean))
  const skill = learnerSkills.length ? Math.round(learnerSkills.filter((item) => mentorSkills.has(item)).length * 100 / learnerSkills.length) : 50
  const learnerDomain = student.domain.toLowerCase().trim()
  const mentorDomain = mentor.domain.toLowerCase().trim()
  const goal = learnerDomain === mentorDomain || learnerDomain.includes(mentorDomain) || mentorDomain.includes(learnerDomain) ? 100 : (student.learningGoal || "").toLowerCase().includes(mentorDomain) ? 85 : 45
  const availability = Math.min(100, Math.round((mentor.availabilityHours / Math.max(1, student.availabilityHours)) * 100))
  const capacity = mentor.weeklyCapacity > 0 ? Math.max(0, Math.round((1 - workload / mentor.weeklyCapacity) * 100)) : 0
  const total = Math.round(skill * 0.4 + goal * 0.3 + availability * 0.2 + capacity * 0.1)
  return { skill, goal, availability, capacity, total }
}

function curriculumFor(profile: UserProfile) {
  const domain = profile.domain || "Other"
  const goal = profile.learningGoal?.trim() || `Build confidence in ${domain}`
  const level = profile.level?.toLowerCase() || "beginner"
  const hours = Math.max(1, profile.availabilityHours || 4)
  const workHours = Math.max(1, Math.round(hours / 2))
  const instructions = (focus: string) => `${focus} Spend about ${workHours} focused hours each week, keep short notes on your decisions, and bring one question to your mentor.`
  if (resourceIdsForDomain(domain)[0] === "cpp-reference") return [
    { title: "C++ foundations and problem-solving", milestone: `Build a reliable starting routine toward: ${goal}`, tasks: [
      { title: "Review C++ input, types, loops, and functions", instructions: instructions(`Use small examples in ${domain} and compile each one locally.`) },
      { title: "Solve array and string warm-ups", instructions: instructions(`Attempt three level-appropriate problems, then write down the pattern behind each solution.`) },
    ], resources: ["cpp-reference", "github-skills"] },
    { title: "Core data structures and patterns", milestone: `Apply ${level} skills to common DSA patterns`, tasks: [
      { title: "Practice searching, sorting, and complexity", instructions: instructions("Compare a simple solution with a more efficient approach and explain the trade-off.") },
      { title: "Implement a stack, queue, and hash-based lookup", instructions: instructions("Test edge cases and ask your mentor to review readability and complexity.") },
    ], resources: ["cses", "cp-algorithms"] },
    { title: "Timed practice and reflection", milestone: "Demonstrate a repeatable problem-solving process", tasks: [
      { title: "Complete a short mixed problem set", instructions: instructions("Choose problems from the recommended set and keep a brief attempt log.") },
      { title: "Explain one solution from brute force to optimization", instructions: instructions(`Relate the explanation back to your goal: ${goal}.`)
      },
    ], resources: ["cses", "cpp-reference"] },
  ]
  if (resourceIdsForDomain(domain)[0] === "kaggle") return [
    { title: "Python and data foundations", milestone: `Prepare a clear learning path toward: ${goal}`, tasks: [
      { title: "Set up a reproducible Python notebook", instructions: instructions("Create clear setup, exploration, and notes sections and save the notebook in version control.") },
      { title: "Inspect a small dataset", instructions: instructions("Describe columns, missing values, and one question the data could help answer.") },
    ], resources: ["kaggle", "github-skills"] },
    { title: "Build and evaluate a baseline", milestone: "Create a simple model and explain what its result means", tasks: [
      { title: "Prepare features and a train/test split", instructions: instructions("Avoid data leakage and write down the reason for your split.") },
      { title: "Train a baseline and record one suitable metric", instructions: instructions("Compare the baseline to a simple reference and note what the metric does not tell you.") },
    ], resources: ["ml-crash-course", "sklearn"] },
    { title: "Explain and share the experiment", milestone: "Present a reproducible result with honest limitations", tasks: [
      { title: "Run one focused experiment", instructions: instructions("Change one modeling choice at a time and record the result.") },
      { title: "Publish a short project readme", instructions: instructions(`Explain the result, limitations, and how it supports your goal: ${goal}.`)
      },
    ], resources: ["ml-crash-course", "github-skills"] },
  ]
  if (resourceIdsForDomain(domain)[0] === "mdn-learn") return [
    { title: "Web foundations and accessible structure", milestone: `Create a strong foundation toward: ${goal}`, tasks: [
      { title: "Build a semantic, responsive page", instructions: instructions("Use clear landmarks, meaningful headings, and a layout that works on a narrow screen.") },
      { title: "Add a small interaction with JavaScript", instructions: instructions("Handle an input or button action and describe the states a user can reach.") },
    ], resources: ["mdn-learn", "web-dev"] },
    { title: "Build reusable interface features", milestone: `Apply ${level} ${domain} skills to a useful project`, tasks: [
      { title: "Create a reusable React component", instructions: instructions("Choose a repeated piece of UI, define its props, and handle empty or invalid input.") },
      { title: "Add an accessible form or navigation flow", instructions: instructions("Use labels, keyboard access, clear validation, and a meaningful success state.") },
    ], resources: ["react-learn", "mdn-learn"] },
    { title: "Ship and explain the project", milestone: "Publish a working project and reflect on the decisions", tasks: [
      { title: "Test the main flow on mobile and desktop", instructions: instructions("Check keyboard navigation, responsive layout, and one realistic error state.") },
      { title: "Write a project readme and demo walkthrough", instructions: instructions(`Connect the project decisions to your goal: ${goal}.`)
      },
    ], resources: ["web-dev", "github-skills"] },
  ]
  return [
    { title: "Explore the fundamentals", milestone: `Clarify the first outcome for: ${goal}`, tasks: [
      { title: `Map the basics of ${domain}`, instructions: instructions("List key concepts, find one trusted learning resource, and identify a small practice exercise.") },
      { title: "Complete a guided starter exercise", instructions: instructions("Document what felt clear, what was challenging, and one question for your mentor.") },
    ], resources: resourceIdsForDomain(domain).slice(0, 2) },
    { title: "Practice with mentor feedback", milestone: "Apply core skills to a realistic example", tasks: [
      { title: `Create a first ${domain} artifact`, instructions: instructions("Keep the scope small and ask for focused feedback on one decision.") },
      { title: "Revise your work using feedback", instructions: instructions("Record the change you made and why it improves the result.") },
    ], resources: resourceIdsForDomain(domain).slice(1, 3) },
    { title: "Share what you learned", milestone: "Demonstrate progress and plan the next step", tasks: [
      { title: "Test your work and note limitations", instructions: instructions("Use a short checklist to test the result and identify one improvement.") },
      { title: "Prepare a short project walkthrough", instructions: instructions(`Explain how the work supports your goal: ${goal}.`)
      },
    ], resources: resourceIdsForDomain(domain).slice(0, 3) },
  ]
}

function withDeadlines(profile: UserProfile, taskCount: number) {
  const today = new Date()
  const target = profile.targetDate ? new Date(`${profile.targetDate}T12:00:00`) : new Date(today.getTime() + 56 * 86_400_000)
  const availableDays = Math.max(7, Math.round((target.getTime() - today.getTime()) / 86_400_000))
  return Array.from({ length: taskCount }, (_, index) => new Date(today.getTime() + Math.max(2, Math.round(availableDays * (index + 1) / (taskCount + 1))) * 86_400_000).toISOString().slice(0, 10))
}

export function makePersonalizedRoadmap(profile: UserProfile, previous?: Roadmap): Roadmap {
  const goal = profile.learningGoal?.trim() || `Build confidence in ${profile.domain}`
  const content = curriculumFor(profile)
  const deadlines = withDeadlines(profile, content.reduce((count, stage) => count + stage.tasks.length, 0))
  let taskIndex = 0
  const stages = content.map((stage, stageIndex) => {
    const oldStage = previous?.stages[stageIndex]
    return {
      id: oldStage?.id || makeId("stage"),
      title: stage.title,
      milestone: stage.milestone,
      resources: stage.resources,
      tasks: stage.tasks.map((task, itemIndex) => {
        const existing = oldStage?.tasks[itemIndex]
        const deadline = deadlines[taskIndex++]
        return {
          id: existing?.id || makeId("task"),
          title: task.title,
          instructions: task.instructions,
          resourceType: stageIndex === 2 ? "project" as const : itemIndex === 0 ? "video" as const : "quiz" as const,
          maxScore: 100,
          deadline: existing?.status && existing.status !== "todo" ? existing.deadline : deadline,
          status: (existing?.status && existing.status !== "todo" ? existing.status : "todo") as TaskStatus,
          ...(existing?.submission ? { submission: existing.submission } : {}),
          ...(existing?.review ? { review: existing.review } : {}),
        }
      }),
    }
  })
  const firstTask = stages.flatMap((stage) => stage.tasks).find((task) => task.status !== "approved")
  return { studentId: profile.id, goal, domain: profile.domain || "Other", targetDate: profile.targetDate || date(56), recommendedNextStep: firstTask?.title || "Share your progress with your mentor", stages }
}

export function makeRoadmapFromGenerated(profile: UserProfile, generated: GeneratedRoadmapContent, previous?: Roadmap): Roadmap {
  const base = makePersonalizedRoadmap(profile, previous)
  const deadlines = withDeadlines(profile, generated.stages.reduce((count, stage) => count + stage.tasks.length, 0))
  let taskIndex = 0
  const stages = generated.stages.map((stage, stageIndex) => {
    const oldStage = previous?.stages[stageIndex]
    return {
      id: oldStage?.id || makeId("stage"),
      title: stage.title,
      milestone: stage.milestone,
      resources: stage.resources,
      tasks: stage.tasks.map((task, itemIndex) => {
        const existing = oldStage?.tasks[itemIndex]
        const deadline = deadlines[taskIndex++]
        return {
          id: existing?.id || makeId("task"),
          title: task.title,
          instructions: task.instructions,
          resourceType: stageIndex === 2 ? "project" as const : itemIndex === 0 ? "video" as const : "quiz" as const,
          maxScore: 100,
          deadline: existing?.status && existing.status !== "todo" ? existing.deadline : deadline,
          status: (existing?.status && existing.status !== "todo" ? existing.status : "todo") as TaskStatus,
          ...(existing?.submission ? { submission: existing.submission } : {}),
          ...(existing?.review ? { review: existing.review } : {}),
        }
      }),
    }
  })
  const firstTask = stages.flatMap((stage) => stage.tasks).find((task) => task.status !== "approved")
  return { ...base, goal: profile.learningGoal?.trim() || base.goal, recommendedNextStep: generated.recommendedNextStep || firstTask?.title || base.recommendedNextStep, stages }
}
