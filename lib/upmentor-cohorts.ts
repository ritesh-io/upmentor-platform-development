import "server-only"

import { randomUUID } from "node:crypto"
import { ObjectId } from "mongodb"
import { authDb } from "@/lib/mongodb"
import type { Cohort, UserProfile } from "@/lib/upmentor-demo-data"

export type CohortRecord = {
  _id: string
  name: string
  normalizedName: string
  track: string
  startDate: string
  studentIds: string[]
  mentorIds: string[]
  createdAt: Date
  updatedAt: Date
}

type UserProfileRecord = { _id: string; role?: string; domain?: string; skills?: string[]; availabilityHours?: number; weeklyCapacity?: number }
type AuthUserRecord = { _id: string | ObjectId; name: string; email: string }
type CohortUserRole = "mentor" | "mentee"

const cohorts = authDb.collection<CohortRecord>("program_cohorts")
const userProfiles = authDb.collection<UserProfileRecord>("user_profiles")
const authUsers = authDb.collection<AuthUserRecord>("user")

let indexesReady: Promise<void> | undefined

export function ensureCohortIndexes() {
  indexesReady ??= Promise.all([
    cohorts.createIndex({ normalizedName: 1, startDate: 1 }, { unique: true, name: "unique_cohort_name_date" }),
    cohorts.createIndex({ mentorIds: 1 }, { name: "cohorts_by_mentor" }),
    cohorts.createIndex({ studentIds: 1 }, { name: "cohorts_by_student" }),
  ]).then(() => undefined)
  return indexesReady
}

function toCohort(record: CohortRecord): Cohort {
  return {
    id: record._id,
    name: record.name,
    track: record.track,
    startDate: record.startDate,
    studentIds: record.studentIds,
    mentorIds: record.mentorIds,
  }
}

export async function getAdminCohortData() {
  await ensureCohortIndexes()
  const [records, mentorProfiles, menteeProfiles] = await Promise.all([
    cohorts.find().sort({ startDate: -1, createdAt: -1 }).limit(100).toArray(),
    userProfiles.find({ role: "mentor" }).project<UserProfileRecord>({ _id: 1, role: 1, domain: 1, skills: 1, availabilityHours: 1, weeklyCapacity: 1 }).limit(500).toArray(),
    userProfiles.find({ role: "mentee" }).project<UserProfileRecord>({ _id: 1, role: 1, domain: 1, skills: 1, availabilityHours: 1, weeklyCapacity: 1 }).limit(1000).toArray(),
  ])

  const profilesByRole: Record<CohortUserRole, UserProfileRecord[]> = { mentor: mentorProfiles, mentee: menteeProfiles }
  const accountIds = [...mentorProfiles, ...menteeProfiles].map((profile) => profile._id)
  const mongoIds = accountIds.flatMap((id) => ObjectId.isValid(id) ? [new ObjectId(id), id] : [id])
  const accounts = accountIds.length
    ? await authUsers.find({ _id: { $in: mongoIds } }).project<AuthUserRecord>({ _id: 1, name: 1, email: 1 }).toArray()
    : []
  const accountsById = new Map(accounts.map((account) => [account._id.toString(), account]))
  const mapUsers = (role: CohortUserRole): UserProfile[] => profilesByRole[role].flatMap((profile) => {
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
  const mentors = mapUsers("mentor")
  const mentees = mapUsers("mentee")

  return { cohorts: records.map(toCohort), mentors, mentees }
}

export async function createProgramCohort(input: { name: string; track: string; startDate: string; leadMentorId?: string }) {
  await ensureCohortIndexes()
  const now = new Date()
  const record: CohortRecord = {
    _id: randomUUID(),
    name: input.name,
    normalizedName: input.name.toLocaleLowerCase("en-US"),
    track: input.track,
    startDate: input.startDate,
    studentIds: [],
    mentorIds: input.leadMentorId ? [input.leadMentorId] : [],
    createdAt: now,
    updatedAt: now,
  }
  await cohorts.insertOne(record)
  return toCohort(record)
}

export async function changeCohortMembership(cohortId: string, userId: string, role: CohortUserRole, action: "add" | "remove") {
  await ensureCohortIndexes()
  if (action === "add") {
    const user = await userProfiles.findOne({ _id: userId, role })
    if (!user) return { kind: "user-missing" as const }
  }
  const membershipField = role === "mentor" ? "mentorIds" : "studentIds"
  const update = action === "add"
    ? { $addToSet: { [membershipField]: userId }, $set: { updatedAt: new Date() } }
    : { $pull: { [membershipField]: userId }, $set: { updatedAt: new Date() } }
  const result = await cohorts.updateOne({ _id: cohortId }, update)
  if (!result.matchedCount) return { kind: "cohort-missing" as const }
  const record = await cohorts.findOne({ _id: cohortId })
  return record ? { kind: "ok" as const, cohort: toCohort(record) } : { kind: "cohort-missing" as const }
}
