import { z } from 'zod';
import {
  SubmissionSchema,
  verdictFromStatusCode,
  type Submission,
} from '../domain/submission';
import type { SubmissionRef } from './urlParser';

const DETAILS_QUERY = `query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    runtime
    memory
    code
    timestamp
    statusCode
    lang { name }
    question { title titleSlug }
  }
}`;

const DetailsSchema = z.object({
  runtime: z.number().nullish(),
  memory: z.number().nullish(),
  code: z.string().nullish(),
  timestamp: z.number().nullish(),
  statusCode: z.number().nullish(),
  lang: z.object({ name: z.string() }).nullish(),
  question: z.object({ title: z.string(), titleSlug: z.string() }).nullish(),
});

const ResponseSchema = z.object({
  data: z.object({ submissionDetails: DetailsSchema.nullish() }).nullish(),
});

export type ParseResult =
  | { kind: 'ok'; submission: Submission }
  | { kind: 'pending' }
  | { kind: 'invalid'; reason: string };

export interface ParseContext {
  submissionId: string;
  problemSlug: string;
  origin: string;
}

function toNonNegativeInt(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

export function parseSubmissionDetails(raw: unknown, ctx: ParseContext): ParseResult {
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return { kind: 'invalid', reason: 'unexpected response shape' };

  const d = parsed.data.data?.submissionDetails;
  if (!d || d.statusCode == null) return { kind: 'pending' };
  if (!d.lang || !d.question || d.timestamp == null) {
    return { kind: 'invalid', reason: 'missing language, problem or timestamp' };
  }
  if (d.question.titleSlug !== ctx.problemSlug) {
    return { kind: 'invalid', reason: 'problem slug does not match URL' };
  }

  const date = new Date(d.timestamp > 1e12 ? d.timestamp : d.timestamp * 1000);
  if (Number.isNaN(date.getTime())) return { kind: 'invalid', reason: 'bad timestamp' };

  const result = SubmissionSchema.safeParse({
    submissionId: ctx.submissionId,
    problemSlug: d.question.titleSlug,
    problemTitle: d.question.title,
    url: `${ctx.origin}/problems/${d.question.titleSlug}/submissions/${ctx.submissionId}/`,
    language: d.lang.name,
    verdict: verdictFromStatusCode(d.statusCode),
    runtimeMs: toNonNegativeInt(d.runtime),
    memoryBytes: toNonNegativeInt(d.memory),
    submittedAt: date.toISOString(),
    code: d.code ?? null,
  });
  return result.success
    ? { kind: 'ok', submission: result.data }
    : { kind: 'invalid', reason: 'failed validation' };
}

export async function fetchSubmissionDetailsRaw(
  submissionId: string,
  csrfToken: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (csrfToken) headers['x-csrftoken'] = csrfToken;
  const res = await fetchImpl('/graphql/', {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({
      operationName: 'submissionDetails',
      query: DETAILS_QUERY,
      variables: { submissionId: Number(submissionId) },
    }),
  });
  if (!res.ok) throw new Error(`LeetCode responded with HTTP ${res.status}`);
  return res.json();
}

export interface LoadDeps {
  fetchRaw(submissionId: string): Promise<unknown>;
  sleep(ms: number): Promise<void>;
  origin: string;
  attempts?: number;
  delayMs?: number;
  log?(message: string): void;
}

/** Polls until the verdict is final. Returns null if it never becomes readable. */
export async function loadSubmission(
  ref: SubmissionRef,
  deps: LoadDeps,
): Promise<Submission | null> {
  const attempts = deps.attempts ?? 8;
  const delayMs = deps.delayMs ?? 1500;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await deps.sleep(delayMs);
    try {
      const result = parseSubmissionDetails(await deps.fetchRaw(ref.submissionId), {
        submissionId: ref.submissionId,
        problemSlug: ref.problemSlug,
        origin: deps.origin,
      });
      if (result.kind === 'ok') return result.submission;
      if (result.kind === 'invalid') {
        deps.log?.(`invalid response: ${result.reason}`);
        return null;
      }
    } catch (e) {
      deps.log?.(`request failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }
  return null;
}