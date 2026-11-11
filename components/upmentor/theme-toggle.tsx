"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      className={`grid size-10 shrink-0 place-items-center rounded-lg border border-[#e4e7ef] bg-white text-[#505a6e] transition hover:bg-[#f8f8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b85ef] ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={mounted && isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun size={16} aria-hidden="true"/> : <Moon size={16} aria-hidden="true"/>}
      <span className="sr-only">{isDark ? "Dark mode is active" : "Light mode is active"}</span>
    </button>
  )
}
