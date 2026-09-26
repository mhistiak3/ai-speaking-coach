"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MessageSquareDashed } from "lucide-react";

import { ConversationView } from "@/components/conversation/conversation-view";
import { Button } from "@/components/ui/button";
import { useSessionsStore } from "@/lib/store/session-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export default function PracticeSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSessionsStore((s) =>
    s.sessions.find((x) => x.id === params?.sessionId),
  );

  // Warn before leaving mid-conversation (recording / unsynced history).
  useEffect(() => {
    if (!session || session.endedAt) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session]);

  if (!hydrated || !params?.sessionId) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-7 animate-spin text-brand" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <MessageSquareDashed className="size-10 text-ink-faint" />
        <div>
          <h1 className="text-lg font-bold text-ink">This conversation isn&apos;t here</h1>
          <p className="mt-1 text-sm text-ink-soft">
            It may have been cleared, or opened on another device.
          </p>
        </div>
        <Button onClick={() => router.push("/practice")}>Back to scenarios</Button>
      </div>
    );
  }

  return <ConversationView key={session.id} session={session} />;
}
