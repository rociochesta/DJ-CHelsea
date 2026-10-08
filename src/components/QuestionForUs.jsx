import { useEffect, useState } from 'react';
import { MessageCircle, Dice5, X, MessageSquare, UserRound, LockKeyhole } from 'lucide-react';
import { database, ref, runTransaction } from '../utils/firebase';
import { QUESTIONS_FOR_US, pickQuestion, updateQuestionGame } from '../utils/questionsForUs';
import WallComposer from './WallComposer';
import WallImage from './WallImage';

export default function QuestionForUs({ roomCode, currentUser, game, featured = false, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = game?.current;
  const answers = Object.entries(current?.answers || {});
  const mine = current?.answers?.[currentUser?.id];
  const complete = answers.length === 2;
  const Container = featured ? 'section' : 'details';
  useEffect(() => { setError(''); }, [current?.id]);

  const act = async action => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await runTransaction(ref(database, `karaoke-rooms/${roomCode}/questionForUs`), existing => updateQuestionGame(existing, action));
      if (!result.committed) throw new Error('The question changed or someone already replied. Your draft is still here.');
      return true;
    } catch (cause) { setError(cause.message || 'Could not save this. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  const newQuestion = () => act({ type: 'new', expectedId: current?.id, id: crypto.randomUUID(), questionIndex: pickQuestion(current?.questionIndex), now: Date.now() });
  const answer = async blocks => { const saved = await act({ type: 'answer', expectedId: current.id, user: currentUser, blocks, now: Date.now() }); if (!saved) throw new Error('Could not save answer'); };

  const renderContent = value => <div className="space-y-2">{(value.blocks ? Object.values(value.blocks) : [{ type: 'text', text: value.text }]).map((block, index) => block.type === 'text' ? <p key={index} className="whitespace-pre-wrap break-words text-sm text-white/85">{block.text}</p> : <div key={index}><WallImage src={block.url} />{block.giphyId && <a href={block.sourceUrl || 'https://giphy.com/'} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50">Powered By GIPHY</a>}</div>)}</div>;

  const renderAnswers = item => <div className="space-y-3">{Object.entries(item.answers || {}).map(([id, value]) => <div key={id} className="rounded-2xl border border-violet-200/10 bg-black/15 p-4"><p className="mb-2 text-xs font-semibold text-violet-200/70">{value.name}</p>{renderContent(value)}</div>)}</div>;

  const title = <span className="inline-flex items-center gap-2 align-middle"><MessageCircle className="h-4 w-4 text-violet-300" /><span className="text-xl">A question for us</span></span>;
  return <Container className="question-game space-y-5">
    {!featured && <summary className="font-semibold cursor-pointer">{title}</summary>}
    <div className="space-y-5">
    <div className="question-spotlight rounded-3xl px-6 py-5 text-center sm:px-10 sm:py-6">
      <div className="mb-6 flex items-center justify-between gap-4 text-left"><p className="text-xs text-white/50">One question. Two answers. No dodging.</p>{featured && <button type="button" onClick={onClose} aria-label="Close question" className="wall-send shrink-0 rounded-full p-2"><X className="h-4 w-4"/></button>}</div>
      <MessageSquare className="mx-auto mb-4 h-8 w-8 text-[#d8a56f]"/>
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#d8a56f]">A question for us</p>
      <p className="mx-auto my-6 max-w-2xl text-2xl font-medium leading-relaxed text-[#F3F4F6] sm:text-3xl">{current ? QUESTIONS_FOR_US[current.questionIndex] : 'Ready to put your cards on the table?'}</p>
      {(!current || !answers.length || complete) && <button type="button" disabled={busy} onClick={newQuestion} className="wall-attach mx-auto mb-3 !px-5 !py-2.5 !text-sm disabled:opacity-40"><Dice5 className="h-4 w-4"/>{current ? 'Next question' : 'Pick our question'}</button>}
    </div>
    {current && <>
      <div className="question-answer-status rounded-2xl border border-white/10 bg-black/15 p-4"><div className="grid grid-cols-2 divide-x divide-white/10 text-sm"><p className="flex flex-wrap items-center justify-center gap-2 px-2"><UserRound className="h-5 w-5 text-[#d8a56f]"/>You: {mine ? 'Locked in' : 'Your move'}{mine && <LockKeyhole className="h-3 w-3 text-[#d8a56f]"/>}</p><p className="flex flex-wrap items-center justify-center gap-2 px-2"><UserRound className="h-5 w-5 text-purple-300"/>Them: {answers.some(([id])=>id!==currentUser?.id) ? 'Locked in' : 'Not answered yet'}</p></div><p className="mt-4 text-center text-xs text-white/45">{complete ? 'Both answers unlocked. Now we’re talking.' : 'Answers unlock when you both submit.'}</p></div>
      {complete ? <div className="space-y-3">{renderAnswers(current)}</div> : mine ? <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3"><p className="text-sm text-white/55">Your answer is locked in. The suspense is half the fun.</p>{renderContent(mine)}</div> : <WallComposer key={current.id} onPost={answer} disabled={busy || !currentUser?.id} placeholder="Type your confession…" submitLabel="Lock in my answer" wallStyle />}
    </>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!!Object.keys(game?.history || {}).length && <details className="border-t border-white/10 pt-3"><summary className="cursor-pointer text-sm text-white/55">Our past answers</summary><div className="mt-4 space-y-5">{Object.values(game.history).sort((a, b) => b.createdAt - a.createdAt).map(item => <div key={item.id} className="space-y-3"><p className="text-lg font-semibold text-violet-300">{QUESTIONS_FOR_US[item.questionIndex]}</p>{renderAnswers(item)}</div>)}</div></details>}
    </div>
  </Container>;
}
