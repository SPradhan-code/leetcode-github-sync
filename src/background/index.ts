import { decide } from '../application/submissionProcessor';
import type { Submission } from '../domain/submission';
import {
  RequestSchema,
  type DetectionResponse,
  type Response,
} from '../messaging/messages';
import { settingsStore } from './container';

const LEETCODE_ORIGIN = 'https://leetcode.com';

function isLeetCodeSender(sender: chrome.runtime.MessageSender): boolean {
  try {
    return new URL(sender.url ?? '').origin === LEETCODE_ORIGIN;
  } catch {
    return false;
  }
}

async function handleGetState(): Promise<Response> {
  return {
    ok: true,
    state: {
      extensionVersion: chrome.runtime.getManifest().version,
      connection: 'disconnected', // auth is implemented in Phase 4
      settings: await settingsStore.load(),
    },
  };
}

async function handleSubmissionDetected(submission: Submission): Promise<DetectionResponse> {
  const decision = decide(submission, await settingsStore.load());
  // Never log submission.code
  console.info('[lc-sync]', {
    submissionId: submission.submissionId,
    problemSlug: submission.problemSlug,
    verdict: submission.verdict,
    decision,
  });
  // Phase 6 will persist a SyncJob here. Phase 3 only reports the decision.
  return { ok: true, decision };
}

function respond(work: Promise<unknown>, sendResponse: (response: unknown) => void): void {
  work.then(sendResponse).catch(() => sendResponse({ ok: false, error: 'Internal error' }));
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  const parsed = RequestSchema.safeParse(message);
  if (!parsed.success) {
    sendResponse({ ok: false, error: 'Invalid message' } satisfies Response);
    return false;
  }

  const request = parsed.data;
  switch (request.type) {
    case 'GET_STATE':
      respond(handleGetState(), sendResponse);
      return true;
    case 'SUBMISSION_DETECTED':
      if (!isLeetCodeSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted sender' } satisfies Response);
        return false;
      }
      respond(handleSubmissionDetected(request.submission), sendResponse);
      return true;
  }
});