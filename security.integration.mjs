import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { rm } from "node:fs/promises"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import net from "node:net"
import { once } from "node:events"
import { MongoClient } from "mongodb"

if (existsSync(".env.development.local")) process.loadEnvFile(".env.development.local")

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) throw new Error("MONGODB_URI is required to run the isolated security integration suite.")

const databaseName = `upmsec_${randomUUID().replaceAll("-", "").slice(0, 24)}`
const mongo = new MongoClient(mongoUri)
let mongoConnected = false
let server
let passed = 0

function checkStatus(response, expected, label) {
  assert.equal(response.status, expected, `${label}: expected HTTP ${expected}, received ${response.status}`)
  passed += 1
  console.log(`PASS ${label}`)
}

async function freePort() {
  const listener = net.createServer()
  listener.listen(0, "127.0.0.1")
  await once(listener, "listening")
  const address = listener.address()
  if (!address || typeof address === "string") throw new Error("Could not allocate an isolated test port.")
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()))
  return address.port
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function startTestServer(baseUrl, port) {
  const env = {
    ...process.env,
    NODE_ENV: "development",
    BETTER_AUTH_URL: baseUrl,
    UPMENTOR_AUTH_DATABASE: databaseName,
    UPMENTOR_NEXT_DIST_DIR: ".next-security-test",
  }
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  })

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`The isolated test server exited with code ${server.exitCode}.`)
    try {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, { headers: { origin: baseUrl } })
      if (response.ok) return
    } catch {
      await delay(250)
    }
  }
  throw new Error("The isolated test server did not become ready before the deadline.")
}

