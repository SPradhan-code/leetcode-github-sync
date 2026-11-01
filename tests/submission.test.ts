import { describe, expect, it } from 'vitest';
import {
  SubmissionSchema,
  buildDedupeKey,
  verdictFromStatusCode,
} from '../src/domain/submission';
import { makeSubmission } from './fixtures';

describe('verdictFromStatusCode', () => {
  it('maps known LeetCode status codes', () => {
    expect(verdictFromStatusCode(10)).toBe('accepted');
    expect(verdictFromStatusCode(11)).toBe('wrong_answer');
    expect(verdictFromStatusCode(20)).toBe('compile_error');
  });
  it('maps anything else to unknown', () => {
    expect(verdictFromStatusCode(0)).toBe('unknown');
    expect(verdictFromStatusCode(999)).toBe('unknown');
  });
});

describe('buildDedupeKey', () => {
  it('is stable and based on the submission id', () => {
    expect(buildDedupeKey({ submissionId: '42' })).toBe('lc:42');
  });
});

describe('SubmissionSchema', () => {
  it('accepts a valid submission', () => {
    expect(SubmissionSchema.safeParse(makeSubmission()).success).toBe(true);
  });
  it('rejects path-unsafe slugs, non-numeric ids and foreign URLs', () => {
    expect(SubmissionSchema.safeParse(makeSubmission({ problemSlug: '../etc' })).success).toBe(false);
    expect(SubmissionSchema.safeParse(makeSubmission({ submissionId: 'abc' })).success).toBe(false);
    expect(SubmissionSchema.safeParse(makeSubmission({ url: 'https://evil.example/x' })).success).toBe(false);
  });
});