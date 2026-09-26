import type { ConversationSession } from "@/lib/types";
import { databaseReady, getSql } from "./db";

/**
 * Server-side persistence. The browser keeps its own localStorage copy as
 * the fast source of truth; completed sessions are mirrored here when
 * DATABASE_URL is configured so a future auth/DB phase has real history.
 */

export interface ProgressAggregate {
  sessions: number;
  totalSpeakingSeconds: number;
  totalWords: number;
  avgPronunciation: number | null;
  avgGrammar: number | null;
  avgVocabulary: number | null;
  topDifficultWords: { word: string; count: number }[];
  activeDays: string[];
}

export function dbEnabled(): boolean {
  return getSql() != null;
}

export async function upsertSession(session: ConversationSession): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await databaseReady();

  await sql.begin(async (tx) => {
    await tx`
      insert into practice_sessions (
        id, scenario_id, custom_topic, native_language, target_language, level,
        started_at, ended_at, duration_ms, speaking_ms, words_spoken, turns,
        pronunciation_score, grammar_score, vocabulary_score,
        fillers, messages, analyses, synced_at
      ) values (
        ${session.id}, ${session.scenarioId}, ${session.customTopic},
        ${session.nativeLanguage}, ${session.targetLanguage}, ${session.level},
        ${new Date(session.createdAt)},
        ${session.endedAt ? new Date(session.endedAt) : null},
        ${session.stats.durationMs}, ${session.stats.speakingMs},
        ${session.stats.wordsSpoken}, ${session.stats.turns},
        ${session.stats.pronunciationAvg}, ${session.stats.grammarAvg},
        ${session.stats.vocabularyAvg}, ${session.stats.fillers},
        ${JSON.stringify(session.messages)}, ${JSON.stringify(session.analyses)},
        now()
      )
      on conflict (id) do update set
        ended_at = excluded.ended_at,
        duration_ms = excluded.duration_ms,
        speaking_ms = excluded.speaking_ms,
        words_spoken = excluded.words_spoken,
        turns = excluded.turns,
        pronunciation_score = excluded.pronunciation_score,
        grammar_score = excluded.grammar_score,
        vocabulary_score = excluded.vocabulary_score,
        fillers = excluded.fillers,
        messages = excluded.messages,
        analyses = excluded.analyses,
        synced_at = now()
    `;

    const day = new Date(session.createdAt).toISOString().slice(0, 10);
    await tx`
      insert into daily_activity (day, sessions, speaking_seconds, words)
      values (${day}, 1, ${Math.round(session.stats.speakingMs / 1000)}, ${session.stats.wordsSpoken})
      on conflict (user_id, day) do update set
        sessions = daily_activity.sessions + 1,
        speaking_seconds = daily_activity.speaking_seconds + ${Math.round(session.stats.speakingMs / 1000)},
        words = daily_activity.words + ${session.stats.wordsSpoken}
    `;

    for (const analysis of session.analyses) {
      for (const w of analysis.words) {
        await tx`
          insert into word_practice (session_id, word, language, attempts, estimated)
          values (${session.id}, ${w.word.toLowerCase()}, ${session.targetLanguage}, 1, true)
          on conflict (word, language) do update set
            attempts = word_practice.attempts + 1,
            updated_at = now()
        `;
      }
    }
  });
}

export async function getAggregate(): Promise<ProgressAggregate | null> {
  const sql = getSql();
  if (!sql) return null;
  await databaseReady();

  const [totals] = await sql`
    select
      count(*)::int as sessions,
      coalesce(sum(speaking_ms), 0)::bigint as speaking_ms,
      coalesce(sum(words_spoken), 0)::int as words,
      avg(pronunciation_score) as pron,
      avg(grammar_score) as gram,
      avg(vocabulary_score) as vocab
    from practice_sessions
    where ended_at is not null
  `;

  const words = await sql`
    select word, sum(attempts)::int as count
    from word_practice
    group by word
    order by count desc
    limit 12
  `;

  const days = await sql`
    select to_char(day, 'YYYY-MM-DD') as day
    from daily_activity
    order by day desc
    limit 365
  `;

  if (!totals) return null;
  return {
    sessions: totals.sessions as number,
    totalSpeakingSeconds: Number(totals.speaking_ms) / 1000,
    totalWords: totals.words as number,
    avgPronunciation: totals.pron == null ? null : Number(totals.pron),
    avgGrammar: totals.gram == null ? null : Number(totals.gram),
    avgVocabulary: totals.vocab == null ? null : Number(totals.vocab),
    topDifficultWords: words.map((w) => ({ word: w.word as string, count: w.count as number })),
    activeDays: days.map((d) => d.day as string),
  };
}
