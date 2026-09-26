import { NextResponse } from "next/server";

import { getEnv, isAIConfigured } from "@/lib/env";

/** Public status of server integrations — no secrets, safe for the client. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ai: {
      configured: isAIConfigured(),
      provider: "opencode-go",
      model: getEnv().OPENCODE_MODEL,
    },
    storage: {
      mode: "local-device",
    },
    speech: {
      stt: "browser-web-speech",
      tts: "browser-speech-synthesis",
      pronunciationProvider: "none (AI estimates only)",
    },
  });
}
