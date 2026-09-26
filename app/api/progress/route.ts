import { NextResponse } from "next/server";

import { errorResponse, parseBody } from "@/lib/api/respond";
import { dbEnabled, getAggregate, upsertSession } from "@/lib/data/server-repo";
import { SessionSyncSchema } from "@/lib/validation/schemas";
import type { ConversationSession } from "@/lib/types";

/**
 * /api/progress — mirrors finished sessions to Postgres (when configured)
 * and serves the DB-backed aggregate. The browser's localStorage remains
 * the primary store until auth ships (Phase 3).
 */

export async function POST(req: Request) {
  const body = await parseBody(req, SessionSyncSchema);
  if (!body.ok) return body.response;

  try {
    const session = body.data.session as unknown as ConversationSession;
    if (!dbEnabled()) {
      return NextResponse.json({ stored: "local-only" as const });
    }
    await upsertSession(session);
    return NextResponse.json({ stored: "postgres" as const });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET() {
  try {
    const aggregate = await getAggregate();
    return NextResponse.json({ enabled: aggregate != null, aggregate });
  } catch (err) {
    return errorResponse(err);
  }
}
