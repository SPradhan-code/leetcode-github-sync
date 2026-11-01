import type { Submission } from '../src/domain/submission';

export function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    submissionId: '123456789',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    url: 'https://leetcode.com/problems/two-sum/submissions/123456789/',
    language: 'python3',
    verdict: 'accepted',
    runtimeMs: 42,
    memoryBytes: 17_000_000,
    submittedAt: '2026-10-26T10:00:00.000Z',
    code: 'class Solution: pass',
    ...overrides,
  };
}