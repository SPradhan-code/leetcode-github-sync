import { z } from 'zod';
import { SubmissionSchema } from './submission';

export const SyncJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

export type SyncJobStatus = z.infer<typeof SyncJobStatusSchema>;

export const SyncJobSchema = z.object({
  id: z.string().regex(/^lc:\d{1,12}$/),
  submission: SubmissionSchema,
  status: SyncJobStatusSchema,
  attempts: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastError: z.string().max(500).nullable(),
});

export type SyncJob = z.infer<typeof SyncJobSchema>;

export function createSyncJob(
  submission: z.infer<typeof SubmissionSchema>,
  now = new Date().toISOString(),
): SyncJob {
  return {
    id: `lc:${submission.submissionId}`,
    submission,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };
}