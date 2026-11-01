import type { Settings } from '../domain/settings';
import { buildDedupeKey, type Submission } from '../domain/submission';

export type IgnoreReason =
  | 'unknown_verdict'
  | 'missing_code'
  | 'auto_sync_disabled'
  | 'verdict_not_synced';

export type Decision =
  | { action: 'candidate'; dedupeKey: string }
  | { action: 'ignore'; reason: IgnoreReason };

const ignore = (reason: IgnoreReason): Decision => ({ action: 'ignore', reason });

/** Pure policy. Pause is deliberately not checked here: paused submissions still queue and are held. */
export function decide(submission: Submission, settings: Settings): Decision {
  if (submission.verdict === 'unknown') return ignore('unknown_verdict');
  if (submission.code === null) return ignore('missing_code');
  if (!settings.autoSyncEnabled) return ignore('auto_sync_disabled');
  if (submission.verdict !== 'accepted' && !settings.syncNonAccepted) {
    return ignore('verdict_not_synced');
  }
  return { action: 'candidate', dedupeKey: buildDedupeKey(submission) };
}