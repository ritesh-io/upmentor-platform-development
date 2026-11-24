import "server-only"

import { randomUUID } from "node:crypto"
import { ObjectId } from "mongodb"
import { authDb } from "@/lib/mongodb"
import type { AppRole } from "@/lib/auth-roles"
import type { Cohort, MentorAssignment, MentorshipSession, UserProfile } from "@/lib/upmentor-demo-data"
import type { MentorshipSessionCreate, MentorshipSessionUpdate } from "@/lib/upmentor-ai-contracts"

type CohortRecord = {
  _id: string
  name: string
  track: string
  startDate: string
  studentIds: string[]
  mentorIds: string[]
  updatedAt?: Date
}

type UserProfileRecord = {
  _id: string
  role?: AppRole
  domain?: string
  skills?: string[]
  availabilityHours?: number
  weeklyCapacity?: number
}

type AuthUserRecord = { _id: string | ObjectId; name: string; email: string }

export type MentorshipSessionRecord = {
  _id: string
  cohortId?: string
  mentorId: string
  studentId: string
  startsAt: string
  agenda: string
  status: MentorshipSession["status"]
  notes?: string
  rawNotes?: string
  summary?: string
  discussionPoints?: string[]
  challenges?: string[]
  nextSteps?: string[]
  actionItems: string[]
  actionItemDeadlines?: Record<string, string>
  summarySource?: MentorshipSession["summarySource"]
  createdAt: Date
  updatedAt: Date
}

const sessions = authDb.collection<MentorshipSessionRecord>("mentorship_sessions")
const cohorts = authDb.collection<CohortRecord>("program_cohorts")
const profiles = authDb.collection<UserProfileRecord>("user_profiles")
const users = authDb.collection<AuthUserRecord>("user")

let indexesReady: Promise<void> | undefined

export function ensureMentorshipSessionIndexes() {
  indexesReady ??= Promise.all([
    sessions.createIndex({ mentorId: 1, cohortId: 1, studentId: 1, startsAt: 1 }, { name: "sessions_by_mentor_cohort_student_time" }),
    sessions.createIndex({ studentId: 1, startsAt: 1 }, { name: "sessions_by_student_time" }),
    sessions.createIndex({ cohortId: 1 }, { name: "sessions_by_cohort" }),
  ]).then(() => undefined)
  return indexesReady
}

function toSession(record: MentorshipSessionRecord, actorRole: "mentor" | "mentee", names: { mentorName?: string; studentName?: string } = {}): MentorshipSession {
  return {
    id: record._id,
    ...(record.cohortId ? { cohortId: record.cohortId } : {}),
    mentorId: record.mentorId,
    studentId: record.studentId,
    startsAt: record.startsAt,
    agenda: record.agenda,
    status: record.status,
    ...(record.notes ? { notes: record.notes } : {}),
    ...(actorRole === "mentor" && record.rawNotes ? { rawNotes: record.rawNotes } : {}),
    ...(record.summary ? { summary: record.summary } : {}),
    ...(record.discussionPoints ? { discussionPoints: record.discussionPoints } : {}),
    ...(record.challenges ? { challenges: record.challenges } : {}),
    ...(record.nextSteps ? { nextSteps: record.nextSteps } : {}),
    actionItems: record.actionItems ?? [],
    ...(record.actionItemDeadlines ? { actionItemDeadlines: record.actionItemDeadlines } : {}),
    ...(record.summarySource ? { summarySource: record.summarySource } : {}),
    ...names,
  }
}

