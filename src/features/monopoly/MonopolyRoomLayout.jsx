import React, { useEffect, useId, useRef, useState } from 'react';
import Monopoly from './Monopoly';
import './room-layout.css';

// Keep the room panels mounted so opening the board does not stop playback.
export default function MonopolyRoomLayout({ active, onClose, roomCode, currentUser, roomState, children }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsId = useId();
  const backButton = useRef(null);
  useEffect(() => {
    if (active) {
      setToolsOpen(false);
      backButton.current?.focus({ preventScroll: true });
      backButton.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [active]);

  return <div className={`na-room-layout ${active ? 'na-room-focused' : ''} ${toolsOpen ? 'na-room-tools-open' : ''}`}>
    {active && <main className="na-room-board">
      <button ref={backButton} type="button" className="na-room-back" onClick={onClose}>← Back to room</button>
      <Monopoly roomCode={roomCode} currentUser={currentUser} game={roomState?.monopolyGame} participants={roomState?.participants} />
    </main>}
    <div className="na-room-tools">
      {active && <button type="button" className="na-room-toggle" aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen(open => !open)}>
        {toolsOpen ? '→ Close' : '← Games · Queue · Search'}
      </button>}
      <div id={toolsId} className="na-room-content" hidden={active && !toolsOpen}>{children}</div>
    </div>
  </div>;
}
