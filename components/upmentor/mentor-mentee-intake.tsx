import type { FormEvent, ReactNode } from "react"
import { Plus, UserRoundPlus } from "lucide-react"
import type { Cohort } from "@/lib/upmentor-demo-data"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca]"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">{label}{children}</label>
}

export function MentorMenteeIntake({ cohorts, onSubmit }: { cohorts: Cohort[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="rounded-xl border border-[#e7e9f1] bg-white p-5 shadow-[0_2px_8px_rgba(23,32,51,0.025)]">
    <div className="mb-4"><div className="flex items-center gap-2"><UserRoundPlus size={16} className="text-[#5a52e8]"/><h2 className="text-sm font-semibold text-[#172033]">Add a mentee</h2></div><p className="mt-1 text-[10px] leading-4 text-[#8991a2]">The learner is added to your demo roster and receives a unique demo enrollment ID.</p></div>
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <Field label="Full name"><input className={inputClass} name="name" required minLength={2} maxLength={80} placeholder="Student name"/></Field>
      <Field label="Learning track"><select className={inputClass} name="domain" required defaultValue="Web Development"><option>Web Development</option><option>DSA in C/C++</option><option>AI/ML</option><option>Other</option></select></Field>
      <Field label="Interest tags (comma separated)"><input className={inputClass} name="skills" maxLength={240} placeholder="React, accessibility, Git"/></Field>
      <Field label="Cohort"><select className={inputClass} name="cohortId" defaultValue=""><option value="">No cohort yet</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.track}</option>)}</select></Field>
      <button className={`${buttonClass} self-start`} type="submit"><Plus size={14}/> Add mentee</button>
    </form>
    <p className="mt-4 rounded-lg bg-[#fff8ed] px-3 py-2.5 text-[10px] leading-4 text-[#906320]">Demo only: the enrollment ID is not an authentication credential. Secure password issuance requires the application backend.</p>
  </section>
}
