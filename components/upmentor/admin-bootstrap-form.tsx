"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"

export function AdminBootstrapForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError("")
    setPending(true)

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: String(form.get("code") || "") }),
      })
      const result = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(result?.error || "Administrator setup could not be completed.")
        return
      }
      router.replace("/admin")
      router.refresh()
    } catch {
      setError("Administrator setup could not be completed. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        One-time administrator setup code
        <input name="code" type="password" required maxLength={256} autoComplete="one-time-code" className={inputClass} placeholder="Enter the configured setup code" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-2.5 text-xs leading-5 text-[#a23c3c]">{error}</p>}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Securing administrator access…" : "Claim administrator access"}
      </button>
    </form>
  )
}
