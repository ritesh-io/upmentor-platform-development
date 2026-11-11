import { createHash, createHmac } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { authDb, mongoClient } from "@/lib/mongodb"

export const APP_ROLES = ["mentee", "mentor", "admin"] as const
export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_HOME: Record<AppRole, string> = {
  mentee: "/mentee",
  mentor: "/mentor",
  admin: "/admin",
}

type UserProfileRecord = {
  _id: string
  role?: AppRole
  createdAt?: Date
  updatedAt?: Date
}

type SystemRecord = {
  _id: string
  adminUserId?: string
}

type MentorInviteRecord = {
  tokenHash: string
  invitedEmail?: string
  invitedBy: string
  createdAt: Date
  expiresAt: Date
  usedAt?: Date
  usedBy?: string
}

const userProfiles = authDb.collection<UserProfileRecord>("user_profiles")
const systemSettings = authDb.collection<SystemRecord>("system_settings")
const mentorInvites = authDb.collection<MentorInviteRecord>("mentor_invites")
const rateLimits = authDb.collection<{ _id: string; count: number; expiresAt: Date }>("auth_rate_limits")

let indexesPromise: Promise<void> | undefined

export function ensureAuthIndexes() {
  indexesPromise ??= Promise.all([
    mentorInvites.createIndex({ tokenHash: 1 }, { unique: true }),
    mentorInvites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]).then(() => undefined)
  return indexesPromise
}

export async function getAppRole(userId: string): Promise<AppRole> {
  await ensureAuthIndexes()
  const bootstrap = await systemSettings.findOne({ _id: "admin-bootstrap" })
  if (bootstrap?.adminUserId === userId) return "admin"

  const profile = await userProfiles.findOne({ _id: userId })
  if (profile?.role && APP_ROLES.includes(profile.role)) return profile.role

  await userProfiles.updateOne(
    { _id: userId },
    { $setOnInsert: { role: "mentee", createdAt: new Date() }, $set: { updatedAt: new Date() } },
    { upsert: true },
  )
  return "mentee"
}

export async function getRequestPrincipal(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) return null
  return { user: session.user, role: await getAppRole(session.user.id) }
}

export async function getServerPrincipal() {
  return getRequestPrincipal(await headers())
}

export async function requirePageSession() {
  const principal = await getServerPrincipal()
  if (!principal) redirect("/sign-in?next=/setup-admin")
  return principal
}

export async function requirePageRole(role: AppRole) {
  const principal = await getServerPrincipal()
  if (!principal) redirect(`/sign-in?next=${encodeURIComponent(ROLE_HOME[role])}`)
  if (principal.role !== role) redirect(ROLE_HOME[principal.role])
  return principal
}

function configuredOrigins() {
  const origins = new Set<string>(["http://localhost:3000", "http://localhost:3001"])
  const addOrigin = (value?: string) => {
    if (!value) return
    try {
      origins.add(new URL(value.includes("://") ? value : `https://${value}`).origin)
    } catch {
      return
    }
  }

  if (process.env.NODE_ENV === "development") {
    addOrigin(process.env.V0_RUNTIME_URL)
    addOrigin(process.env.V0_DEV_APP_URL)
    addOrigin(process.env.V0_BUILD_URL)
    addOrigin(process.env.V0_SANDBOX_URL)
  }
  if (process.env.NODE_ENV === "production") {
    addOrigin(process.env.VERCEL_URL)
    addOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  }
  if (process.env.BETTER_AUTH_URL) addOrigin(process.env.BETTER_AUTH_URL)
  return origins
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return configuredOrigins().has(new URL(origin).origin)
  } catch {
    return false
  }
}

export async function isAdminBootstrapped() {
  await ensureAuthIndexes()
  return Boolean(await systemSettings.findOne({ _id: "admin-bootstrap" }))
}

export async function getMentorInviteDetails(token: string) {
  if (token.length < 32 || token.length > 128) return null
  await ensureAuthIndexes()
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const invite = await mentorInvites.findOne({ tokenHash, expiresAt: { $gt: new Date() }, usedAt: { $exists: false } })
  return invite ? { invitedEmail: invite.invitedEmail } : null
}

export async function createMentorInvite(token: string, invitedBy: string, invitedEmail?: string) {
  await ensureAuthIndexes()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  await mentorInvites.insertOne({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    ...(invitedEmail ? { invitedEmail: invitedEmail.toLowerCase() } : {}),
    invitedBy,
    createdAt: now,
    expiresAt,
  })
  return expiresAt
}

export async function consumeMentorInvite(token: string, userId: string, email: string) {
  if (token.length < 32 || token.length > 128) return false
  await ensureAuthIndexes()
  const mongoSession = mongoClient.startSession()
  const now = new Date()
  const tokenHash = createHash("sha256").update(token).digest("hex")
  let accepted = false

  try {
    await mongoSession.withTransaction(async () => {
      const result = await mentorInvites.updateOne(
        {
          tokenHash,
          expiresAt: { $gt: now },
          usedAt: { $exists: false },
          $or: [{ invitedEmail: { $exists: false } }, { invitedEmail: email.toLowerCase() }],
        },
        { $set: { usedAt: now, usedBy: userId } },
        { session: mongoSession },
      )
      if (result.modifiedCount !== 1) return

      await userProfiles.updateOne(
        { _id: userId },
        { $set: { role: "mentor", updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true, session: mongoSession },
      )
      accepted = true
    })
  } finally {
    await mongoSession.endSession()
  }

  return accepted
}

export async function checkBootstrapRateLimit(request: Request) {
  await ensureAuthIndexes()
  const windowMs = 15 * 60 * 1000
  const windowId = Math.floor(Date.now() / windowMs)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET must be configured.")
  const ipHash = createHmac("sha256", secret).update(ip).digest("hex")
  const id = `bootstrap:${ipHash}:${windowId}`

  await rateLimits.updateOne(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((windowId + 1) * windowMs) } },
    { upsert: true },
  )
  const bucket = await rateLimits.findOne({ _id: id })
  return (bucket?.count ?? 0) > 5
}

export async function claimInitialAdmin(userId: string) {
  await ensureAuthIndexes()
  const existing = await systemSettings.findOne({ _id: "admin-bootstrap" })
  if (existing) return existing.adminUserId === userId ? "already-claimed-by-user" : "already-claimed"

  try {
    await systemSettings.insertOne({ _id: "admin-bootstrap", adminUserId: userId })
    await userProfiles.updateOne(
      { _id: userId },
      { $set: { role: "admin", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    )
    return "claimed"
  } catch (error) {
    const winner = await systemSettings.findOne({ _id: "admin-bootstrap" })
    if (winner?.adminUserId === userId) return "already-claimed-by-user"
    if ((error as { code?: number }).code === 11000 || winner) return "already-claimed"
    throw error
  }
}
