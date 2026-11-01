import type { DetectionResponse, Request } from '../messaging/messages';
import { fetchSubmissionDetailsRaw, loadSubmission } from './leetcodeApi';
import { SubmissionDetector } from './submissionDetector';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function readCsrfToken(): string | null {
  const value = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)?.[1];
  return value ? decodeURIComponent(value) : null;
}

const detector = new SubmissionDetector({
  getPathname: () => location.pathname,
  loadSubmission: async (ref) => {
    const submission = await loadSubmission(ref, {
      fetchRaw: (id) => fetchSubmissionDetailsRaw(id, readCsrfToken()),
      sleep,
      origin: location.origin,
      log: (message) => console.warn('[lc-sync]', message),
    });
    if (!submission) console.warn('[lc-sync] could not read submission', ref.submissionId);
    return submission;
  },
  onSubmission: async (submission) => {
    const request: Request = { type: 'SUBMISSION_DETECTED', submission };
    const response = (await chrome.runtime.sendMessage(request)) as DetectionResponse;
    console.info('[lc-sync] detected', {
      submissionId: submission.submissionId,
      verdict: submission.verdict,
      result: response,
    });
  },
});

setInterval(() => void detector.check(), 1000);
void detector.check();