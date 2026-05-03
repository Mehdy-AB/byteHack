"use client";

import { useState } from "react";
import { useChatSessions, SessionSummary } from "@/hooks/useChatSessions";
import ChatSidebar from "@/components/ChatSidebar";
import AssistantChat from "@/components/AssistantChat";

export default function AssistPage() {
  const { sessions, loading, refresh, deleteSession, renameSession } =
    useChatSessions();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSuspectedAttack, setActiveSuspectedAttack] = useState<
    string | undefined
  >(undefined);

  function handleSelect(session: SessionSummary) {
    setActiveSessionId(session.id);
    setActiveSuspectedAttack(session.suspected_attack ?? undefined);
  }

  function handleNew() {
    setActiveSessionId(null);
    setActiveSuspectedAttack(undefined);
  }

  function handleSessionCreated(id: string) {
    setActiveSessionId(id);
    refresh();
  }

  return (
    <div className="flex h-full">
      <ChatSidebar
        sessions={sessions}
        activeId={activeSessionId}
        loading={loading}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={deleteSession}
        onRename={renameSession}
      />
      <div className="flex-1 min-w-0">
        <AssistantChat
          key={activeSessionId ?? "new"}
          sessionId={activeSessionId}
          suspectedAttack={activeSuspectedAttack}
          title="CyberGuard AI"
          onSessionCreated={handleSessionCreated}
          onTurnComplete={() => refresh()}
        />
      </div>
    </div>
  );
}
