import { NextResponse } from "next/server";

import { getLlm } from "@/lib/ai/provider";
import { buildConversationMessages, buildOpeningMessages } from "@/lib/ai/prompts";
import { errorResponse, parseBody } from "@/lib/api/respond";
import { ConversationRequestSchema } from "@/lib/validation/schemas";

/**
 * POST /api/conversation — generate the AI partner's next reply, or the
 * session's opening line (`opening: true`). The API key stays on the
 * server; the client only sends chat context.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, ConversationRequestSchema);
  if (!body.ok) return body.response;

  const ctx = body.data;
  if (!ctx.opening && ctx.messages.length === 0) {
    return NextResponse.json(
      { error: { message: "No messages to respond to.", retryable: false } },
      { status: 422 },
    );
  }

  try {
    const result = await getLlm().chat({
      messages: ctx.opening
        ? buildOpeningMessages({
            nativeLanguage: ctx.nativeLanguage,
            targetLanguage: ctx.targetLanguage,
            level: ctx.level,
            scenarioId: ctx.scenarioId,
            customTopic: ctx.customTopic ?? null,
            correctionFrequency: "balanced",
          })
        : buildConversationMessages(
            {
              nativeLanguage: ctx.nativeLanguage,
              targetLanguage: ctx.targetLanguage,
              level: ctx.level,
              scenarioId: ctx.scenarioId,
              customTopic: ctx.customTopic ?? null,
              correctionFrequency: "balanced",
            },
            ctx.messages.slice(-30),
          ),
      temperature: 0.8,
      maxTokens: 1500,
      sessionId: ctx.sessionId,
    });

    const reply = (result.text || "").trim();
    if (!reply) {
      return NextResponse.json(
        { error: { message: "The AI came back silent. Try once more.", retryable: true } },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply });
  } catch (err) {
    return errorResponse(err);
  }
}
