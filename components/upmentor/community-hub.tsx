"use client"

import { useState, type FormEvent } from "react"
import { CalendarDays, ExternalLink, Plus, Users } from "lucide-react"
import type { DemoData, ResourceType, UserProfile } from "@/lib/upmentor-demo-data"
import { LEARNING_RESOURCES } from "@/lib/upmentor-demo-data"

export type ResourceItem = { id: string; title: string; description: string; url: string; type: ResourceType; cohortId?: string; cohortName?: string }
export type CohortOption = { id: string; name: string }

const kindLabels = {
  intro: "Getting started",
  hackathon: "Hackathon",
  speaker: "Speaker session",
  "study-circle": "Study circle",
} as const

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

export function CommunityHub({ user, data, onToggleRsvp, initialResources = [], cohorts = [], authenticated = false }: { user: UserProfile; data: DemoData; onToggleRsvp: (eventId: string) => void; initialResources?: ResourceItem[]; cohorts?: CohortOption[]; authenticated?: boolean }) {
  const [customResources, setCustomResources] = useState(initialResources)
  const [resourceMessage, setResourceMessage] = useState("")
  const [savingResource, setSavingResource] = useState(false)
  const curatedResources = user.role === "admin"
    ? LEARNING_RESOURCES
    : LEARNING_RESOURCES.filter((resource) => resource.tracks.some((track) => track === user.domain) || resource.id === "github-skills")
  const events = data.events.filter((event) => user.role === "admin" || event.tracks.includes(user.domain))

  async function createResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setSavingResource(true)
    setResourceMessage("")
    try {
      const response = await fetch("/api/learning-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: values.get("title"), description: values.get("description"), url: values.get("url"), type: values.get("type"), cohortId: values.get("cohortId") || undefined }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The resource could not be saved.")
      setCustomResources((current) => [result.resource, ...current])
      setResourceMessage("Resource shared with the selected cohort.")
      form.reset()
    } catch (error) {
      setResourceMessage(error instanceof Error ? error.message : "The resource could not be saved.")
    } finally {
      setSavingResource(false)
    }
  }

  return <div className="flex flex-col gap-5">
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-[#172033]">Upcoming community events</h2><p className="mt-1 text-[10px] text-[#8991a2]">Sample calendar only · not live TechNeeds announcements</p></div>
          <CalendarDays size={17} className="text-[#5a52e8]" aria-hidden="true"/>
        </div>
        {events.length ? <div className="flex flex-col gap-3">{events.map((event) => {
          const going = data.eventRsvps[event.id]?.includes(user.id) || false
          return <article key={event.id} className="rounded-lg border border-[#edf0f5] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><span className="rounded-full bg-[#f0efff] px-2 py-1 text-[9px] font-semibold text-[#5148d7]">{kindLabels[event.kind]}</span><h3 className="mt-2 text-xs font-semibold text-[#172033]">{event.title}</h3></div>
              <time className="shrink-0 text-[10px] font-medium text-[#677187]" dateTime={event.startsAt}>{day(event.startsAt)} · {new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#697386]">{event.description}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] text-[#8991a2]">{event.format} · {event.tracks.join(", ")}</span>
              <button type="button" className={going ? "inline-flex items-center gap-1.5 rounded-lg border border-[#d9d5ff] bg-[#f3f2ff] px-3 py-2 text-[10px] font-semibold text-[#5148d7]" : "inline-flex items-center gap-1.5 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-[10px] font-semibold text-[#505a6e] hover:bg-[#f8f8fc]"} aria-pressed={going} onClick={() => onToggleRsvp(event.id)}>
                <Users size={13} aria-hidden="true"/>{going ? "Interested" : "I’m interested"} <span className="text-[#8991a2]">· {data.eventRsvps[event.id]?.length || 0}</span>
              </button>
            </div>
          </article>
        })}</div> : <p className="rounded-lg border border-dashed border-[#e1e4ed] px-4 py-7 text-center text-xs text-[#828b9c]">No sample events are listed for this track.</p>}
      </section>

      <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#172033]">Learning resources</h2><p className="mt-1 text-[10px] text-[#8991a2]">Curated public documentation and practice</p></div><ExternalLink size={16} className="text-[#5a52e8]" aria-hidden="true"/></div>
        <div className="flex flex-col gap-2">{curatedResources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group rounded-lg border border-[#edf0f5] p-3 transition hover:border-[#c9c5fb] hover:bg-[#fbfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef]">
          <span className="block text-xs font-semibold text-[#344054] group-hover:text-[#5148d7]">{resource.title}<ExternalLink size={12} className="ml-1 inline" aria-hidden="true"/></span>
          <span className="mt-1 block text-[10px] text-[#8991a2]">{resource.provider} · {resource.tracks.filter((track) => track !== "Other").join(" / ")}</span>
        </a>)}{customResources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group rounded-lg border border-[#edf0f5] p-3 transition hover:border-[#c9c5fb] hover:bg-[#fbfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef]">
          <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#344054] group-hover:text-[#5148d7]">{resource.title}<span className="rounded-full bg-[#f0efff] px-2 py-0.5 text-[9px] font-medium capitalize text-[#5148d7]">{resource.type}</span><ExternalLink size={12} aria-hidden="true"/></span>
          {resource.description && <span className="mt-1 block text-[10px] leading-4 text-[#778094]">{resource.description}</span>}
          <span className="mt-1 block text-[10px] text-[#8991a2]">{resource.cohortName || "Program resource"}</span>
        </a>)}</div>
        {authenticated && (user.role === "mentor" || user.role === "admin") && <form onSubmit={createResource} className="mt-4 rounded-lg border border-[#e8e8f5] bg-[#fbfbff] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#344054]"><Plus size={14} aria-hidden="true"/>Share a learning resource</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275]">Title<input required name="title" maxLength={120} className="rounded-md border border-[#e4e7ef] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#8b85ef]" placeholder="e.g. Responsive design walkthrough"/></label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275]">Resource type<select name="type" className="rounded-md border border-[#e4e7ef] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#8b85ef]"><option value="video">Video</option><option value="quiz">Quiz</option><option value="project">Project</option></select></label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275] sm:col-span-2">HTTPS link<input required name="url" type="url" pattern="https://.*" maxLength={2048} className="rounded-md border border-[#e4e7ef] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#8b85ef]" placeholder="https://…"/></label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275] sm:col-span-2">Description<textarea name="description" rows={2} maxLength={1000} className="resize-y rounded-md border border-[#e4e7ef] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#8b85ef]" placeholder="What should learners know or do with this resource?"/></label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-[#596275] sm:col-span-2">Share with<select required={user.role === "mentor"} name="cohortId" defaultValue="" className="rounded-md border border-[#e4e7ef] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#8b85ef]"><option value="">{user.role === "admin" ? "All program members" : "Choose a cohort"}</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p aria-live="polite" className="text-[10px] text-[#778094]">{resourceMessage}</p><button type="submit" disabled={savingResource || (user.role === "mentor" && cohorts.length === 0)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{savingResource ? "Saving…" : "Share resource"}</button></div>
          {user.role === "mentor" && cohorts.length === 0 && <p className="mt-2 text-[10px] text-[#9b5c22]">You need an assigned cohort before sharing learning resources.</p>}
        </form>}
        <div className="mt-4 rounded-lg bg-[#f8f8ff] p-3 text-[10px] leading-4 text-[#6b688c]">Mentor tip: choose one resource that fits this week’s goal, then bring questions or a small practice example to your next session.</div>
      </section>
    </div>
    <p className="text-[10px] leading-4 text-[#9299a8]">This prototype uses fictional event listings and browser-only demo RSVPs. Confirm real event details with TechNeeds before sharing them.</p>
  </div>
}
