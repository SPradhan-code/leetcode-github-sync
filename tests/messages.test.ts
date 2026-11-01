import { describe, expect, it } from 'vitest';
import { RequestSchema } from '../src/messaging/messages';

describe('RequestSchema', () => {
  it('accepts GET_STATE', () => {
    expect(RequestSchema.safeParse({ type: 'GET_STATE' }).success).toBe(true);
  });
  it('rejects unknown types and non-objects', () => {
    expect(RequestSchema.safeParse({ type: 'DROP_TABLES' }).success).toBe(false);
    expect(RequestSchema.safeParse('GET_STATE').success).toBe(false);
  });
});