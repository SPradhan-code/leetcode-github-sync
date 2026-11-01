export interface SubmissionRef {
  problemSlug: string;
  submissionId: string;
}

const SUBMISSION_PATH = /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)\/submissions\/(\d{1,12})\/?$/;

export function parseSubmissionPath(pathname: string): SubmissionRef | null {
  const match = SUBMISSION_PATH.exec(pathname);
  const problemSlug = match?.[1];
  const submissionId = match?.[2];
  if (!problemSlug || !submissionId) return null;
  return { problemSlug, submissionId };
}