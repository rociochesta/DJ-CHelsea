import { seededRandom } from './wordGame.js';
import { wheelTheme, wheelPuzzle } from './wheelPhrases.js';

export const WHEEL_SEGMENTS = [
  { type:'vowel',count:1,label:'Reveal 1 vowel',color:'#9d4765' },
  { type:'letter',count:1,label:'Reveal 1 letter',color:'#595282' },
  { type:'vowel',count:2,label:'Reveal 2 vowels',color:'#b15b78' },
  { type:'letter',count:2,label:'Reveal 2 letters',color:'#6c6595' },
  { type:'lose',count:0,label:'Lose your turn',color:'#292736' },
  { type:'letter',count:3,label:'Reveal 3 letters',color:'#8079aa' },
];
export const normalizeSolution = text => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function canTakeWheelTurn(game,userId) {
  return !!userId && game?.turn === userId && !!game.players?.[userId] && (game.status === 'playing' || (game.status === 'waiting' && game.starter !== 'other' && (!Object.keys(game.moves || {}).length || ['pick','after-reveal'].includes(game.turnPhase))));
}
export function wheelSpinResult(game, seed) {
  const random = seededRandom(seed);
  const segment = Math.floor(random()*WHEEL_SEGMENTS.length);
  const { type,count } = WHEEL_SEGMENTS[segment];
  const answerLetters = new Set((wheelPuzzle(game)?.answer || '').replace(/[^A-Z]/g,''));
  const tried = new Set([...Object.keys(game.guessed || {}),...Object.keys(game.revealed || {})]);
  const available = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(letter => !tried.has(letter));
  let options = [];
  const draw = (pool,n) => { const selected = []; const remaining = [...pool]; while (selected.length < n && remaining.length) selected.push(remaining.splice(Math.floor(random()*remaining.length),1)[0]); return selected; };
  if (type === 'vowel') options = available.filter(letter => 'AEIOU'.includes(letter));
  if (type === 'letter') {
    const consonants = available.filter(letter => !'AEIOU'.includes(letter));
    const present = consonants.filter(letter => answerLetters.has(letter));
    const absent = consonants.filter(letter => !answerLetters.has(letter));
    // Keep the existing mixed offer while letting the player choose the letters.
    const hitCount = Math.min(7,present.length);
    const missCount = Math.min(absent.length,Math.max(1,Math.round(hitCount*3/7)));
    options = [...draw(present,hitCount),...draw(absent,hitCount ? missCount : 10)].sort();
    if (options.length < count) options = consonants;
  }
  return { segment,type,count,options };
}

