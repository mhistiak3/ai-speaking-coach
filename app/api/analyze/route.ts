import { NextResponse } from "next/server";

import { getLlm } from "@/lib/ai/provider";
import { buildAnalysisMessages } from "@/lib/ai/prompts";
import { errorResponse, parseBody } from "@/lib/api/respond";
import { AnalyzeRequestSchema, AnalysisResponseSchema } from "@/lib/validation/schemas";

/**
 * POST /api/analyze — after-turn coaching: scores (AI estimates unless a
 * real pronunciation provider supplies them), one important correction,
 * and words to practice. Runs in parallel with TTS playback so the
 * conversation itself never waits for analysis.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, AnalyzeRequestSchema);
  if (!body.ok) return body.response;

  const ctx = body.data;
  try {
    const llm = getLlm();
    const raw = await llm.chatJson<unknown>({
      messages: buildAnalysisMessages({
        nativeLanguage: ctx.nativeLanguage,
        targetLanguage: ctx.targetLanguage,
        level: ctx.level,
        scenarioId: "analysis",
        customTopic: null,
        correctionFrequency: ctx.correctionFrequency,
        pronunciationFeedback: ctx.pronunciationFeedback,
        userText: ctx.userText,
        assistantText: ctx.assistantText,
        wordHints: ctx.wordHints,
      }),
      temperature: 0.2,
      maxTokens: 2500,
    });

    const parsed = AnalysisResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "The coach returned unusable feedback.", retryable: true, kind: "bad-response" } },
        { status: 502 },
      );
    }

    return NextResponse.json({ analysis: parsed.data });
  } catch (err) {
    return errorResponse(err);
  }
}
