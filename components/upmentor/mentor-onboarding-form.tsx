"use client"

import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { Plus, UserRoundPlus } from "lucide-react"
import { makeId, type DemoData, type UserProfile } from "@/lib/upmentor-demo-data"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca]"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">{label}{children}</label>
}

export function MentorOnboardingForm({ setData }: { setData: Dispatch<SetStateAction<DemoData>> }) {
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("Web Development")
  const [skills, setSkills] = useState("")
  const [hours, setHours] = useState(6)
  const [capacity, setCapacity] = useState(3)

  const createMentor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mentorId = makeId("mentor")
    const mentor: UserProfile = {
      id: mentorId,
      name: name.trim(),
      role: "mentor",
      email: `${mentorId}@demo.techneeds.local`,
      domain,
      skills: skills.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
      availabilityHours: hours,
      weeklyCapacity: capacity,
    }
    setData((old) => ({ ...old, users: [...old.users, mentor] }))
    setName("")
    setSkills("")
  }

  return <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
    <div className="mb-4 flex items-center gap-2"><UserRoundPlus size={16} className="text-[#5a52e8]"/><div><h2 className="text-sm font-semibold">Onboard a mentor</h2><p className="mt-1 text-[10px] text-[#8991a2]">Create a fictional demo profile for matching and cohort allocation.</p></div></div>
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={createMentor}>
      <Field label="Full name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} placeholder="Mentor name"/></Field>
      <Field label="Technical domain"><select className={inputClass} value={domain} onChange={(event) => setDomain(event.target.value)}><option>Web Development</option><option>DSA in C/C++</option><option>AI/ML</option><option>Other</option></select></Field>
      <Field label="Skills (comma separated)"><input className={inputClass} value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={240} placeholder="React, JavaScript, accessibility"/></Field>
      <Field label="Weekly capacity (mentees)"><input className={inputClass} type="number" min={1} max={30} step={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required/></Field>
      <Field label="Availability (hours/week)"><input className={inputClass} type="number" min={1} max={40} step={1} value={hours} onChange={(event) => setHours(Number(event.target.value))} required/></Field>
      <button className={`${buttonClass} self-end`} type="submit"><Plus size={14}/> Add mentor profile</button>
    </form>
    <p className="mt-4 rounded-lg bg-[#fff8ed] px-3 py-2.5 text-[10px] leading-4 text-[#906320]">Demo only: no account password is created. Secure mentor credentials require a connected authentication backend.</p>
  </section>
}
