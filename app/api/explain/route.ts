import { NextResponse } from "next/server";

import { getLlm } from "@/lib/ai/provider";
import { buildExplainMessages } from "@/lib/ai/prompts";
import { errorResponse, parseBody } from "@/lib/api/respond";
import { ExplainRequestSchema } from "@/lib/validation/schemas";

/**
 * POST /api/explain — short explanation of a correction written in the
 * user's native language (the "Explain in Bengali" button).
 */
export async function POST(req: Request) {
  const body = await parseBody(req, ExplainRequestSchema);
  if (!body.ok) return body.response;

  const ctx = body.data;
  try {
    const result = await getLlm().chat({
      messages: buildExplainMessages(ctx),
      temperature: 0.4,
      maxTokens: 1500,
    });
    return NextResponse.json({ explanation: (result.text || "").trim() });
  } catch (err) {
    return errorResponse(err);
  }
}
