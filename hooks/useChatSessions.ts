"use client"

import { useState, useEffect, useCallback } from "react"

export interface SessionSummary {
  id: string
  title: string
  updated_at: string
  suspected_attack: string | null
  message_count: number
  last_message: string | null
  last_role: "user" | "assistant" | null
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assist/sessions")
      if (res.ok) setSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const deleteSession = useCallback(async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/assist/sessions/${id}`, { method: "DELETE" })
  }, [])

  const renameSession = useCallback(async (id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    await fetch(`/api/assist/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
  }, [])

  return { sessions, loading, refresh, deleteSession, renameSession }
}
