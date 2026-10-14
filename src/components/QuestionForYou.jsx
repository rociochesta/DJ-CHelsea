import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { database, ref, set, runTransaction } from '../utils/firebase';
import { answerQuestion } from '../utils/questionsForYou';
import { QUESTIONS_FOR_US, pickQuestion } from '../utils/questionsForUs';
import WallComposer from './WallComposer';
import WallImage from './WallImage';
import WallVideo from './WallVideo';
import WallYouTube from './WallYouTube';

function AnswerContent({ blocks }) {
  return <div className="space-y-3">{Object.values(blocks || {}).map((block, index) => block.type === 'text' ? <p key={index} className="whitespace-pre-wrap break-words text-white/85">{block.text}</p> : block.type === 'youtube' ? <WallYouTube key={index} videoId={block.videoId} /> : block.type === 'video' ? <WallVideo key={index} url={block.url} /> : <div key={index}><WallImage src={block.url} />{block.giphyId && <a href={block.sourceUrl || 'https://giphy.com/'} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50">Powered By GIPHY</a>}</div>)}</div>;
}

export default function QuestionForYou({ roomCode, currentUser, roomState, onClose, questionOnly }) {
  const [recipientId, setRecipientId] = useState('');
  const [question, setQuestion] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(() => pickQuestion());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const people = Object.values({ ...Object.fromEntries(Object.values(roomState?.secretProfiles || {}).map(person => [person.id, person])), ...roomState?.participants }).filter(person => person.id !== currentUser.id);
  const recipient = people.find(person => person.id === recipientId) || people[0];
  const items = questionOnly ? [questionOnly] : Object.values(roomState?.questionsForYou || {}).filter(item => item.recipientId === currentUser.id || item.senderId === currentUser.id).sort((a, b) => b.createdAt - a.createdAt);
  const send = async event => {
    event.preventDefault(); if (busy || !recipient || !question.trim()) return;
    setBusy(true); setError('');
    try {
      const id = crypto.randomUUID();
      await set(ref(database, `karaoke-rooms/${roomCode}/questionsForYou/${id}`), { id, question: question.trim(), senderId: currentUser.id, senderName: currentUser.name, recipientId: recipient.id, recipientName: recipient.name, createdAt: Date.now() });
      setQuestion('');
    } catch { setError('Could not send your question. Please try again.'); }
    finally { setBusy(false); }
  };
  const answer = async (item, blocks) => {
    const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/questionsForYou/${item.id}`), stored => answerQuestion(stored, currentUser, blocks, Date.now()));
    if (!result.committed) throw new Error('This question was already answered or is no longer available.');
    if (questionOnly) onClose?.();
  };
  return <section className="question-game space-y-5">
    <header className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">A question for you</h2>{onClose && <button type="button" onClick={onClose} aria-label="Close questions" className="wall-attach p-2"><X className="h-4 w-4" /></button>}</header>
    {!questionOnly && <form onSubmit={send} className="rounded-2xl border border-white/10 bg-black/15 p-5 space-y-3">
      <p className="text-sm text-white/60">Leave them something to think about. It will pop up when they enter.</p>
      <label className="block text-sm">For<select aria-label="Question recipient" value={recipient?.id || ''} onChange={event => setRecipientId(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#1d1726] p-3">{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      {!people.length && <p className="text-sm text-white/50">Your person needs to join the room once before you can leave them a question.</p>}
      <div className="question-spotlight rounded-2xl p-4 space-y-3">
        <p className="text-xs text-white/55">Need inspiration? Pick one of our questions or write your own below.</p>
        <p className="text-lg leading-relaxed">{QUESTIONS_FOR_US[suggestionIndex]}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setQuestion(QUESTIONS_FOR_US[suggestionIndex])} className="wall-attach disabled:opacity-40">Use this question</button>
          <button type="button" disabled={busy} onClick={() => setSuggestionIndex(previous => pickQuestion(previous))} className="wall-attach disabled:opacity-40"><RefreshCw className="h-4 w-4" />Another question</button>
        </div>
      </div>
      <textarea aria-label="Your question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} rows={3} placeholder="What would you like to ask them?" className="w-full rounded-xl border border-white/15 bg-black/20 p-3" />
      <button type="submit" disabled={busy || !recipient || !question.trim()} className="wall-attach disabled:opacity-40">{busy ? 'Sending…' : 'Leave a question'}</button>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    </form>}
    {!items.length && <p className="text-sm text-white/50">Questions and answers will stay here.</p>}
    {items.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-5 space-y-4">
      <p className="text-xs text-white/55">{item.senderId === currentUser.id ? `You asked ${item.recipientName}` : `${item.senderName} left you a question`}</p>
      <h3 className="text-2xl leading-relaxed whitespace-pre-wrap break-words">{item.question}</h3>
      {item.answer ? <><p className="text-xs text-white/55">{item.answer.name} answered</p><AnswerContent blocks={item.answer.blocks} /></> : item.recipientId === currentUser.id ? <WallComposer onPost={blocks => answer(item, blocks)} placeholder="Leave your answer…" submitLabel="Send answer" wallStyle allowYouTube allowVideoUpload /> : <p className="text-sm text-white/50">Waiting for their answer.</p>}
    </article>)}
    {questionOnly && <button type="button" autoFocus onClick={onClose} className="wall-attach">Answer later</button>}
  </section>;
}
