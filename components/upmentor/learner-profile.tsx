"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ArrowUpRight, BadgeCheck, BookOpen, CircleUserRound, Flame, LoaderCircle, Sparkles, Trophy } from "lucide-react"
import type { ProfileInsightsContent } from "@/lib/upmentor-ai-contracts"
import { LEARNING_RESOURCES, type DemoData, type UserProfile } from "@/lib/upmentor-demo-data"

type RecommendationOption = { id: string; title: string; kind: "task" | "resource"; url?: string }
type LeaderboardEntry = { id: string; name: string; points: number; completed: number; rank: number }
type Props = { user: UserProfile; data: DemoData }

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50"
const quietButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]"

export function getLeaderboard(data: DemoData): LeaderboardEntry[] {
  const sorted = data.users.filter((user) => user.role === "mentee").map((user) => {
    const tasks = data.roadmaps.find((roadmap) => roadmap.studentId === user.id)?.stages.flatMap((stage) => stage.tasks) || []
    return {
      id: user.id,
      name: user.name,
      points: tasks.reduce((sum, task) => sum + (task.status === "approved" ? task.review?.score || 0 : 0), 0),
      completed: tasks.filter((task) => task.status === "approved").length,
      rank: 0,
    }
  }).sort((a, b) => b.points - a.points || b.completed - a.completed || a.name.localeCompare(b.name))

  let rank = 0
  let previousPoints = -1
  sorted.forEach((entry, index) => {
    if (entry.points !== previousPoints) rank = index + 1
    entry.rank = rank
    previousPoints = entry.points
  })
  return sorted
}

function fallbackSummary(metrics: { completedResources: number; totalResources: number; overdueResources: number; points: number; leaderboardRank: number | null }, domain: string) {
  const rank = metrics.leaderboardRank ? ` Current demo leaderboard rank: ${metrics.leaderboardRank}.` : ""
  const overdue = metrics.overdueResources ? ` ${metrics.overdueResources} resource${metrics.overdueResources === 1 ? " is" : "s are"} past its suggested deadline; choose one manageable catch-up step.` : ""
  return `${metrics.completedResources} of ${metrics.totalResources} learning resources are approved in ${domain}, for ${metrics.points} points so far.${rank}${overdue} This is a rules-based demo summary, not a validated prediction.`
}

function avatarColors(domain: string) {
  const normalized = domain.toLowerCase()
  if (normalized.includes("dsa") || normalized.includes("c/c++")) return "from-[#365c6e] to-[#769da0]"
  if (normalized.includes("ai") || normalized.includes("ml")) return "from-[#665293] to-[#b08eb8]"
  if (normalized.includes("web")) return "from-[#5b6e9a] to-[#97a8c7]"
  return "from-[#73674f] to-[#b6a680]"
}

type AvatarArtwork = { src: string; label: string }

function avatarArtwork(domain: string, skills: string[]): AvatarArtwork {
  const profile = `${domain} ${skills.join(" ")}`.toLowerCase()
  if (/(dsa|algorithm|data structure|c\/c\+\+|competitive programming)/.test(profile)) {
    return { src: "/avatars/algorithms.png", label: "Algorithms" }
  }
  if (/(artificial intelligence|machine learning|\bai\b|\bml\b)/.test(profile)) {
    return { src: "/avatars/ai-ml.png", label: "AI and machine learning" }
  }
  return { src: "/avatars/web-development.png", label: "Web development" }
}

