"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"

export function SignUpForm({
  mentorInviteToken,
  invitedEmail,
  invalidInvite = false,
}: {
  mentorInviteToken?: string
  invitedEmail?: string
  invalidInvite?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending || invalidInvite) return
    setError("")

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") || "").trim()
    const email = String(form.get("email") || "").trim().toLowerCase()
    const username = String(form.get("username") || "").trim()
    const password = String(form.get("password") || "")
    const confirmPassword = String(form.get("confirmPassword") || "")

    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) {
      setError("Use 3–64 letters, numbers, dots, underscores, or hyphens for your ID.")
      return
    }
    if (password.length < 12) {
      setError("Choose a password with at least 12 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }

    setPending(true)
    try {
      const result = await authClient.signUp.email({ email, name, password, username })
      if (result.error) {
        setError("We couldn’t create your account. Check your details or sign in if you already have an account.")
        return
      }

      if (mentorInviteToken) {
        const response = await fetch("/api/auth/mentor-invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: mentorInviteToken }),
        })
        if (!response.ok) {
          setError("Your account was created, but the mentor invitation could not be applied. Sign in and contact your program administrator.")
          return
        }
        router.replace("/mentor")
      } else {
        router.replace("/mentee")
      }
      router.refresh()
    } catch {
      setError("We couldn’t create your account right now. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (invalidInvite) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-3 text-xs leading-5 text-[#a23c3c]">This mentor invitation is invalid, expired, or already used.</p>
        <Link href="/sign-up" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca]">Register as a mentee</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mentorInviteToken && <p className="rounded-lg border border-[#dcefe7] bg-[#f1fbf6] px-3 py-2.5 text-xs leading-5 text-[#27765e]">This one-time invitation will register you as a mentor.</p>}
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Full name
        <input name="name" type="text" required maxLength={120} autoComplete="name" className={inputClass} placeholder="Your name" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Email address
        <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={invitedEmail} readOnly={Boolean(invitedEmail)} className={`${inputClass} read-only:bg-[#f8f8fc]`} placeholder="you@example.com" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        {mentorInviteToken ? "Staff ID" : "Enrollment number"}
        <input name="username" type="text" required minLength={3} maxLength={64} autoComplete="username" autoCapitalize="none" className={inputClass} placeholder={mentorInviteToken ? "Your staff ID" : "e.g. TN26-1042"} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Password
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} placeholder="At least 12 characters" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Confirm password
        <input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" className={inputClass} placeholder="Enter the password again" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-2.5 text-xs leading-5 text-[#a23c3c]">{error}</p>}
      <button type="submit" disabled={pending} className="mt-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Creating account…" : mentorInviteToken ? "Create mentor account" : "Create mentee account"}
      </button>
      <p className="text-center text-xs text-[#737c8e]">Already registered? <Link href="/sign-in" className="font-semibold text-[#4f46e5] hover:underline">Sign in</Link></p>
    </form>
  )
}