async function getUserProfiles(ids: string[], role: "mentor" | "mentee"): Promise<UserProfile[]> {
  const uniqueIds = Array.from(new Set(ids))
  if (!uniqueIds.length) return []
  const profileRecords = await profiles.find({ _id: { $in: uniqueIds }, role }).project<UserProfileRecord>({ _id: 1, role: 1, domain: 1, skills: 1, availabilityHours: 1, weeklyCapacity: 1 }).toArray()
  const mongoIds = uniqueIds.flatMap((id) => ObjectId.isValid(id) ? [new ObjectId(id), id] : [id])
  const accounts = await users.find({ _id: { $in: mongoIds } }).project<AuthUserRecord>({ _id: 1, name: 1, email: 1 }).toArray()
  const accountsById = new Map(accounts.map((account) => [account._id.toString(), account]))

  return profileRecords.flatMap((profile) => {
    const account = accountsById.get(profile._id)
    if (!account) return []
    return [{
      id: profile._id,
      name: account.name,
      email: account.email,
      role,
      domain: profile.domain ?? "",
      skills: profile.skills ?? [],
      availabilityHours: profile.availabilityHours ?? 0,
      weeklyCapacity: profile.weeklyCapacity ?? 0,
    }]
  })
}

function toAssignment(studentId: string, mentorId: string, cohort: CohortRecord): MentorAssignment {
  return {
    studentId,
    mentorId,
    assignedAt: cohort.updatedAt?.toISOString() ?? new Date().toISOString(),
    manual: false,
  }
}

export async function getMentorshipWorkspace(userId: string, role: "mentor" | "mentee") {
  await ensureMentorshipSessionIndexes()

  if (role === "mentor") {
    const assignedCohorts = await cohorts.find({ mentorIds: userId }).toArray()
    const cohortStudentIds = Array.from(new Set(assignedCohorts.flatMap((cohort) => cohort.studentIds)))
    const mentees = await getUserProfiles(cohortStudentIds, "mentee")
    const studentIds = mentees.map((mentee) => mentee.id)
    const activeStudentIds = new Set(studentIds)
    const profilesById = new Map(mentees.map((mentee) => [mentee.id, mentee]))
    const authorizedPairs = new Set(assignedCohorts.flatMap((cohort) => cohort.studentIds
      .filter((studentId) => activeStudentIds.has(studentId))
      .map((studentId) => `${cohort._id}\u0000${studentId}`)))
    const records = studentIds.length
      ? await sessions.find({ mentorId: userId, studentId: { $in: studentIds } }).sort({ startsAt: 1 }).toArray()
      : []
    const authorizedRecords = records.filter((record) => record.cohortId
      ? authorizedPairs.has(`${record.cohortId}\u0000${record.studentId}`)
      : assignedCohorts.some((cohort) => cohort.studentIds.includes(record.studentId)))
    const mentorSessions = authorizedRecords.map((record) => toSession(record, "mentor", {
      mentorName: undefined,
      studentName: profilesById.get(record.studentId)?.name,
    }))
    const assignmentByStudent = new Map<string, MentorAssignment>()
    for (const cohort of assignedCohorts) {
      for (const studentId of cohort.studentIds) {
        if (activeStudentIds.has(studentId) && !assignmentByStudent.has(studentId)) {
          assignmentByStudent.set(studentId, toAssignment(studentId, userId, cohort))
        }
      }
    }
    return { sessions: mentorSessions, mentees, mentors: [] as UserProfile[], assignments: Array.from(assignmentByStudent.values()), cohorts: assignedCohorts.map(toCohort) }
  }

  const [records, assignedCohorts] = await Promise.all([
    sessions.find({ studentId: userId }).sort({ startsAt: 1 }).toArray(),
    cohorts.find({ studentIds: userId }).toArray(),
  ])
  const mentorIds = Array.from(new Set(assignedCohorts.flatMap((cohort) => cohort.mentorIds)))
  const mentors = await getUserProfiles(mentorIds, "mentor")
  const mentorsById = new Map(mentors.map((mentor) => [mentor.id, mentor]))
  const assignmentsByMentor = new Map<string, MentorAssignment>()
  for (const cohort of assignedCohorts) {
    for (const mentorId of cohort.mentorIds) {
      if (!assignmentsByMentor.has(mentorId)) assignmentsByMentor.set(mentorId, toAssignment(userId, mentorId, cohort))
    }
  }
  return {
    sessions: records.map((record) => toSession(record, "mentee", { mentorName: mentorsById.get(record.mentorId)?.name })),
    mentees: [] as UserProfile[],
    mentors,
    assignments: Array.from(assignmentsByMentor.values()),
    cohorts: assignedCohorts.map(toCohort),
  }
}

