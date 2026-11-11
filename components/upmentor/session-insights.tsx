"use client"

import { useState } from "react"
import { AlertCircle, Check, LoaderCircle, Sparkles } from "lucide-react"
import type { SessionInsightsContent } from "@/lib/upmentor-ai-contracts"
import { makeRuleBasedSessionInsights } from "@/lib/upmentor-session-insights"
import type { MentorshipSession } from "@/lib/upmentor-demo-data"

type DraftSource = "ai" | "simulated"
export type ApprovedAction = { title: string; deadline: string }
export type ApprovedSummary = {
  rawNotes: string
  content: SessionInsightsContent
  actionItems: ApprovedAction[]
  source: DraftSource
}
type Props = {
  session: MentorshipSession
  notes: string
  onNotesChange: (value: string) => void
  onApprove: (summary: ApprovedSummary) => void
  onSaveManual: (notes: string) => void
  onMarkMissed: () => void
}

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50"
const quietButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 py-2 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]"
const todayInput = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

const sections: Array<{ key: keyof SessionInsightsContent; title: string }> = [
  { key: "summaryQuotes", title: "Summary evidence" },
  { key: "discussionQuotes", title: "Discussed" },
  { key: "challengeQuotes", title: "Challenges mentioned" },
  { key: "nextStepQuotes", title: "Next steps mentioned" },
]