function ProfileAvatar({ artwork, domain, initials, rank, completed }: { artwork: AvatarArtwork; domain: string; initials: string; rank: number | null; completed: number }) {
  const [imageFailed, setImageFailed] = useState(false)
  const engagementRing = rank === 1 ? "ring-2 ring-amber-400" : completed >= 3 ? "ring-2 ring-emerald-400" : "ring-2 ring-violet-400"

  return <div className={`relative grid size-[76px] shrink-0 place-items-center rounded-[24px] bg-gradient-to-br ${avatarColors(domain)} p-[2px] ${engagementRing}`}>
    {imageFailed
      ? <span className="grid size-[72px] place-items-center rounded-[21px] bg-[#171e30] text-xl font-semibold text-white">{initials}</span>
      : <Image src={artwork.src} alt={`AI-generated sample avatar artwork for ${artwork.label} learners`} width={72} height={72} sizes="72px" className="size-[72px] rounded-[21px] object-cover" onError={() => setImageFailed(true)} />}
    <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-white bg-[#f1efff] text-[#5148d7]" aria-hidden="true"><Sparkles size={13}/></span>
  </div>
}

export function LearnerProfile({ user, data }: Props) {
  const [insights, setInsights] = useState<ProfileInsightsContent | null>(null)
  const [source, setSource] = useState<"ai" | "simulated" | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const leaderboard = useMemo(() => getLeaderboard(data), [data])
  const userRank = leaderboard.find((entry) => entry.id === user.id)
  const learnerIds = user.role === "mentee"
    ? [user.id]
    : user.role === "mentor"
      ? data.assignments.filter((assignment) => assignment.mentorId === user.id).map((assignment) => assignment.studentId)
      : data.users.filter((item) => item.role === "mentee").map((item) => item.id)
  const tasks = data.roadmaps.filter((roadmap) => learnerIds.includes(roadmap.studentId)).flatMap((roadmap) => roadmap.stages.flatMap((stage) => stage.tasks))
  const sessions = data.sessions.filter((session) => user.role === "mentee" ? session.studentId === user.id : user.role === "mentor" ? session.mentorId === user.id : true)
  const completedResources = tasks.filter((task) => task.status === "approved").length
  const totalResources = tasks.length
  const overdueResources = tasks.filter((task) => task.status !== "approved" && new Date(`${task.deadline}T23:59:59`).getTime() < Date.now()).length
  const points = tasks.reduce((sum, task) => sum + (task.status === "approved" ? task.review?.score || 0 : 0), 0)
  const leaderboardRank = user.role === "mentee" ? userRank?.rank ?? null : null
  const metrics = {
    completedResources,
    totalResources,
    overdueResources,
    points,
    leaderboardRank,
    sessionsAttended: sessions.filter((session) => session.status === "completed").length,
    sessionsMissed: sessions.filter((session) => session.status === "missed").length,
  }
  const fallbackOptions: RecommendationOption[] = tasks.filter((task) => task.status !== "approved").slice(0, 8).map((task) => ({ id: task.id, title: task.title, kind: "task" }))
  const domainResources: RecommendationOption[] = LEARNING_RESOURCES.filter((resource) => resource.tracks.some((track) => track === user.domain || track === "Other")).slice(0, 8).map((resource) => ({ id: resource.id, title: resource.title, kind: "resource", url: resource.url }))
  const options = [...fallbackOptions, ...domainResources].filter((option, index, all) => all.findIndex((item) => item.id === option.id) === index).slice(0, 12)
  const selectedRecommendations = insights
    ? insights.recommendationIds.map((id) => options.find((option) => option.id === id)).filter((item): item is RecommendationOption => Boolean(item))
    : options.slice(0, 3)
  const badges = [
    ...(user.skills.slice(0, 3).map((skill) => ({ label: skill, icon: "skill" as const }))),
    ...(completedResources > 0 ? [{ label: `${completedResources} approved resource${completedResources === 1 ? "" : "s"}`, icon: "progress" as const }] : []),
    ...(sessions.filter((session) => session.status === "completed").length > 0 ? [{ label: "Mentorship active", icon: "session" as const }] : []),
  ]

  const generateInsights = async () => {
    setLoading(true)
    setError("")
    const request = {
      domain: user.domain,
      learningGoal: user.learningGoal || "",
      interestTags: user.skills.slice(0, 12),
      metrics,
      recommendationOptions: options.map(({ id, title, kind }) => ({ id, title, kind })),
    }

    try {
      const response = await fetch("/api/profile-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      const result = await response.json()
      if (!response.ok || !result.content?.summary) throw new Error("Personalized insights are unavailable")
      const allowedIds = new Set(options.map((option) => option.id))
      setInsights({
        summary: String(result.content.summary),
        recommendationIds: Array.isArray(result.content.recommendationIds) ? result.content.recommendationIds.filter((id: unknown): id is string => typeof id === "string" && allowedIds.has(id)).slice(0, 3) : [],
      })
      setSource(result.source === "ai" ? "ai" : "simulated")
    } catch {
      setInsights({ summary: fallbackSummary(metrics, user.domain), recommendationIds: options.slice(0, 3).map((option) => option.id) })
      setSource("simulated")
      setError("AI is unavailable right now, so a rules-based demo profile was generated.")
    } finally {
      setLoading(false)
    }
  }

  const initials = user.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
  const avatar = avatarArtwork(user.domain, user.skills)
  const roleMetrics = user.role === "mentee"
    ? [{ label: "Resources approved", value: `${completedResources}/${totalResources}` }, { label: "Points earned", value: String(points) }, { label: "Leaderboard rank", value: leaderboardRank ? `#${leaderboardRank}` : "—" }]
    : user.role === "mentor"
      ? [{ label: "Assigned mentees", value: String(learnerIds.length) }, { label: "Resources approved", value: `${completedResources}/${totalResources}` }, { label: "Sessions held", value: String(metrics.sessionsAttended) }]
      : [{ label: "Active cohorts", value: String(data.cohorts.length) }, { label: "Mentees", value: String(data.users.filter((item) => item.role === "mentee").length) }, { label: "Resources approved", value: `${completedResources}/${totalResources}` }]

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)]">
    <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)] sm:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <ProfileAvatar key={user.id} artwork={avatar} domain={user.domain} initials={initials} rank={userRank?.rank ?? null} completed={completedResources} />
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7d8597]">Personal learning profile · demo workspace</p><h2 className="mt-1 text-xl font-semibold tracking-[-.03em]">{user.name}</h2><p className="mt-1 text-xs text-[#778094]">{user.role === "mentee" ? "Mentee" : user.role === "mentor" ? "Mentor" : "Program admin"} · {user.domain}</p>{user.enrollmentNumber && <p className="mt-1 text-[10px] text-[#8991a2]">Demo enrollment ID: {user.enrollmentNumber} · not a login credential</p>}</div>
        <span className="rounded-full border border-[#e7e5ff] bg-[#fafaff] px-2.5 py-1.5 text-[10px] font-semibold text-[#5a52e8]">AI-generated sample · {avatar.label}</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{roleMetrics.map((metric) => <div key={metric.label} className="rounded-lg bg-[#f7f8fc] p-3.5"><p className="text-[10px] text-[#8991a2]">{metric.label}</p><p className="mt-1 text-lg font-semibold">{metric.value}</p></div>)}</div>
      <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Personalized performance summary</h3><p className="mt-1 text-[10px] text-[#8991a2]">Built from approved work, sessions, interests, and current demo activity.</p></div><button className={buttonClass} type="button" onClick={generateInsights} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={14}/> : <Sparkles size={14}/>}Generate profile insights</button></div>
        {insights ? <div className="mt-3 rounded-lg border border-[#e7e5ff] bg-[#fafaff] p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#6f68c9]">{source === "ai" ? "AI-generated · evidence-based" : "Simulated · rules-based"}</p>{source === "simulated" && <span className="text-[10px] text-[#8b92a3]">Demo insight</span>}</div><p className="text-xs leading-6 text-[#505a6e]">{insights.summary}</p></div> : <p className="mt-3 rounded-lg border border-dashed border-[#e1e4ed] p-4 text-xs leading-5 text-[#778094]">Generate a summary from recorded learning activity. Unsupported achievements and predictions are intentionally excluded.</p>}
        {error && <p role="status" className="mt-2 text-[10px] text-[#a34139]">{error}</p>}
      </div>
      <div className="mt-6"><h3 className="text-sm font-semibold">Interest and progress badges</h3><div className="mt-3 flex flex-wrap gap-2">{badges.length ? badges.map((badge) => <span key={badge.label} className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e7f8] bg-[#f8f7ff] px-2.5 py-1.5 text-[10px] font-medium text-[#5c55ce]">{badge.icon === "progress" ? <Flame size={12}/> : badge.icon === "session" ? <BadgeCheck size={12}/> : <BookOpen size={12}/>} {badge.label}</span>) : <p className="text-xs text-[#8991a2]">Add interest tags during onboarding to personalize this profile.</p>}</div></div>
      <div className="mt-6"><div className="flex items-center gap-2"><BookOpen size={15} className="text-[#6d67c7]"/><h3 className="text-sm font-semibold">Recommended next steps</h3></div>{selectedRecommendations.length ? <ul className="mt-3 flex flex-col gap-2">{selectedRecommendations.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#eef0f5] px-3.5 py-3"><div><p className="text-xs font-medium">{item.title}</p><p className="mt-1 text-[10px] text-[#8991a2]">{item.kind === "task" ? "Assigned learning task" : "Curated learning resource"}</p></div>{item.url && <a className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#5148d7] underline" href={item.url} target="_blank" rel="noreferrer">Open <ArrowUpRight size={12}/></a>}</li>)}</ul> : <p className="mt-3 text-xs text-[#8991a2]">No pending tasks or curated resources match this profile yet.</p>}</div>
      <p className="mt-6 text-[10px] leading-4 text-[#9299a8]">Fictional demo profile. Avatar artwork is AI-generated and selected from the profile&apos;s track and interests; it is illustrative and not an identity check.</p>
    </section>
    <div className="flex flex-col gap-5">
      <LeaderboardCard data={data} currentUserId={user.role === "mentee" ? user.id : undefined}/>
      <section className="rounded-xl border border-[#e7e9f1] bg-white p-5"><div className="flex items-center gap-2"><CircleUserRound size={16} className="text-[#6d67c7]"/><h2 className="text-sm font-semibold">Profile snapshot</h2></div><p className="mt-3 text-xs leading-5 text-[#697386]">{user.learningGoal || "Set a learning goal in onboarding to make your profile recommendations more specific."}</p><div className="mt-4 flex flex-wrap gap-2">{user.skills.map((skill) => <span key={skill} className="rounded-full bg-[#f1f2f6] px-2.5 py-1 text-[10px] text-[#596275]">{skill}</span>)}</div><div className="mt-4 border-t border-[#eef0f5] pt-4"><p className="text-[10px] text-[#8991a2]">Sessions attended · {metrics.sessionsAttended}</p><p className="mt-1 text-[10px] text-[#8991a2]">Missed sessions · {metrics.sessionsMissed}</p><p className="mt-1 text-[10px] text-[#8991a2]">Pending resources · {Math.max(0, totalResources - completedResources)}</p></div></section>
      <section className="rounded-xl border border-[#e8e7ff] bg-[#fbfaff] p-4"><div className="flex items-start gap-2"><Trophy size={15} className="mt-0.5 shrink-0 text-[#615bd0]"/><p className="text-[10px] leading-5 text-[#69658f]">Leaderboard points come only from mentor-approved submissions. Activity indicators are transparent demo metrics, not scientific or predictive assessments.</p></div></section>
    </div>
  </div>
}

export function LeaderboardCard({ data, currentUserId }: { data: DemoData; currentUserId?: string }) {
  const leaderboard = getLeaderboard(data).slice(0, 5)
  return <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Cohort leaderboard</h2><p className="mt-1 text-[10px] text-[#8991a2]">Live demo points from approved work</p></div><Trophy size={17} className="text-[#655ed2]"/></div>
    {leaderboard.length ? <ol className="mt-4 flex flex-col gap-2">{leaderboard.map((entry) => <li key={entry.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${entry.id === currentUserId ? "bg-[#f0efff]" : "bg-[#f7f8fc]"}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-[#5550d6]">{entry.rank}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{entry.name}{entry.id === currentUserId ? " · You" : ""}</p><p className="mt-0.5 text-[10px] text-[#8991a2]">{entry.completed} approved resource{entry.completed === 1 ? "" : "s"}</p></div><span className="text-xs font-semibold text-[#5550d6]">{entry.points} pts</span></li>)}</ol> : <p className="mt-4 text-xs text-[#8991a2]">No mentees are listed yet.</p>}
    <p className="mt-3 text-[10px] text-[#9299a8]">Sample accounts only · not real TechNeeds standings</p>
  </section>
}
