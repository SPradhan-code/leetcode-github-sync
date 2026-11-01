import { describe, expect, it } from 'vitest';
import { parseSubmissionPath } from '../src/content/urlParser';

describe('parseSubmissionPath', () => {
  it('extracts slug and id from a submission result URL', () => {
    expect(parseSubmissionPath('/problems/two-sum/submissions/123456789/')).toEqual({
      problemSlug: 'two-sum',
      submissionId: '123456789',
    });
  });
  it('accepts the path with or without a trailing slash', () => {
    expect(parseSubmissionPath('/problems/two-sum/submissions/1')).not.toBeNull();
    expect(parseSubmissionPath('/problems/two-sum/submissions/1/')).not.toBeNull();
  });
  it('rejects every other page', () => {
    for (const path of [
      '/problems/two-sum/',
      '/problems/two-sum/submissions/',
      '/problems/Two-Sum/submissions/1/',
      '/problems/two-sum/submissions/abc/',
      '/problems/two-sum/submissions/1/extra',
      '/contest/weekly-contest-1/',
    ]) {
      expect(parseSubmissionPath(path)).toBeNull();
    }
  });
});