import { z } from 'zod';

export const VerdictSchema = z.enum([
  'accepted',
  'wrong_answer',
  'memory_limit_exceeded',
  'output_limit_exceeded',
  'time_limit_exceeded',
  'runtime_error',
  'compile_error',
  'unknown',
]);
export type Verdict = z.infer<typeof VerdictSchema>;

const STATUS_CODE_TO_VERDICT: Readonly<Record<number, Verdict>> = {
  10: 'accepted',
  11: 'wrong_answer',
  12: 'memory_limit_exceeded',
  13: 'output_limit_exceeded',
  14: 'time_limit_exceeded',
  15: 'runtime_error',
  20: 'compile_error',
};

export function verdictFromStatusCode(code: number): Verdict {
  return STATUS_CODE_TO_VERDICT[code] ?? 'unknown';
}

export const SubmissionSchema = z.object({
  submissionId: z.string().regex(/^\d{1,12}$/),
  problemSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(200),
  problemTitle: z.string().min(1).max(300),
  url: z.string().regex(/^https:\/\/leetcode\.com\//).max(500),
  language: z.string().regex(/^[a-z0-9_-]{1,30}$/),
  verdict: VerdictSchema,
  runtimeMs: z.number().int().nonnegative().nullable(),
  memoryBytes: z.number().int().nonnegative().nullable(),
  submittedAt: z.string().datetime(),
  code: z.string().max(500_000).nullable(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export function buildDedupeKey(submission: Pick<Submission, 'submissionId'>): string {
  return `lc:${submission.submissionId}`;
}