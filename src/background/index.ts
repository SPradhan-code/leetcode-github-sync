
import { decide } from '../application/submissionProcessor';
import { createSyncJob } from '../domain/syncJob';
import type { Submission } from '../domain/submission';
import {
  RequestSchema,
  type DetectionResponse,
  type Response,
} from '../messaging/messages';
import {
  settingsStore,
  syncJobStore,
  syncQueueProcessor,
} from './container';

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
      connection: 'disconnected',
      settings: await settingsStore.load(),
    },
  };
}

async function handleSubmissionDetected(
  submission: Submission,
): Promise<DetectionResponse> {
  const settings = await settingsStore.load();
  const decision = decide(submission, settings);

  if (decision.action === 'ignore') {
    return { ok: true, decision };
  }

  try {
    const job = createSyncJob(submission);
    const enqueued = await syncJobStore.enqueue(job);

    if (enqueued) {
      void syncQueueProcessor.processNext().catch((error: unknown) => {
        console.error(
          '[lc-sync] Queue processor error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      });
    }

    console.info('[lc-sync]', {
      submissionId: submission.submissionId,
      problemSlug: submission.problemSlug,
      result: enqueued ? 'queued' : 'duplicate',
    });

    return { ok: true, decision };
  } catch (error) {
    console.error(
      '[lc-sync] Queue error:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return {
      ok: false,
      error: 'Failed to save submission to queue',
    };
  }
}

function respond(
  work: Promise<unknown>,
  sendResponse: (response: unknown) => void,
): void {
  work
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: 'Internal error' }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
