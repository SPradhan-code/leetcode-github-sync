import { describe, expect, it, vi } from 'vitest';
import { loadSubmission, parseSubmissionDetails } from '../src/content/leetcodeApi';

const ctx = { submissionId: '123', problemSlug: 'two-sum', origin: 'https://leetcode.com' };
const ref = { submissionId: '123', problemSlug: 'two-sum' };

function raw(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      submissionDetails: {
        runtime: 42,
        memory: 17_000_000,
        code: 'print(1)',
        timestamp: 1_790_000_000,
        statusCode: 10,
        lang: { name: 'python3' },
        question: { title: 'Two Sum', titleSlug: 'two-sum' },
        ...overrides,
      },
    },
  };
}
const pendingRaw = { data: { submissionDetails: null } };

describe('parseSubmissionDetails', () => {
  it('maps a complete accepted response', () => {
    const result = parseSubmissionDetails(raw(), ctx);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.submission).toMatchObject({
      submissionId: '123',
      problemSlug: 'two-sum',
      language: 'python3',
      verdict: 'accepted',
      runtimeMs: 42,
      memoryBytes: 17_000_000,
      url: 'https://leetcode.com/problems/two-sum/submissions/123/',
      submittedAt: new Date(1_790_000_000 * 1000).toISOString(),
    });
  });
  it('is pending while submissionDetails is null', () => {
    expect(parseSubmissionDetails(pendingRaw, ctx).kind).toBe('pending');
  });
  it('is pending while statusCode is null', () => {
    expect(parseSubmissionDetails(raw({ statusCode: null }), ctx).kind).toBe('pending');
  });
  it('is invalid when the problem slug differs from the URL', () => {
    const result = parseSubmissionDetails(
      raw({ question: { title: 'X', titleSlug: 'other' } }),
      ctx,
    );
    expect(result.kind).toBe('invalid');
  });
});

describe('loadSubmission', () => {
  it('retries through errors and pending states, then returns the submission', async () => {
    const fetchRaw = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(pendingRaw)
      .mockResolvedValueOnce(raw());
    const sleep = vi.fn(async () => {});
    const result = await loadSubmission(ref, { fetchRaw, sleep, origin: ctx.origin });
    expect(result?.verdict).toBe('accepted');
    expect(fetchRaw).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
  it('gives up with null after the attempts are exhausted', async () => {
    const fetchRaw = vi.fn().mockResolvedValue(pendingRaw);
    const result = await loadSubmission(ref, {
      fetchRaw,
      sleep: async () => {},
      origin: ctx.origin,
      attempts: 3,
    });
    expect(result).toBeNull();
    expect(fetchRaw).toHaveBeenCalledTimes(3);
  });
});