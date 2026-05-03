"use client"

import { useState, useRef, useCallback } from "react"

export interface Message {
  role: "user" | "assistant"
  content: string
}

interface Props {
  suspectedAttack?: string
  userRole?: string
  userId?: string
  onSessionCreated?: (sessionId: string, title: string) => void
}

export function useAssistant({
  suspectedAttack,
  userRole,
  onSessionCreated,
}: Props = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)

  // Stable ref so closures always see the current session_id
  const sessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string, taskContext?: string) => {
      if (isStreaming) return
      setError(null)

      const userMsg: Message = { role: "user", content: text }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)

      let assistantText = ""
      try {
        abortRef.current = new AbortController()

        const params = new URLSearchParams({ message: text })
        // If we already have a session, continue it; otherwise the backend auto-creates one
        if (sessionIdRef.current) params.set("session_id", sessionIdRef.current)
        if (suspectedAttack) params.set("suspected_attack", suspectedAttack)
        if (userRole) params.set("user_role", userRole)
        // Only pass task_context on the first message of a new session
        if (taskContext && !sessionIdRef.current) params.set("task_context", taskContext)

        const res = await fetch(`/api/assist/stream?${params}`, {
          signal: abortRef.current.signal,
        })
        if (!res.ok || !res.body) throw new Error(`Stream error ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let currentEvent = ""

        setMessages((prev) => [...prev, { role: "assistant", content: "" }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") break

              if (currentEvent === "meta") {
                try {
                  const parsed = JSON.parse(data)
                  // Backend returns session_id (and title) in the meta event
                  if (parsed.session_id && !sessionIdRef.current) {
                    sessionIdRef.current = parsed.session_id
                    setSessionId(parsed.session_id)
                    setSessionTitle(parsed.title ?? null)
                    onSessionCreated?.(parsed.session_id, parsed.title ?? "")
                  }
                } catch {}
                currentEvent = ""
              } else if (currentEvent === "error") {
                try {
                  const parsed = JSON.parse(data)
                  setError(parsed.error || "Stream error")
                } catch {}
                currentEvent = ""
              } else {
                // Regular text chunk — backend escapes newlines as \n
                assistantText += data.replace(/\\n/g, "\n")
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: "assistant", content: assistantText }
                  return updated
                })
                currentEvent = ""
              }
            } else if (line === "") {
              currentEvent = ""
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        setError(err.message || "Something went wrong")
      } finally {
        // If the stream ended with no text, remove the empty bubble and surface an error
        if (!assistantText) {
          setMessages((prev) =>
            prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
          )
          setError(
            "The AI returned an empty response. The content may have been filtered — try rephrasing."
          )
        }
        setIsStreaming(false)
      }
    },
    [isStreaming, suspectedAttack, userRole, onSessionCreated]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  // "New chat" — just clears local state, does NOT delete the session from history
  const reset = useCallback(() => {
    abortRef.current?.abort()
    sessionIdRef.current = null
    setMessages([])
    setSessionId(null)
    setSessionTitle(null)
    setError(null)
    setIsStreaming(false)
  }, [])

  // Restore a previously saved session from the backend
  const loadSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/assist/sessions/${sid}`)
      if (!res.ok) return
      const data = await res.json()
      const msgs: Message[] = (data.messages ?? []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
      sessionIdRef.current = sid
      setSessionId(sid)
      setSessionTitle(data.title ?? null)
      setMessages(msgs)
      setError(null)
    } catch {}
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sessionId,
    sessionTitle,
    send,
    stop,
    reset,
    loadSession,
  }
}
