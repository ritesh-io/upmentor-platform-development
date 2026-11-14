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

const cohorts = authDb.collection<CohortRecord>("program_cohorts")
const userProfiles = authDb.collection<UserProfileRecord>("user_profiles")
const authUsers = authDb.collection<AuthUserRecord>("user")

let indexesReady: Promise<void> | undefined

export function ensureCohortIndexes() {
  indexesReady ??= Promise.all([
    cohorts.createIndex({ normalizedName: 1, startDate: 1 }, { unique: true, name: "unique_cohort_name_date" }),
    cohorts.createIndex({ mentorIds: 1 }, { name: "cohorts_by_mentor" }),
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
  const [records, mentorProfiles] = await Promise.all([
    cohorts.find().sort({ startDate: -1, createdAt: -1 }).limit(100).toArray(),
    userProfiles.find({ role: "mentor" }).project<UserProfileRecord>({ _id: 1, role: 1, domain: 1, skills: 1, availabilityHours: 1, weeklyCapacity: 1 }).limit(500).toArray(),
  ])

  const mentorIds = mentorProfiles.map((profile) => profile._id)
  const mongoIds = mentorIds.flatMap((id) => ObjectId.isValid(id) ? [new ObjectId(id), id] : [id])
  const accounts = mentorIds.length
    ? await authUsers.find({ _id: { $in: mongoIds } }).project<AuthUserRecord>({ _id: 1, name: 1, email: 1 }).toArray()
    : []
  const profilesById = new Map(mentorProfiles.map((profile) => [profile._id, profile]))
  const mentors: UserProfile[] = accounts.map((account) => {
    const id = account._id.toString()
    const profile = profilesById.get(id)
    return {
      id,
      name: account.name,
      email: account.email,
      role: "mentor",
      domain: profile?.domain ?? "",
      skills: profile?.skills ?? [],
      availabilityHours: profile?.availabilityHours ?? 0,
      weeklyCapacity: profile?.weeklyCapacity ?? 0,
    }
  })

  return { cohorts: records.map(toCohort), mentors }
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

export async function addMentorToProgramCohort(cohortId: string, mentorId: string) {
  await ensureCohortIndexes()
  const mentor = await userProfiles.findOne({ _id: mentorId, role: "mentor" })
  if (!mentor) return { kind: "mentor-missing" as const }

  const result = await cohorts.updateOne(
    { _id: cohortId },
    { $addToSet: { mentorIds: mentorId }, $set: { updatedAt: new Date() } },
  )
  if (!result.matchedCount) return { kind: "cohort-missing" as const }
  const record = await cohorts.findOne({ _id: cohortId })
  return record ? { kind: "ok" as const, cohort: toCohort(record) } : { kind: "cohort-missing" as const }
}

export async function removeMentorFromProgramCohort(cohortId: string, mentorId: string) {
  await ensureCohortIndexes()
  const result = await cohorts.updateOne(
    { _id: cohortId },
    { $pull: { mentorIds: mentorId }, $set: { updatedAt: new Date() } },
  )
  if (!result.matchedCount) return { kind: "cohort-missing" as const }
  const record = await cohorts.findOne({ _id: cohortId })
  return record ? { kind: "ok" as const, cohort: toCohort(record) } : { kind: "cohort-missing" as const }
}
