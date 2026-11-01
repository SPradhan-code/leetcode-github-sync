import type { Submission } from '../domain/submission';
import { parseSubmissionPath, type SubmissionRef } from './urlParser';

export interface DetectorDeps {
  getPathname(): string;
  loadSubmission(ref: SubmissionRef): Promise<Submission | null>;
  onSubmission(submission: Submission): Promise<void>;
}

/** Knows nothing about GitHub. Emits each submission once per visit to its result URL. */
export class SubmissionDetector {
  private activeId: string | null = null;

  constructor(private readonly deps: DetectorDeps) {}

  async check(): Promise<void> {
    const ref = parseSubmissionPath(this.deps.getPathname());
    if (!ref) {
      this.activeId = null;
      return;
    }
    if (ref.submissionId === this.activeId) return;
    this.activeId = ref.submissionId;

    try {
      const submission = await this.deps.loadSubmission(ref);
      if (submission) await this.deps.onSubmission(submission);
    } catch {
      // Stay on activeId: leaving and returning to the page retries, which prevents a request loop.
    }
  }
}