import { describe, expect, it } from 'vitest';
import { decide } from '../src/application/submissionProcessor';
import { DEFAULT_SETTINGS } from '../src/domain/settings';
import { makeSubmission } from './fixtures';

describe('decide', () => {
  it('makes an accepted submission a candidate with a stable key', () => {
    expect(decide(makeSubmission(), DEFAULT_SETTINGS)).toEqual({
      action: 'candidate',
      dedupeKey: 'lc:123456789',
    });
  });
  it('still queues while sync is paused (the orchestrator holds it)', () => {
    const settings = { ...DEFAULT_SETTINGS, syncPaused: true };
    expect(decide(makeSubmission(), settings).action).toBe('candidate');
  });
  it('ignores non-accepted verdicts by default', () => {
    expect(decide(makeSubmission({ verdict: 'wrong_answer' }), DEFAULT_SETTINGS)).toEqual({
      action: 'ignore',
      reason: 'verdict_not_synced',
    });
  });
  it('accepts non-accepted verdicts when the setting is on', () => {
    const settings = { ...DEFAULT_SETTINGS, syncNonAccepted: true };
    expect(decide(makeSubmission({ verdict: 'wrong_answer' }), settings).action).toBe('candidate');
  });
  it('ignores everything when auto-sync is off', () => {
    const settings = { ...DEFAULT_SETTINGS, autoSyncEnabled: false };
    expect(decide(makeSubmission(), settings)).toEqual({
      action: 'ignore',
      reason: 'auto_sync_disabled',
    });
  });
  it('ignores submissions without code', () => {
    expect(decide(makeSubmission({ code: null }), DEFAULT_SETTINGS)).toEqual({
      action: 'ignore',
      reason: 'missing_code',
    });
  });
  it('ignores unknown verdicts', () => {
    expect(decide(makeSubmission({ verdict: 'unknown' }), DEFAULT_SETTINGS)).toEqual({
      action: 'ignore',
      reason: 'unknown_verdict',
    });
  });
});