function toCohort(record: CohortRecord): Cohort {
  return { id: record._id, name: record.name, track: record.track, startDate: record.startDate, studentIds: record.studentIds, mentorIds: record.mentorIds }
}

export async function createMentorshipSession(mentorId: string, input: MentorshipSessionCreate) {
  await ensureMentorshipSessionIndexes()
  if (!(await getUserProfiles([input.studentId], "mentee")).length) return null
  const eligibleCohorts = await cohorts.find({ mentorIds: mentorId, studentIds: input.studentId }).sort({ updatedAt: -1, _id: 1 }).toArray()
  const cohort = eligibleCohorts[0]
  if (!cohort) return null

  const now = new Date()
  const record: MentorshipSessionRecord = {
    _id: randomUUID(),
    cohortId: cohort._id,
    mentorId,
    studentId: input.studentId,
    startsAt: input.startsAt,
    agenda: input.agenda,
    status: "upcoming",
    actionItems: [],
    createdAt: now,
    updatedAt: now,
  }
  await sessions.insertOne(record)
  const student = (await getUserProfiles([input.studentId], "mentee"))[0]
  return toSession(record, "mentor", { studentName: student?.name })
}

export async function getAuthorizedMentorshipSession(sessionId: string, mentorId: string) {
  await ensureMentorshipSessionIndexes()
  const session = await sessions.findOne({ _id: sessionId, mentorId })
  if (!session) return null

  const cohortQuery = session.cohortId
    ? { _id: session.cohortId, mentorIds: mentorId, studentIds: session.studentId }
    : { mentorIds: mentorId, studentIds: session.studentId }
  const cohort = await cohorts.findOne(cohortQuery, { projection: { _id: 1 } })
  return cohort ? session : null
}

export async function updateMentorshipSession(sessionId: string, mentorId: string, input: MentorshipSessionUpdate) {
  const session = await getAuthorizedMentorshipSession(sessionId, mentorId)
  if (!session) return { kind: "not-found" as const }
  if (session.status === "missed" && input.action !== "mark-missed") return { kind: "not-updatable" as const }
  if (input.action === "update-agenda" && session.status !== "upcoming") return { kind: "not-updatable" as const }

  let update: Partial<MentorshipSessionRecord>
  if (input.action === "update-agenda") {
    update = { agenda: input.agenda }
  } else if (input.action === "mark-missed") {
    if (session.status !== "upcoming") return { kind: "not-updatable" as const }
    update = { status: "missed" }
  } else if (input.action === "save-manual-notes") {
    const notes = input.notes.trim()
    update = { status: "completed", notes, summary: notes, rawNotes: notes, summarySource: "manual", discussionPoints: [], challenges: [], nextSteps: [], actionItems: [], actionItemDeadlines: {} }
  } else {
    const summary = input.content.summaryQuotes.join(" ") || input.rawNotes.trim()
    const actionItemDeadlines = Object.fromEntries(input.actionItems.map((item) => [item.title, item.deadline]))
    update = {
      status: "completed",
      notes: summary,
      summary,
      rawNotes: input.rawNotes.trim(),
      discussionPoints: input.content.discussionQuotes,
      challenges: input.content.challengeQuotes,
      nextSteps: input.content.nextStepQuotes,
      actionItems: input.actionItems.map((item) => item.title),
      actionItemDeadlines,
      summarySource: input.source,
    }
  }

  const filter = { _id: sessionId, mentorId, ...(session.cohortId ? { cohortId: session.cohortId } : {}) }
  const result = await sessions.updateOne(filter, { $set: { ...update, updatedAt: new Date() } })
  if (!result.matchedCount) return { kind: "not-found" as const }
  const updated = await sessions.findOne(filter)
  if (!updated) return { kind: "not-found" as const }
  const student = (await getUserProfiles([updated.studentId], "mentee"))[0]
  return { kind: "ok" as const, session: toSession(updated, "mentor", { studentName: student?.name }) }
}
