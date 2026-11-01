import { z } from 'zod';
import type { Decision } from '../application/submissionProcessor';
import type { Settings } from '../domain/settings';
import { SubmissionSchema } from '../domain/submission';

export const RequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GET_STATE') }),
  z.object({ type: z.literal('SUBMISSION_DETECTED'), submission: SubmissionSchema }),
]);
export type Request = z.infer<typeof RequestSchema>;

export type ConnectionStatus = 'disconnected';

export interface AppState {
  extensionVersion: string;
  connection: ConnectionStatus;
  settings: Settings;
}

export type Response =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

export type DetectionResponse =
  | { ok: true; decision: Decision }
  | { ok: false; error: string };