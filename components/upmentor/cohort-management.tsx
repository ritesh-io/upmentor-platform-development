"use client"

import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { CalendarDays, Plus, Users } from "lucide-react"
import type { Cohort, DemoData, UserProfile } from "@/lib/upmentor-demo-data"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca]"
const quietButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">{label}{children}</label>
}

const dateInput = () => new Date().toISOString().slice(0, 10)
const id = () => `cohort-${crypto.randomUUID()}`

export function CohortManagement({ data, setData }: { data: DemoData; setData: Dispatch<SetStateAction<DemoData>> }) {
  const [name, setName] = useState("")
  const [track, setTrack] = useState("Web Development")
  const [startDate, setStartDate] = useState(dateInput())
  const [leadMentorId, setLeadMentorId] = useState("")
  const mentors = data.users.filter((user) => user.role === "mentor")

  const createCohort = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cohort: Cohort = { id: id(), name: name.trim(), track, startDate, studentIds: [], mentorIds: leadMentorId ? [leadMentorId] : [], demoOnly: true }
    setData((old) => ({ ...old, cohorts: [...old.cohorts, cohort] }))
    setName("")
  }

  const addMentor = (cohortId: string, mentorId: string) => {
    if (!mentorId) return
    setData((old) => ({
      ...old,
      cohorts: old.cohorts.map((cohort) => cohort.id === cohortId ? { ...cohort, mentorIds: Array.from(new Set([...cohort.mentorIds, mentorId])) } : cohort),
    }))
  }

  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
      <div className="mb-4"><h2 className="text-sm font-semibold">Create a mentorship program</h2><p className="mt-1 text-[10px] leading-4 text-[#8991a2]">Set a learning track and optionally allocate a lead mentor.</p></div>
      <form className="flex flex-col gap-3" onSubmit={createCohort}>
        <Field label="Program or cohort name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="e.g. Web Development · Cohort 2026"/></Field>
        <Field label="Learning track"><select className={inputClass} value={track} onChange={(event) => setTrack(event.target.value)}><option>Web Development</option><option>DSA in C/C++</option><option>AI/ML</option><option>Other</option></select></Field>
        <Field label="Start date"><input className={inputClass} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required/></Field>
        <Field label="Lead mentor (optional)"><select className={inputClass} value={leadMentorId} onChange={(event) => setLeadMentorId(event.target.value)}><option value="">Assign later</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name} · {mentor.domain}</option>)}</select></Field>
        <button className={`${buttonClass} self-start`} type="submit"><Plus size={14}/> Create program</button>
      </form>
      <p className="mt-4 rounded-lg bg-[#fafaff] px-3 py-2.5 text-[10px] leading-4 text-[#77738f]">All cohorts shown here are fictional demo records. Creating a cohort does not provision user accounts or login credentials.</p>
    </section>
    <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Programs and mentor allocation</h2><p className="mt-1 text-[10px] text-[#8991a2]">{data.cohorts.length} demo cohorts</p></div><CalendarDays size={17} className="text-[#655ed2]"/></div>
      <div className="flex flex-col gap-3">{data.cohorts.map((cohort) => <CohortRow key={cohort.id} cohort={cohort} mentors={mentors} data={data} addMentor={addMentor}/>)}</div>
    </section>
  </div>
}

function CohortRow({ cohort, mentors, data, addMentor }: { cohort: Cohort; mentors: UserProfile[]; data: DemoData; addMentor: (cohortId: string, mentorId: string) => void }) {
  const [selectedMentor, setSelectedMentor] = useState("")
  const cohortMentors = mentors.filter((mentor) => cohort.mentorIds.includes(mentor.id))
  const members = data.users.filter((user) => cohort.studentIds.includes(user.id) || user.cohortId === cohort.id)

  return <article className="rounded-lg border border-[#eef0f5] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold">{cohort.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{cohort.track} · starts {new Date(`${cohort.startDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f6] px-2 py-1 text-[10px] text-[#697386]"><Users size={11}/>{members.length} mentees</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{cohortMentors.length ? cohortMentors.map((mentor) => <span key={mentor.id} className="rounded-full bg-[#f0efff] px-2.5 py-1 text-[10px] font-medium text-[#5550d6]">{mentor.name}</span>) : <span className="text-[10px] text-[#8991a2]">No mentors allocated</span>}</div>
    {mentors.length > cohortMentors.length && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); addMentor(cohort.id, selectedMentor); setSelectedMentor("") }}><label className="sr-only" htmlFor={`mentor-${cohort.id}`}>Choose a mentor for {cohort.name}</label><select id={`mentor-${cohort.id}`} className={`${inputClass} min-w-40 flex-1 py-2 text-xs`} value={selectedMentor} onChange={(event) => setSelectedMentor(event.target.value)}><option value="">Add a mentor</option>{mentors.filter((mentor) => !cohort.mentorIds.includes(mentor.id)).map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}</select><button className={quietButton} type="submit" disabled={!selectedMentor}><Plus size={13}/> Allocate</button></form>}
  </article>
}
