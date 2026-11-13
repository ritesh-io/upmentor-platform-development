"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
type AppRole = "mentee" | "mentor" | "admin"
const ROLE_HOME: Record<AppRole, string> = { mentee: "/mentee", mentor: "/mentor", admin: "/admin" }

const inputClass = "w-full rounded-lg border border-[#e4e7ef] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#a0a6b5] focus:border-[#8b85ef] focus:ring-2 focus:ring-[#eeedff]"

export function SignInForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError("")
    setPending(true)

    const form = new FormData(event.currentTarget)
    const identifier = String(form.get("identifier") || "").trim()
    const password = String(form.get("password") || "")

    try {
      const result = identifier.includes("@")
        ? await authClient.signIn.email({ email: identifier, password })
        : await authClient.signIn.username({ username: identifier, password })

      if (result.error) {
        setError("We couldn’t sign you in with those details. Check your ID or email and password, then try again.")
        return
      }

      const response = await fetch("/api/auth/me", { cache: "no-store" })
      if (!response.ok) {
        setError("Your sign-in could not be verified. Please try again.")
        return
      }
      const account = (await response.json()) as { role?: AppRole }
      router.replace(nextPath === "/setup-admin" ? "/setup-admin" : account.role ? ROLE_HOME[account.role] : ROLE_HOME.mentee)
      router.refresh()
    } catch {
      setError("We couldn’t sign you in right now. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Enrollment or staff ID, or email
        <input name="identifier" type="text" required autoComplete="username" autoCapitalize="none" className={inputClass} placeholder="e.g. TN26-1042 or you@example.com" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#596275]">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} placeholder="Enter your password" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-[#f3d4d4] bg-[#fff8f8] px-3 py-2.5 text-xs leading-5 text-[#a23c3c]">{error}</p>}
      <button type="submit" disabled={pending} className="mt-1 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#737c8e]">
        <span>New to TechNeeds IGDTUW? <Link href="/sign-up" className="font-semibold text-[#4f46e5] hover:underline">Create an account</Link></span>
        <Link href="/setup-admin" className="font-medium text-[#4f46e5] hover:underline">Admin setup</Link>
      </div>
    </form>
  )
}