async function createAccount(baseUrl, name, role, database) {
  const unique = randomUUID().replaceAll("-", "").slice(0, 18)
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: baseUrl },
    body: JSON.stringify({
      name,
      email: `security-${unique}@example.invalid`,
      username: `sec_${unique}`,
      password: `Security-${unique}-Password!`,
    }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.user?.id) throw new Error(`Could not create an isolated ${role} fixture account (HTTP ${response.status}).`)
  const cookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""]
  const cookie = cookies.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ")
  if (!cookie) throw new Error(`Better Auth did not establish a session for the isolated ${role} fixture.`)
  await database.collection("user_profiles").updateOne(
    { _id: result.user.id },
    { $set: { role, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  )
  return { id: result.user.id, cookie }
}

async function requestAs(baseUrl, account, path, method = "GET", body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      origin: baseUrl,
      ...(account ? { cookie: account.cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

const roadmapInput = {
  goal: "Build a portfolio website",
  domain: "Web Development",
  level: "Beginner",
  skills: ["HTML"],
  weeklyHours: 5,
  targetDate: "2027-01-31",
}

const profileInput = {
  domain: "Web Development",
  learningGoal: "Build a portfolio website",
  interestTags: ["React"],
  metrics: {
    completedResources: 1,
    totalResources: 3,
    overdueResources: 0,
    points: 10,
    leaderboardRank: null,
    sessionsAttended: 1,
    sessionsMissed: 0,
  },
  recommendationOptions: [],
}

try {
  await mongo.connect()
  mongoConnected = true
  const database = mongo.db(databaseName)
  await database.command({ ping: 1 })
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  await startTestServer(baseUrl, port)

  const mentee = await createAccount(baseUrl, "Security Mentee", "mentee", database)
  const otherMentee = await createAccount(baseUrl, "Unassigned Mentee", "mentee", database)
  const mentor = await createAccount(baseUrl, "Assigned Mentor", "mentor", database)
  const otherMentor = await createAccount(baseUrl, "Other Mentor", "mentor", database)
  const admin = await createAccount(baseUrl, "Security Admin", "admin", database)
  const rateLimitMentee = await createAccount(baseUrl, "Rate Limit Mentee", "mentee", database)

  const now = new Date()
  const cohortId = randomUUID()
  const otherCohortId = randomUUID()
  const cohorts = database.collection("program_cohorts")
  await cohorts.insertMany([
    { _id: cohortId, name: "Security Test Cohort A", normalizedName: "security test cohort a", track: "Web Development", startDate: "2026-11-24", mentorIds: [mentor.id], studentIds: [mentee.id], createdAt: now, updatedAt: now },
    { _id: otherCohortId, name: "Security Test Cohort B", normalizedName: "security test cohort b", track: "Web Development", startDate: "2026-11-24", mentorIds: [otherMentor.id], studentIds: [otherMentee.id], createdAt: now, updatedAt: now },
  ])

  checkStatus(await requestAs(baseUrl, null, "/api/mentorship-sessions"), 401, "anonymous session-list access is rejected")
  checkStatus(await requestAs(baseUrl, mentee, "/api/mentee-profile"), 200, "authenticated mentee can load only their profile")
  checkStatus(await requestAs(baseUrl, mentor, "/api/mentee-profile"), 403, "mentor cannot load a mentee profile")
  checkStatus(await requestAs(baseUrl, admin, "/api/admin/cohorts"), 200, "authenticated admin can load cohort management data")
  checkStatus(await requestAs(baseUrl, mentor, "/api/admin/cohorts"), 403, "mentor cannot access admin cohort data")

  const scheduled = await requestAs(baseUrl, mentor, "/api/mentorship-sessions", "POST", {
    studentId: mentee.id,
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    agenda: "Review the portfolio project",
  })
  checkStatus(scheduled, 201, "assigned mentor can schedule a persistent session")
  const scheduledBody = await scheduled.json()
  const sessionId = scheduledBody.session.id
  assert.equal(scheduledBody.session.cohortId, cohortId)
  const storedSession = await database.collection("mentorship_sessions").findOne({ _id: sessionId })
  assert.equal(storedSession?.mentorId, mentor.id)
  assert.equal(storedSession?.studentId, mentee.id)
  assert.equal(storedSession?.cohortId, cohortId)
  passed += 1
  console.log("PASS scheduled session is stored with mentor, mentee, and cohort relationships")

  checkStatus(await requestAs(baseUrl, mentor, "/api/mentorship-sessions", "POST", {
    studentId: otherMentee.id,
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    agenda: "Unauthorized mentee attempt",
  }), 403, "mentor cannot schedule an unassigned mentee")
  checkStatus(await requestAs(baseUrl, otherMentor, `/api/mentorship-sessions/${sessionId}`, "PATCH", { action: "mark-missed" }), 404, "another mentor cannot update the session")
  checkStatus(await requestAs(baseUrl, mentee, `/api/mentorship-sessions/${sessionId}`, "PATCH", { action: "mark-missed" }), 403, "mentee cannot update mentor-owned session state")
  checkStatus(await requestAs(baseUrl, admin, `/api/mentorship-sessions/${sessionId}`, "PATCH", { action: "mark-missed" }), 403, "admin cannot mutate mentor-owned sessions")

  const mentorWorkspace = await (await requestAs(baseUrl, mentor, "/api/mentorship-sessions")).json()
  assert.ok(mentorWorkspace.sessions.some((session) => session.id === sessionId))
  assert.deepEqual(mentorWorkspace.mentees.map((item) => item.id), [mentee.id])
  const otherMentorWorkspace = await (await requestAs(baseUrl, otherMentor, "/api/mentorship-sessions")).json()
  assert.equal(otherMentorWorkspace.sessions.some((session) => session.id === sessionId), false)
  const menteeWorkspace = await (await requestAs(baseUrl, mentee, "/api/mentorship-sessions")).json()
  assert.ok(menteeWorkspace.sessions.some((session) => session.id === sessionId))
  assert.equal(Object.hasOwn(menteeWorkspace.sessions.find((session) => session.id === sessionId), "rawNotes"), false)
  const otherMenteeWorkspace = await (await requestAs(baseUrl, otherMentee, "/api/mentorship-sessions")).json()
  assert.equal(otherMenteeWorkspace.sessions.some((session) => session.id === sessionId), false)
  passed += 1
  console.log("PASS session lists are scoped to the authenticated user and mentee responses omit raw notes")

  const summaryRequest = { sessionId, notes: "We discussed the portfolio project. Next action: build a responsive landing page." }
  checkStatus(await requestAs(baseUrl, null, "/api/session-summary", "POST", summaryRequest), 401, "anonymous session-summary request is rejected")
  checkStatus(await requestAs(baseUrl, mentee, "/api/session-summary", "POST", summaryRequest), 403, "mentee cannot request mentor session summaries")
  checkStatus(await requestAs(baseUrl, admin, "/api/session-summary", "POST", summaryRequest), 403, "admin cannot request mentor session summaries")
  checkStatus(await requestAs(baseUrl, otherMentor, "/api/session-summary", "POST", summaryRequest), 404, "other mentor cannot summarize an unassigned session")
  const generatedSummary = await requestAs(baseUrl, mentor, "/api/session-summary", "POST", summaryRequest)
  checkStatus(generatedSummary, 200, "assigned mentor can generate evidence-bound session insights")
  const generatedBody = await generatedSummary.json()
  assert.ok(["ai", "simulated"].includes(generatedBody.source))
  assert.ok(generatedBody.insights)
  checkStatus(await requestAs(baseUrl, mentor, "/api/session-summary", "POST", { ...summaryRequest, sessionId: randomUUID() }), 404, "summary generation requires a persisted session record")

  checkStatus(await requestAs(baseUrl, mentor, `/api/mentorship-sessions/${sessionId}`, "PATCH", {
    action: "approve-summary",
    rawNotes: summaryRequest.notes,
    content: { summaryQuotes: ["We discussed the portfolio project."], discussionQuotes: [], challengeQuotes: [], nextStepQuotes: [], actionQuotes: [] },
    actionItems: [{ title: "Invalid deadline", deadline: "2026-99-99" }],
    source: "simulated",
  }), 400, "summary payload rejects malformed follow-up deadlines")
  const approved = await requestAs(baseUrl, mentor, `/api/mentorship-sessions/${sessionId}`, "PATCH", {
    action: "approve-summary",
    rawNotes: summaryRequest.notes,
    content: {
      summaryQuotes: ["We discussed the portfolio project."],
      discussionQuotes: ["We discussed the portfolio project."],
      challengeQuotes: [],
      nextStepQuotes: ["build a responsive landing page"],
      actionQuotes: ["build a responsive landing page"],
    },
    actionItems: [{ title: "build a responsive landing page", deadline: "2026-12-31" }],
    source: "simulated",
  })
  checkStatus(approved, 200, "mentor-approved summary and action item are persisted")
  const approvedBody = await approved.json()
  assert.equal(approvedBody.session.status, "completed")
  assert.deepEqual(approvedBody.session.actionItems, ["build a responsive landing page"])
  const menteeHistory = await (await requestAs(baseUrl, mentee, "/api/mentorship-sessions")).json()
  const completedSession = menteeHistory.sessions.find((session) => session.id === sessionId)
  assert.equal(completedSession.summary, "We discussed the portfolio project.")
  assert.equal(Object.hasOwn(completedSession, "rawNotes"), false)
  passed += 1
  console.log("PASS approved session summary persists while raw notes remain mentor-only")

  checkStatus(await requestAs(baseUrl, null, "/api/roadmap", "POST", roadmapInput), 401, "anonymous roadmap request is rejected")
  checkStatus(await requestAs(baseUrl, mentee, "/api/roadmap", "POST", roadmapInput), 200, "authenticated mentee can request a roadmap")
  checkStatus(await requestAs(baseUrl, mentor, "/api/roadmap", "POST", roadmapInput), 403, "mentor cannot request a mentee roadmap")
  checkStatus(await requestAs(baseUrl, admin, "/api/roadmap", "POST", roadmapInput), 403, "admin cannot request a mentee roadmap")
  checkStatus(await requestAs(baseUrl, mentee, "/api/roadmap", "POST", { ...roadmapInput, userId: otherMentee.id }), 400, "roadmap request cannot target another user's account")

  checkStatus(await requestAs(baseUrl, null, "/api/profile-insights", "POST", profileInput), 401, "anonymous profile-insights request is rejected")
  checkStatus(await requestAs(baseUrl, mentee, "/api/profile-insights", "POST", profileInput), 200, "authenticated mentee can request profile insights")
  checkStatus(await requestAs(baseUrl, mentor, "/api/profile-insights", "POST", profileInput), 200, "authenticated mentor can request profile insights")
  checkStatus(await requestAs(baseUrl, admin, "/api/profile-insights", "POST", profileInput), 200, "authenticated admin can request profile insights")
  checkStatus(await requestAs(baseUrl, mentee, "/api/profile-insights", "POST", { ...profileInput, userId: otherMentee.id }), 400, "profile-insights request cannot target another user's account")

  const rateLimitResults = []
  for (let index = 0; index < 13; index += 1) {
    rateLimitResults.push(await requestAs(baseUrl, rateLimitMentee, "/api/profile-insights", "POST", {}))
  }
  for (const response of rateLimitResults.slice(0, 12)) checkStatus(response, 400, "invalid requests are schema-rejected before generation")
  checkStatus(rateLimitResults[12], 429, "the thirteenth request in one minute is rate-limited")
  console.log(`Rate-limit backend: ${process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? "Upstash Redis" : process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "Upstash Redis" : "development-only in-memory fallback"}`)
  console.log(`Authenticated security integration suite passed ${passed} checks using database ${databaseName}.`)
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM")
    const exited = await Promise.race([once(server, "exit").then(() => true), delay(10_000).then(() => false)])
    if (!exited) server.kill("SIGKILL")
  }
  try {
    if (mongoConnected) {
      try {
        const database = mongo.db(databaseName)
        const collections = await database.listCollections({}, { nameOnly: true }).toArray()
        let removedDocuments = 0
        for (const { name } of collections) {
          if (name.startsWith("system.")) continue
          const result = await database.collection(name).deleteMany({})
          removedDocuments += result.deletedCount
        }
        console.log(`Cleared ${removedDocuments} temporary fixture documents from the isolated test database.`)
      } finally {
        await mongo.close()
      }
    }
  } finally {
    await rm(".next-security-test", { recursive: true, force: true })
  }
}