export function updateWheelGame(game,action) {
  const user = action.user;
  if (!user?.id || !action.id || !Number.isFinite(action.now)) throw new Error('Rejoin the room to play.');
  if (action.type === 'start') {
    if (game && game.status !== 'finished') throw new Error('A game is already waiting for you. Open it to play.');
    if ((game?.id || null) !== (action.expectedGameId || null)) throw new Error('The game changed. Open the current game.');
    const theme = wheelTheme(action.themeId);
    if (!theme) throw new Error('Choose a theme.');
    const history = { ...game?.history };
    if (game) history[game.id] = { id:game.id,themeId:game.themeId,puzzleId:game.puzzleId,winnerId:game.winnerId || '',winnerName:game.winnerName || '',finishedAt:game.finishedAt,endReason:game.endReason };
    const played = new Set(Object.values(history).filter(item => item.themeId === theme.id).map(item => item.puzzleId));
    let options = theme.phrases.filter(phrase => !played.has(phrase.id));
    if (!options.length) options = theme.phrases.filter(phrase => phrase.id !== game?.puzzleId);
    const puzzle = options[Math.floor(seededRandom(action.seed)()*options.length)];
    return { id:action.id,status:'waiting',themeId:theme.id,puzzleId:puzzle.id,players:{ [user.id]:{ id:user.id,name:user.name || 'Someone' } },turn:user.id,turnPhase:'choice',starter:action.starter === 'other' ? 'other' : 'me',revision:0,createdAt:action.now,revealed:{},guessed:{},moves:{},history };
  }
  if (!game || game.id !== action.expectedGameId) throw new Error('This game changed. Open it again.');
  if (game.moves?.[action.id] || game.finishCommandId === action.id) return game;
  if (action.type === 'join') {
    if (game.players?.[user.id]) return game;
    if (game.status !== 'waiting' || Object.keys(game.players || {}).length !== 1) throw new Error('This game already has two players.');
    return { ...game,players:{ ...game.players,[user.id]:{ id:user.id,name:user.name || 'Someone' } },status:'playing',turn:game.starter === 'other' || !game.turn ? user.id : game.turn,revision:game.revision+1 };
  }
  if (game.revision !== action.expectedRevision) throw new Error('A turn changed while you were playing. Review the puzzle and try again.');
  if (action.type === 'finish') {
    if (!game.players?.[user.id] || !['waiting','playing'].includes(game.status)) throw new Error('Only a player can finish this game.');
    return { ...game,status:'finished',turn:'',revision:game.revision+1,finishedAt:action.now,finishCommandId:action.id,endReason:`Finished by ${game.players[user.id].name}` };
  }
  if (!canTakeWheelTurn(game,user.id)) throw new Error('It is not your turn.');
  const puzzle = wheelPuzzle(game);
  if (!puzzle) throw new Error('This puzzle is unavailable. Finish this game and start another.');
  let revealed = { ...game.revealed };
  let move = { id:action.id,type:action.type,userId:user.id,name:game.players[user.id].name,at:action.now };
  if (action.type === 'spin') {
    if (['pick','after-reveal'].includes(game.turnPhase)) throw new Error('Choose your letters, then solve or pass. You can spin once per turn.');
    const result = wheelSpinResult(game,action.seed);
    move = { ...move,segment:result.segment,outcome:result.type,count:result.count,keepsTurn:result.type !== 'lose' };
    if (result.type !== 'lose') return { ...game,turnPhase:result.options.length ? 'pick' : 'after-reveal',revealOffer:{ type:result.type,remaining:Math.min(result.count,result.options.length),options:result.options },revision:game.revision+1,lastMove:move,moves:{ ...game.moves,[action.id]:move } };
  }
  else if (action.type === 'pick') {
    const offer = game.revealOffer;
    const options = Object.values(offer?.options || {});
    if (game.turnPhase !== 'pick' || !offer?.remaining || !options.includes(action.letter) || game.guessed?.[action.letter] || game.revealed?.[action.letter]) throw new Error('Choose an available letter.');
    const hit = puzzle.answer.includes(action.letter);
    if (hit) revealed[action.letter] = true;
    const guessed = { ...game.guessed,[action.letter]:true };
    const remaining = offer.remaining-1;
    const nextOptions = options.filter(letter => letter !== action.letter);
    move = { ...move,letter:action.letter,hit,remaining };
    return { ...game,revealed,guessed,revealOffer:{ ...offer,remaining,options:nextOptions },turnPhase:remaining && nextOptions.length ? 'pick' : 'after-reveal',revision:game.revision+1,lastMove:move,moves:{ ...game.moves,[action.id]:move } };
  }
  else if (action.type === 'solve') {
    if (game.turnPhase === 'pick') throw new Error('Choose your letters before solving.');
    if (!normalizeSolution(action.solution) || String(action.solution).length > 200) throw new Error('Type your solution first.');
    const correct = normalizeSolution(action.solution) === normalizeSolution(puzzle.answer);
    move.correct = correct;
    if (correct) return { ...game,status:'finished',turn:'',revision:game.revision+1,winnerId:user.id,winnerName:game.players[user.id].name,finishedAt:action.now,endReason:'Puzzle solved',lastMove:move,moves:{ ...game.moves,[action.id]:move } };
    // Wrong guesses stay out of the shared history, so the opponent does not receive a hint.
  } else if (action.type === 'pass') {
    if (game.turnPhase !== 'after-reveal') throw new Error('Spin before passing your turn.');
  } else throw new Error('Choose Solve, Spin, or Pass.');
  const turn = Object.keys(game.players).find(id => id !== user.id) || '';
  return { ...game,turn,turnPhase:'choice',revision:game.revision+1,revealed,lastMove:move,moves:{ ...game.moves,[action.id]:move } };
}
