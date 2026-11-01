import { useEffect, useState } from 'react';
import type { AppState, Request, Response } from '../messaging/messages';

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; state: AppState };

export function App() {
  const [view, setView] = useState<View>({ kind: 'loading' });

  useEffect(() => {
    const request: Request = { type: 'GET_STATE' };
    chrome.runtime
      .sendMessage(request)
      .then((res: Response) => {
        setView(res.ok ? { kind: 'ready', state: res.state } : { kind: 'error', message: res.error });
      })
      .catch((e: unknown) => {
        setView({ kind: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
      });
  }, []);

  return (
    <main>
      <h1>LeetCode → GitHub Sync</h1>
      {view.kind === 'loading' && <p>Loading…</p>}
      {view.kind === 'error' && <p className="error">Error: {view.message}</p>}
      {view.kind === 'ready' && (
        <>
          <p>
            GitHub: <span className="badge">Not connected</span>
          </p>
          <ul>
            <li>Auto-sync: {view.state.settings.autoSyncEnabled ? 'on' : 'off'}</li>
            <li>Paused: {view.state.settings.syncPaused ? 'yes' : 'no'}</li>
            <li>Sync non-accepted: {view.state.settings.syncNonAccepted ? 'yes' : 'no'}</li>
          </ul>
          <small>v{view.state.extensionVersion}</small>
        </>
      )}
    </main>
  );
}