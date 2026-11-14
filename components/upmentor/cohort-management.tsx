"use client"

import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { CalendarDays, Plus, UserMinus, Users } from "lucide-react"
import type { Cohort, DemoData, UserProfile } from "@/lib/upmentor-demo-data"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca]"
const quietButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">{label}{children}</label>
}

const dateInput = () => new Date().toISOString().slice(0, 10)
const id = () => `cohort-${crypto.randomUUID()}`

export function CohortManagement({ data, setData, authenticated = false }: { data: DemoData; setData: Dispatch<SetStateAction<DemoData>>; authenticated?: boolean }) {
  const [name, setName] = useState("")
  const [track, setTrack] = useState("Web Development")
  const [startDate, setStartDate] = useState(dateInput())
  const [leadMentorId, setLeadMentorId] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const mentors = data.users.filter((user) => user.role === "mentor")
  const mentees = data.users.filter((user) => user.role === "mentee")

  const createCohort = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError("")
    setMessage("")
    const form = event.currentTarget
    try {
      let cohort: Cohort
      if (authenticated) {
        const response = await fetch("/api/admin/cohorts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), track, startDate, leadMentorId }),
        })
        const result = await response.json().catch(() => null) as { cohort?: Cohort; error?: string } | null
        if (!response.ok || !result?.cohort) throw new Error(result?.error || "The cohort could not be created.")
        cohort = result.cohort
        setData((old) => ({ ...old, cohorts: [cohort, ...old.cohorts.filter((item) => item.id !== cohort.id)] }))
        setMessage("Cohort created and saved to MongoDB.")
      } else {
        cohort = { id: id(), name: name.trim(), track, startDate, studentIds: [], mentorIds: leadMentorId ? [leadMentorId] : [], demoOnly: true }
        setData((old) => ({ ...old, cohorts: [...old.cohorts, cohort] }))
        setMessage("Demo cohort created in this browser.")
      }
      setName("")
      setLeadMentorId("")
      form.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The cohort could not be created.")
    } finally {
      setPending(false)
    }
  }

  const changeMembership = async (cohortId: string, userId: string, role: "mentor" | "mentee", action: "add" | "remove") => {
    if (!userId || pending) return
    setPending(true)
    setError("")
    setMessage("")
    try {
      if (authenticated) {
        const response = await fetch("/api/admin/cohorts", {
          method: action === "add" ? "PATCH" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cohortId, [role === "mentor" ? "mentorId" : "menteeId"]: userId }),
        })
        const result = await response.json().catch(() => null) as { cohort?: Cohort; error?: string } | null
        const subject = role === "mentor" ? "mentor allocation" : "student enrollment"
        if (!response.ok || !result?.cohort) throw new Error(result?.error || `The ${subject} could not be changed.`)
        setData((old) => ({ ...old, cohorts: old.cohorts.map((item) => item.id === cohortId ? result.cohort! : item) }))
        setMessage(action === "add" ? `${role === "mentor" ? "Mentor allocation" : "Student enrollment"} saved to MongoDB.` : `${role === "mentor" ? "Mentor allocation" : "Student enrollment"} removed from MongoDB.`)
      } else {
        setData((old) => ({
          ...old,
          cohorts: old.cohorts.map((cohort) => {
            if (cohort.id !== cohortId) return cohort
            const field = role === "mentor" ? "mentorIds" : "studentIds"
            return { ...cohort, [field]: action === "add" ? Array.from(new Set([...cohort[field], userId])) : cohort[field].filter((id) => id !== userId) }
          }),
        }))
        setMessage(action === "add" ? `${role === "mentor" ? "Mentor allocated" : "Student enrolled"} in the demo.` : `${role === "mentor" ? "Mentor removed" : "Student unenrolled"} from the demo cohort.`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The cohort membership could not be changed.")
    } finally {
      setPending(false)
    }
  }

  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
      <div className="mb-4"><h2 className="text-sm font-semibold">Create a mentorship program</h2><p className="mt-1 text-[10px] leading-4 text-[#8991a2]">Set a learning track and optionally allocate a lead mentor.</p></div>
      <form className="flex flex-col gap-3" onSubmit={createCohort}>
        <Field label="Program or cohort name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="e.g. Web Development · Cohort 2026"/></Field>
        <Field label="Learning track"><select className={inputClass} value={track} onChange={(event) => setTrack(event.target.value)}><option>Web Development</option><option>DSA in C/C++</option><option>AI/ML</option><option>Other</option></select></Field>
        <Field label="Start date"><input className={inputClass} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required/></Field>
        <Field label="Lead mentor (optional)"><select className={inputClass} value={leadMentorId} onChange={(event) => setLeadMentorId(event.target.value)}><option value="">Assign later</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name} · {mentor.domain}</option>)}</select></Field>
        <button className={`${buttonClass} self-start`} type="submit" disabled={pending}><Plus size={14}/> {pending ? "Saving…" : "Create program"}</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-2.5 text-xs text-[#a23c3c]">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg border border-[#dcefe7] bg-[#f1fbf6] px-3 py-2.5 text-xs text-[#27765e]">{message}</p>}
      <p className="mt-4 rounded-lg bg-[#fafaff] px-3 py-2.5 text-[10px] leading-4 text-[#77738f]">{authenticated ? "Cohort creation, mentor allocation, and student enrollment are stored in MongoDB." : "All cohorts shown here are fictional demo records. Creating a cohort does not provision user accounts or login credentials."}</p>
    </section>
    <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Programs and enrollment</h2><p className="mt-1 text-[10px] text-[#8991a2]">{data.cohorts.length} {authenticated ? "saved cohorts" : "demo cohorts"}</p></div><CalendarDays size={17} className="text-[#655ed2]"/></div>
      <div className="flex flex-col gap-3">{data.cohorts.map((cohort) => <CohortRow key={cohort.id} cohort={cohort} mentors={mentors} mentees={mentees} data={data} changeMembership={changeMembership}/>)}</div>
    </section>
  </div>
}

