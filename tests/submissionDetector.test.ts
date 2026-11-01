import { describe, expect, it, vi } from 'vitest';
import { SubmissionDetector } from '../src/content/submissionDetector';
import type { SubmissionRef } from '../src/content/urlParser';
import type { Submission } from '../src/domain/submission';
import { makeSubmission } from './fixtures';

const RESULT_PATH = '/problems/two-sum/submissions/111/';

function setup(initialPath: string) {
  let path = initialPath;
  const sent: Submission[] = [];
  const load = vi.fn(async (ref: SubmissionRef) =>
    makeSubmission({ submissionId: ref.submissionId }),
  );
  const detector = new SubmissionDetector({
    getPathname: () => path,
    loadSubmission: load,
    onSubmission: async (submission) => {
      sent.push(submission);
    },
  });
  return { detector, sent, load, setPath: (p: string) => void (path = p) };
}

describe('SubmissionDetector', () => {
  it('sends a submission once however often it is checked', async () => {
    const { detector, sent, load } = setup(RESULT_PATH);
    await detector.check();
    await detector.check();
    await detector.check();
    expect(sent).toHaveLength(1);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('ignores pages that are not a submission result', async () => {
    const { detector, sent, load } = setup('/problems/two-sum/');
    await detector.check();
    expect(sent).toHaveLength(0);
    expect(load).not.toHaveBeenCalled();
  });
  it('sends again after leaving and returning to the result page', async () => {
    const { detector, sent, setPath } = setup(RESULT_PATH);
    await detector.check();
    setPath('/problems/two-sum/');
    await detector.check();
    setPath(RESULT_PATH);
    await detector.check();
    expect(sent).toHaveLength(2);
  });
});