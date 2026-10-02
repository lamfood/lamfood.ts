"use client"

import { useEffect, useState } from "react"

import { Loader2 } from "lucide-react"

import AdminDashboard from "@/components/admin/AdminDashboard"
import LoginForm from "@/components/admin/LoginForm"
import { apiFetch } from "@/lib/api"

interface SessionResponse {
  authenticated: boolean
  username?: string
}

type AdminView = "checking" | "login" | "dashboard"

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("checking")
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    async function probeSession() {
      try {
        const data = await apiFetch<SessionResponse>("/api/admin/session")
        if (cancelled) return
        if (data.authenticated && data.username) {
          setUsername(data.username)
          setView("dashboard")
        } else {
          setView("login")
        }
      } catch {
        if (!cancelled) setView("login")
      }
    }

    void probeSession()

    return () => {
      cancelled = true
    }
  }, [])

  if (view === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted" role="status" aria-live="polite">
        <span className="sr-only">در حال بررسی نشست…</span>
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (view === "login") {
    return (
      <LoginForm
        onSuccess={(name) => {
          setUsername(name)
          setView("dashboard")
        }}
      />
    )
  }

  return <AdminDashboard username={username} onUnauthorized={() => setView("login")} />
}
