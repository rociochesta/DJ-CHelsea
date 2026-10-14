import { useState } from 'react';
import { database, ref, push, set } from '../utils/firebase';

const button = 'rounded-xl border border-white/15 px-3 py-2 text-sm disabled:opacity-40';
export default function MusicQuizReports({ song, currentUser, roomCode, challengeId, round }) {
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState('');
  const [error, setError] = useState('');
  const report = async () => {
    if (!song || busy || !currentUser?.id) return;
    setBusy(true); setError('');
    try {
      await set(push(ref(database, 'music-quiz-reports')), { audioUrl: song.audioUrl, artist: song.artist, title: song.title, category: song.category || 'Other', reason: 'Silence or delayed start', roomCode, challengeId, round, reportedBy: currentUser.name || 'Someone', reporterId: currentUser.id, createdAt: Date.now(), resolved: false });
      setReported(`${challengeId}:${round}`);
    } catch { setError('Could not save this report. Try again.'); }
    finally { setBusy(false); }
  };
  if (!song) return null;
  return <div className="space-y-3 border-t border-white/10 pt-3">
    {song && <button type="button" className={button} onClick={report} disabled={busy || !currentUser?.id || reported === `${challengeId}:${round}`}>{reported === `${challengeId}:${round}` ? 'Song reported ✓' : 'Report song · silence / delayed start'}</button>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
