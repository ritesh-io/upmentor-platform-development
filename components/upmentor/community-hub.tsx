"use client"

import { CalendarDays, ExternalLink, Users } from "lucide-react"
import type { DemoData, UserProfile } from "@/lib/upmentor-demo-data"
import { LEARNING_RESOURCES } from "@/lib/upmentor-demo-data"

const kindLabels = {
  intro: "Getting started",
  hackathon: "Hackathon",
  speaker: "Speaker session",
  "study-circle": "Study circle",
} as const

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })

export function CommunityHub({ user, data, onToggleRsvp }: { user: UserProfile; data: DemoData; onToggleRsvp: (eventId: string) => void }) {
  const resources = user.role === "admin"
    ? LEARNING_RESOURCES
    : LEARNING_RESOURCES.filter((resource) => resource.tracks.some((track) => track === user.domain) || resource.id === "github-skills")
  const events = data.events.filter((event) => user.role === "admin" || event.tracks.includes(user.domain))

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
        <div className="flex flex-col gap-2">{resources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group rounded-lg border border-[#edf0f5] p-3 transition hover:border-[#c9c5fb] hover:bg-[#fbfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef]">
          <span className="block text-xs font-semibold text-[#344054] group-hover:text-[#5148d7]">{resource.title}<ExternalLink size={12} className="ml-1 inline" aria-hidden="true"/></span>
          <span className="mt-1 block text-[10px] text-[#8991a2]">{resource.provider} · {resource.tracks.filter((track) => track !== "Other").join(" / ")}</span>
        </a>)}</div>
        <div className="mt-4 rounded-lg bg-[#f8f8ff] p-3 text-[10px] leading-4 text-[#6b688c]">Mentor tip: choose one resource that fits this week’s goal, then bring questions or a small practice example to your next session.</div>
      </section>
    </div>
    <p className="text-[10px] leading-4 text-[#9299a8]">This prototype uses fictional event listings and browser-only demo RSVPs. Confirm real event details with TechNeeds before sharing them.</p>
  </div>
}