export function SessionInsightsEditor({ session, notes, onNotesChange, onApprove, onSaveManual, onMarkMissed }: Props) {
  const [content, setContent] = useState<SessionInsightsContent | null>(null)
  const [source, setSource] = useState<DraftSource>("simulated")
  const [selectedActions, setSelectedActions] = useState<number[]>([])
  const [deadlines, setDeadlines] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  const generate = async () => {
    if (notes.trim().length < 4) {
      setError("Add a few lines of session notes before generating insights.")
      return
    }
    setGenerating(true)
    setError("")
    try {
      const response = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      const result = await response.json()
      if (!response.ok || !result.insights) throw new Error("Insight generation is unavailable")
      setContent(result.insights as SessionInsightsContent)
      setSource(result.source === "ai" ? "ai" : "simulated")
    } catch {
      setContent(makeRuleBasedSessionInsights(notes))
      setSource("simulated")
    } finally {
      setSelectedActions([])
      setDeadlines({})
      setGenerating(false)
    }
  }

  const approve = () => {
    if (!content) return
    const actionItems = selectedActions.flatMap((index) => {
      const title = content.actionQuotes[index]?.trim()
      return title ? [{ title, deadline: deadlines[index] || todayInput() }] : []
    })
    onApprove({ rawNotes: notes, content, actionItems, source })
    setContent(null)
    setSelectedActions([])
  }

  const toggleAction = (index: number) => {
    setSelectedActions((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])
  }

  const updateQuote = (key: keyof SessionInsightsContent, index: number, value: string) => {
    setContent((current) => current ? { ...current, [key]: current[key].map((quote, quoteIndex) => quoteIndex === index ? value : quote) } : current)
  }

  return (
    <div className="mt-4 rounded-xl border border-[#e8e7ff] bg-[#fbfaff] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Session notes and follow-up</p>
          <p className="mt-1 text-[10px] text-[#7c789b]">Extractive insights only · the mentor approves every task</p>
        </div>
        <button type="button" className={buttonClass} disabled={generating} onClick={generate}>
          {generating ? <LoaderCircle className="animate-spin" size={14}/> : <Sparkles size={14}/>}
          {generating ? "Reviewing notes…" : "Generate session insights"}
        </button>
      </div>
      <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Raw meeting notes
        <textarea className={`${inputClass} min-h-24 resize-y`} value={notes} onChange={(event) => onNotesChange(event.target.value)} maxLength={12000} placeholder="Record what was discussed, challenges raised, and any explicit next steps."/>
      </label>
      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-[#8985a7]"><AlertCircle size={12} className="mt-0.5 shrink-0"/>When available, notes are sent to Vercel AI Gateway for extraction. Keep sensitive personal information out of this demo.</p>
      {error && <p role="alert" className="mt-3 text-xs text-[#a34139]">{error}</p>}
      {!content && <button type="button" className={`${quietButton} mt-3`} disabled={notes.trim().length < 4} onClick={() => onSaveManual(notes)}>Save notes without AI</button>}
      {session.status === "upcoming" && <button type="button" className={`${quietButton} mt-3`} onClick={onMarkMissed}>Mark session missed</button>}

      {content && <div className="mt-4 flex flex-col gap-3 border-t border-[#ebe9ff] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold">Review before saving</p>
          <span className="rounded-full bg-[#f0efff] px-2.5 py-1 text-[10px] font-semibold text-[#5148d7]">{source === "ai" ? "AI-generated · edit before approval" : "Simulated · rules-based"}</span>
        </div>
        {sections.map(({ key, title }) => {
          const quotes = content[key]
          return <section key={key} className="rounded-lg border border-[#ecebf6] bg-white p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#77738f]">Editable draft · {title}</h3>
            {quotes.length ? <div className="mt-2 flex flex-col gap-2">{quotes.map((quote, index) => <label key={`${key}-${index}`} className="flex flex-col gap-1.5"><span className="sr-only">Edit {title.toLowerCase()} item {index + 1}</span><textarea className={`${inputClass} min-h-16 resize-y text-xs leading-5`} aria-label={`Edit ${title.toLowerCase()} item ${index + 1}`} maxLength={500} value={quote} onChange={(event) => updateQuote(key, index, event.target.value)}/></label>)}</div> : <p className="mt-2 text-[10px] text-[#8d93a1]">No explicit evidence in these notes.</p>}
          </section>
        })}
        <section className="rounded-lg border border-[#ecebf6] bg-white p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#77738f]">Proposed action items</h3>
          {content.actionQuotes.length ? <div className="mt-2 flex flex-col gap-3">{content.actionQuotes.map((quote, index) => <div key={`action-${index}`} className="rounded-lg border border-[#eef0f5] p-3">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={selectedActions.includes(index)} onChange={() => toggleAction(index)} className="mt-2 accent-[#4f46e5]" aria-label={`Include action item ${index + 1} as a student task`}/>
              <textarea className={`${inputClass} min-h-16 resize-y text-xs leading-5`} aria-label={`Edit proposed action item ${index + 1}`} maxLength={500} value={quote} onChange={(event) => updateQuote("actionQuotes", index, event.target.value)}/>
            </label>
            <label className="mt-2 flex flex-col gap-1 text-[10px] font-medium text-[#777f91]">Suggested deadline (editable)
              <input type="date" min={new Date().toISOString().slice(0, 10)} className={`${inputClass} max-w-56 py-2 text-xs`} value={deadlines[index] || new Date(Date.now() + (7 + index * 7) * 86_400_000).toISOString().slice(0, 10)} onChange={(event) => setDeadlines((current) => ({ ...current, [index]: event.target.value }))}/>
            </label>
          </div>)}</div> : <p className="mt-2 text-xs leading-5 text-[#7d8597]">No explicit action commitments were found. No tasks will be created from this note.</p>}
        </section>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={!content.summaryQuotes.length && !selectedActions.length} onClick={approve}>
            <Check size={14}/>{selectedActions.length ? `Approve summary & ${selectedActions.length} task${selectedActions.length === 1 ? "" : "s"}` : "Approve summary"}
          </button>
          <button type="button" className={quietButton} onClick={() => { onSaveManual(notes); setContent(null) }}>Save notes only</button>
        </div>
        <p className="text-[10px] leading-4 text-[#8b92a3]">Only checked action items become student tasks. Unchecked suggestions are never assigned.</p>
      </div>}
    </div>
  )
}
