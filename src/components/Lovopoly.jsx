import { database, ref, runTransaction } from '../utils/firebase';
import { rollLovopolyDice, updateLovopoly } from '../utils/lovopoly';
import LovopolyGame from './LovopolyGame';

export default function Lovopoly({ roomCode, currentUser, game, onClose }) {
  async function onAction(type, extra) {
    const action = {
      ...extra, type, user: currentUser, id: crypto.randomUUID(), now: Date.now(),
      expectedGameId: game?.id || null, expectedRevision: game?.revision,
      ...(['opening-roll', 'roll', 'dice-preview', 'heart-reroll'].includes(type) ? { dice: rollLovopolyDice() } : {}),
    };
    const result = await runTransaction(
      ref(database, `karaoke-rooms/${roomCode}/lovopolyGame`),
      existing => updateLovopoly(existing, action),
      { applyLocally: false },
    );
    if (!result.committed) throw new Error('Your setup could not be saved. Please try again.');
  }
  return <LovopolyGame currentUser={currentUser} game={game} onAction={onAction} onClose={onClose} />;
}
