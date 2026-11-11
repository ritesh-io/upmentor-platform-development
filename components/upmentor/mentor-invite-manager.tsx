"use client"

import { useState, type FormEvent } from "react"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"

export function MentorInviteManager() {
  const [inviteLink, setInviteLink] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError("")
    setMessage("")
    setInviteLink("")

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/admin/mentor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") || "").trim() }),
      })
      const result = (await response.json().catch(() => null)) as { path?: string; expiresAt?: string; error?: string } | null
      if (!response.ok || !result?.path) {
        setError(result?.error || "The invitation could not be created.")
        return
      }
      setInviteLink(`${window.location.origin}${result.path}`)
      setExpiresAt(result.expiresAt ? new Date(result.expiresAt).toLocaleString() : "in 7 days")
      event.currentTarget.reset()
      setMessage("One-time invitation created. Share the link with the mentor privately.")
    } catch {
      setError("The invitation could not be created. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setMessage("Invitation link copied.")
    } catch {
      setMessage("Copy is unavailable here. Select and copy the invitation link below.")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-6 text-[#778094]">Create a single-use mentor registration link. The link expires after seven days and can optionally be restricted to one email address.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
          Mentor email <span className="font-normal text-[#9299a8]">(optional)</span>
          <input name="email" type="email" maxLength={254} autoComplete="email" className={inputClass} placeholder="mentor@example.com" />
        </label>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Creating invitation…" : "Create mentor invitation"}
        </button>
      </form>
      {error && <p role="alert" className="rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-2.5 text-xs leading-5 text-[#a23c3c]">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-[#dcefe7] bg-[#f1fbf6] px-3 py-2.5 text-xs leading-5 text-[#27765e]">{message}</p>}
      {inviteLink && <div className="flex flex-col gap-2">
        <label htmlFor="mentor-invite-link" className="text-xs font-medium text-[#596275]">One-time invitation link · expires {expiresAt}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="mentor-invite-link" readOnly value={inviteLink} className={`${inputClass} min-w-0 flex-1`} />
          <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e4e7ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#505a6e] transition hover:bg-[#f8f8fc]">Copy link</button>
        </div>
      </div>}
    </div>
  )
}
