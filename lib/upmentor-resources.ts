import "server-only"

import { randomUUID } from "node:crypto"
import { authDb } from "@/lib/mongodb"

export type LearningResourceRecord = {
  _id: string
  title: string
  description: string
  url: string
  type: "video" | "quiz" | "project"
  cohortId?: string
  createdBy: string
  createdAt: Date
}

type CohortRecord = { _id: string; name: string; mentorIds: string[]; studentIds: string[] }

const cohorts = authDb.collection<CohortRecord>("program_cohorts")
const resources = authDb.collection<LearningResourceRecord>("learning_resources")
let indexesReady: Promise<void> | undefined

export function ensureLearningResourceIndexes() {
  indexesReady ??= Promise.all([
    resources.createIndex({ cohortId: 1, createdAt: -1 }, { name: "resources_by_cohort" }),
    resources.createIndex({ createdBy: 1, createdAt: -1 }, { name: "resources_by_creator" }),
  ]).then(() => undefined)
  return indexesReady
}

export async function getLearningResourceWorkspace(userId: string, role: "mentee" | "mentor" | "admin") {
  await ensureLearningResourceIndexes()
  const visibleCohorts = role === "admin"
    ? await cohorts.find().project<CohortRecord>({ _id: 1, name: 1, mentorIds: 1, studentIds: 1 }).sort({ name: 1 }).limit(500).toArray()
    : await cohorts.find(role === "mentor" ? { mentorIds: userId } : { studentIds: userId }).project<CohortRecord>({ _id: 1, name: 1, mentorIds: 1, studentIds: 1 }).sort({ name: 1 }).limit(100).toArray()
  const cohortIds = visibleCohorts.map((cohort) => cohort._id)
  const records = await resources.find({
    $or: [{ cohortId: { $exists: false } }, ...(cohortIds.length ? [{ cohortId: { $in: cohortIds } }] : [])],
  }).sort({ createdAt: -1 }).limit(250).toArray()
  const names = new Map(visibleCohorts.map((cohort) => [cohort._id, cohort.name]))
  return {
    resources: records.map((record) => ({
      id: record._id,
      title: record.title,
      description: record.description,
      url: record.url,
      type: record.type,
      ...(record.cohortId ? { cohortId: record.cohortId, cohortName: names.get(record.cohortId) ?? "Cohort resource" } : {}),
      createdAt: record.createdAt.toISOString(),
    })),
    cohorts: visibleCohorts.map(({ _id, name }) => ({ id: _id, name })),
  }
}

export async function createLearningResource(input: {
  title: string
  description: string
  url: string
  type: LearningResourceRecord["type"]
  cohortId?: string
  createdBy: string
}) {
  await ensureLearningResourceIndexes()
  const record: LearningResourceRecord = { _id: randomUUID(), ...input, createdAt: new Date() }
  await resources.insertOne(record)
  return {
    id: record._id,
    title: record.title,
    description: record.description,
    url: record.url,
    type: record.type,
    ...(record.cohortId ? { cohortId: record.cohortId } : {}),
    createdAt: record.createdAt.toISOString(),
  }
}
