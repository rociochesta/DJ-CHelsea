import { ChevronRight, MessageCircle, Ship, CircleDashed, LockKeyhole, WholeWord } from 'lucide-react';
import { visibleReveals } from './RevealGame';

const games = [
  { id: 'question', title: 'A question for us', Icon: MessageCircle },
  { id: 'wheel', title: 'Wheel of Fortune', Icon: CircleDashed },
  { id: 'reveal', title: 'Reveal', Icon: LockKeyhole },
  { id: 'words', title: 'Words for us', Icon: WholeWord },
  { id: 'battleship', title: 'Battleship', Icon: Ship },
];

export default function SecretGames({ currentUser, roomState, onOpen, activeGame = '' }) {
  const waiting = visibleReveals(roomState?.revealInbox, currentUser?.id).filter(reveal => reveal.senderId !== currentUser?.id && reveal.status !== 'complete');
  return <section className="lounge-games rounded-2xl border p-3">
    <header className="px-1 pb-3 pt-1"><h2 className="text-xl font-medium">Games</h2><p className="mt-1 text-[10px] uppercase tracking-widest text-white/45">Play, tease, fight, make up.</p></header>
    <nav aria-label="Games" className="space-y-1">
      {games.map(({ id, title, Icon }) => <button type="button" key={id} onClick={() => onOpen(id)} aria-current={activeGame === id ? 'page' : undefined} className={`lounge-game-row group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${activeGame === id ? 'lounge-game-active' : ''}`}>
        <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 flex-1"><span className="block text-xs font-medium">{title}</span>{id === 'reveal' && waiting.length > 0 && <span className="mt-1 block text-[10px] text-white/50">{waiting[0].senderName || 'Your person'} left you a Reveal</span>}</span>
        {id === 'reveal' && waiting.length > 0 && <span className="rounded-full border border-white/10 px-1.5 text-[10px]">{waiting.length}</span>}
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5" />
      </button>)}
    </nav>
  </section>;
}
