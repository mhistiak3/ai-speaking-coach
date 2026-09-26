import { NextResponse } from "next/server";

import { getLlm } from "@/lib/ai/provider";
import { buildWordProfileMessages } from "@/lib/ai/prompts";
import { errorResponse, parseBody } from "@/lib/api/respond";
import { WordProfileRequestSchema, WordProfileSchema } from "@/lib/validation/schemas";

/**
 * POST /api/word-profile — IPA, syllable breakdown, stress, meaning,
 * example sentence for one word in the practice language.
 */
export async function POST(req: Request) {
  const body = await parseBody(req, WordProfileRequestSchema);
  if (!body.ok) return body.response;

  const { word, targetLanguage, nativeLanguage } = body.data;
  try {
    const raw = await getLlm().chatJson<unknown>({
      messages: buildWordProfileMessages(word, targetLanguage, nativeLanguage),
      temperature: 0.1,
      maxTokens: 1800,
    });

    const parsed = WordProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Could not build a word profile.", retryable: true } },
        { status: 502 },
      );
    }

    return NextResponse.json({ profile: { word, language: targetLanguage, ...parsed.data } });
  } catch (err) {
    return errorResponse(err);
  }
}
