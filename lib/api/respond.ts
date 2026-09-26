import { NextResponse } from "next/server";
import type { z } from "zod";

import { isLlmError } from "@/lib/ai/types";
import { describeLlmError } from "@/lib/ai/opencode";

export type ParsedBody<S extends z.ZodType> =
  | { ok: true; data: z.infer<S> }
  | { ok: false; response: NextResponse };

/** Convert thrown errors into a consistent, client-friendly JSON shape. */
export function errorResponse(err: unknown): NextResponse {
  if (isLlmError(err)) {
    const { message, retryable } = describeLlmError(err);
    const status =
      err.kind === "not-configured" || err.kind === "auth"
        ? 503
        : err.kind === "rate-limit"
          ? 429
          : err.retryable
            ? 502
            : 400;
    return NextResponse.json({ error: { message, retryable, kind: err.kind } }, { status });
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { error: { message: "Something went wrong on our side.", retryable: true, kind: "unknown" } },
    { status: 500 },
  );
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<ParsedBody<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { message: "Invalid JSON body.", retryable: false } },
        { status: 400 },
      ),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { message: "Invalid request.", retryable: false, issues: formatIssues(parsed.error) } },
        { status: 422 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

function formatIssues(err: unknown): string[] {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: PropertyKey[]; message: string }[] }).issues;
    return issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  return [];
}