function CohortRow({ cohort, mentors, mentees, data, changeMembership }: { cohort: Cohort; mentors: UserProfile[]; mentees: UserProfile[]; data: DemoData; changeMembership: (cohortId: string, userId: string, role: "mentor" | "mentee", action: "add" | "remove") => void }) {
  const [selectedMentor, setSelectedMentor] = useState("")
  const [selectedMentee, setSelectedMentee] = useState("")
  const cohortMentors = mentors.filter((mentor) => cohort.mentorIds.includes(mentor.id))
  const members = data.users.filter((user) => cohort.studentIds.includes(user.id) || user.cohortId === cohort.id)

  return <article className="rounded-lg border border-[#eef0f5] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold">{cohort.name}</p><p className="mt-1 text-[10px] text-[#8991a2]">{cohort.track} · starts {new Date(`${cohort.startDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f6] px-2 py-1 text-[10px] text-[#697386]"><Users size={11}/>{members.length} mentees</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{cohortMentors.length ? cohortMentors.map((mentor) => <span key={mentor.id} className="inline-flex items-center gap-1 rounded-full bg-[#f0efff] py-1 pl-2.5 pr-1 text-[10px] font-medium text-[#5550d6]">{mentor.name}<button type="button" className="rounded-full p-1 text-[#7772c7] hover:bg-white hover:text-[#a23c3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef]" aria-label={`Remove ${mentor.name} from ${cohort.name}`} onClick={() => changeMembership(cohort.id, mentor.id, "mentor", "remove")}><UserMinus size={12}/></button></span>) : <span className="text-[10px] text-[#8991a2]">No mentors allocated</span>}</div>
    {mentors.length > cohortMentors.length && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); changeMembership(cohort.id, selectedMentor, "mentor", "add"); setSelectedMentor("") }}><label className="sr-only" htmlFor={`mentor-${cohort.id}`}>Choose a mentor for {cohort.name}</label><select id={`mentor-${cohort.id}`} className={`${inputClass} min-w-40 flex-1 py-2 text-xs`} value={selectedMentor} onChange={(event) => setSelectedMentor(event.target.value)}><option value="">Add a mentor</option>{mentors.filter((mentor) => !cohort.mentorIds.includes(mentor.id)).map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}</select><button className={quietButton} type="submit" disabled={!selectedMentor}><Plus size={13}/> Allocate</button></form>}
    <div className="mt-4 border-t border-[#eef0f5] pt-3"><p className="text-[10px] font-semibold text-[#626b7e]">Enrolled students</p><div className="mt-2 flex flex-wrap gap-1.5">{members.map((student) => <span key={student.id} className="inline-flex items-center gap-1 rounded-full bg-[#f2f8f6] py-1 pl-2.5 pr-1 text-[10px] font-medium text-[#33735c]">{student.name}<button type="button" className="rounded-full p-1 text-[#628b7b] hover:bg-white hover:text-[#a23c3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef]" aria-label={`Remove ${student.name} from ${cohort.name}`} onClick={() => changeMembership(cohort.id, student.id, "mentee", "remove")}><UserMinus size={12}/></button></span>)}{!members.length && <span className="text-[10px] text-[#8991a2]">No students enrolled</span>}</div></div>
    {mentees.length > members.length && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); changeMembership(cohort.id, selectedMentee, "mentee", "add"); setSelectedMentee("") }}><label className="sr-only" htmlFor={`mentee-${cohort.id}`}>Choose a student for {cohort.name}</label><select id={`mentee-${cohort.id}`} className={`${inputClass} min-w-40 flex-1 py-2 text-xs`} value={selectedMentee} onChange={(event) => setSelectedMentee(event.target.value)}><option value="">Enroll a student</option>{mentees.filter((mentee) => !cohort.studentIds.includes(mentee.id) && mentee.cohortId !== cohort.id).map((mentee) => <option key={mentee.id} value={mentee.id}>{mentee.name}</option>)}</select><button className={quietButton} type="submit" disabled={!selectedMentee}><Plus size={13}/> Enroll</button></form>}
  </article>
}
