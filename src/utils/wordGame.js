export const BOARD_SIZE = 15;
export const TILE_VALUES = { A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10, '?':0 };
const COUNTS = { A:9, B:2, C:2, D:4, E:12, F:2, G:3, H:2, I:9, J:1, K:1, L:4, M:2, N:6, O:8, P:2, Q:1, R:6, S:4, T:6, U:4, V:2, W:2, X:1, Y:2, Z:1, '?':2 };
export const cellKey = (row, col) => `${row}_${col}`;
export const tilePoints = tile => tile.blank ? 0 : TILE_VALUES[tile.letter] || 0;
const inside = (r, c) => r >= 0 && r < 15 && c >= 0 && c < 15;
const coords = key => key.split('_').map(Number);
const list = value => Object.values(value || {});

export function canPlayWordTurn(game, userId) {
  if (!userId || game?.turn !== userId || !game.players?.[userId]) return false;
  return game.status === 'playing' || (game.status === 'waiting' && game.starter !== 'other' && !Object.keys(game.moves || {}).length);
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function shuffleTiles(tiles, random) {
  const result = [...tiles];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function makeBag(random = Math.random) {
  return shuffleTiles(Object.entries(COUNTS).flatMap(([letter, count]) => Array.from({ length: count }, (_, index) => ({ id: `${letter === '?' ? 'blank' : letter}-${index}`, letter }))), random);
}
const PREMIUMS = {};
const premium = (label, pairs) => pairs.forEach(([r,c]) => { PREMIUMS[cellKey(r,c)] = label; });
premium('TW', [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]]);
premium('DW', [[1,1],[2,2],[3,3],[4,4],[7,7],[10,10],[11,11],[12,12],[13,13],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1]]);
premium('TL', [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]]);
premium('DL', [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]]);
export const premiumAt = (row, col) => PREMIUMS[cellKey(row,col)] || '';

let dictionaryPromise;
export function loadWordDictionary() {
  if (!dictionaryPromise) dictionaryPromise = fetch('/english-words.txt').then(async response => {
    if (!response.ok) throw new Error('Could not load the English dictionary. Try again.');
    const words = (await response.text()).split(/\s+/).filter(word => /^[a-z]{2,15}$/.test(word));
    if (words.length < 100000) throw new Error('The English dictionary is incomplete. Try again.');
    return new Set(words.map(word => word.toUpperCase()));
  }).catch(error => { dictionaryPromise = null; throw error; });
  return dictionaryPromise;
}

function readWord(board, row, col, dr, dc) {
  while (inside(row-dr,col-dc) && board[cellKey(row-dr,col-dc)]) { row -= dr; col -= dc; }
  const cells = [];
  while (inside(row,col) && board[cellKey(row,col)]) { cells.push(cellKey(row,col)); row += dr; col += dc; }
  return { cells, word: cells.map(key => board[key].letter).join('') };
}

export function evaluateWordMove(game, userId, placements, dictionary) {
  if (!canPlayWordTurn(game,userId)) throw new Error('It is not your turn.');
  const rack = list(game.players?.[userId]?.rack);
  const moves = list(placements);
  if (!moves.length || moves.length > 7) throw new Error('Place at least one of your letters.');
  const board = { ...game.board };
  const used = new Set(), added = new Set();
  for (const move of moves) {
    if (!Number.isInteger(move.row) || !Number.isInteger(move.col) || !inside(move.row, move.col)) throw new Error('Choose a square on the board.');
    const key = cellKey(move.row, move.col);
    if (board[key]) throw new Error('That square already has a letter.');
    const tile = rack.find(item => item.id === move.tileId);
    if (!tile || used.has(tile.id)) throw new Error('Choose letters from your rack only.');
    if (tile.letter === '?' && !/^[A-Z]$/.test(move.letter || '')) throw new Error('Choose a letter for your blank tile.');
    board[key] = { id: tile.id, letter: tile.letter === '?' ? move.letter : tile.letter, blank: tile.letter === '?' };
    used.add(tile.id); added.add(key);
  }
  const sameRow = moves.every(move => move.row === moves[0].row);
  const sameCol = moves.every(move => move.col === moves[0].col);
  if (!sameRow && !sameCol) throw new Error('Place your letters in one row or one column.');
  const horizontal = sameRow && (moves.length > 1 || !!board[cellKey(moves[0].row,moves[0].col-1)] || !!board[cellKey(moves[0].row,moves[0].col+1)]);
  const dr = horizontal ? 0 : 1, dc = horizontal ? 1 : 0;
  const main = readWord(board, moves[0].row, moves[0].col, dr, dc);
  if (!moves.every(move => main.cells.includes(cellKey(move.row,move.col)))) throw new Error('Fill the gaps between your letters.');
  const oldBoard = game.board || {};
  if (!Object.keys(oldBoard).length) {
    if (!added.has('7_7')) throw new Error('Your first word must cross the center star.');
  } else if (!moves.some(({row,col}) => [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].some(([r,c]) => oldBoard[cellKey(r,c)]))) {
    throw new Error('Connect your word to a letter already on the board.');
  }
  const words = new Map();
  const addWord = word => { if (word.cells.length > 1) words.set(word.cells.join('|'), word); };
  addWord(main);
  for (const move of moves) addWord(readWord(board, move.row, move.col, dc, dr));
  if (!words.size) throw new Error('Make a word of at least two letters.');
  for (const { word } of words.values()) if (!dictionary?.has(word)) throw new Error(`“${word}” is not in our English dictionary.`);
  const scored = [...words.values()].map(word => {
    let total = 0, multiplier = 1;
    for (const key of word.cells) {
      const bonus = added.has(key) ? PREMIUMS[key] : '';
      total += tilePoints(board[key]) * (bonus === 'DL' ? 2 : bonus === 'TL' ? 3 : 1);
      multiplier *= bonus === 'DW' ? 2 : bonus === 'TW' ? 3 : 1;
    }
    return { word: word.word, score: total * multiplier };
  });
  const bonus = moves.length === 7 ? 50 : 0;
  return { board, used: [...used], words: scored, bonus, score: scored.reduce((sum,item) => sum + item.score, bonus) };
}

function finishGame(game, finisherId, now) {
  const players = { ...game.players };
  let leftovers = 0;
  for (const [id, player] of Object.entries(players)) {
    const penalty = list(player.rack).reduce((sum,tile) => sum + tilePoints({ ...tile, blank: tile.letter === '?' }),0);
    leftovers += penalty;
    players[id] = { ...player, score: player.score - penalty };
  }
  if (finisherId) players[finisherId] = { ...players[finisherId], score: players[finisherId].score + leftovers };
  return { ...game, players, status:'finished', finishedAt:now, endReason: finisherId ? 'All letters played' : 'Six turns without a word', turn:'' };
}

// All mutations are derived from the committed state, so transaction retries do not spend tiles twice.
export function updateWordGame(game, action, dictionary) {
  const user = action.user;
  if (!user?.id || !action.id || !Number.isFinite(action.now)) throw new Error('Rejoin the room to play.');
  if (action.type === 'start') {
    if (game && game.status !== 'finished') throw new Error('There is already a game. Open it to continue.');
    if ((game?.id || null) !== (action.expectedGameId || null)) throw new Error('The game changed. Open the current game.');
    const bag = makeBag(seededRandom(action.seed));
    const player = { id:user.id, name:user.name || 'Someone', score:0, rack:bag.splice(0,7) };
    const history = { ...game?.history };
    if (game) history[game.id] = { id:game.id, finishedAt:game.finishedAt, players:Object.fromEntries(Object.entries(game.players).map(([id,p]) => [id,{ id, name:p.name, score:p.score }])) };
    return { id:action.id, status:'waiting', players:{ [user.id]:player }, playerOrder:[user.id], bag, board:{}, turn:user.id, starter:action.starter === 'other' ? 'other' : 'me', revision:0, passes:0, createdAt:action.now, moves:{}, history };
  }
  if (!game || game.id !== action.expectedGameId) throw new Error('This game changed. Open it again.');
  // A retry of an already committed command must not apply another turn.
  if (game.moves?.[action.id] || game.finishCommandId === action.id) return game;
  if (action.type === 'join') {
    if (game.players?.[user.id]) return game;
    if (game.status !== 'waiting' || Object.keys(game.players || {}).length !== 1) throw new Error('This game already has two players.');
    const bag = list(game.bag), rack = bag.splice(0,7);
    const players = { ...game.players, [user.id]:{ id:user.id, name:user.name || 'Someone', score:0, rack } };
    return { ...game, bag, players, playerOrder:[...list(game.playerOrder),user.id], status:'playing', turn:game.starter === 'other' || !game.turn ? user.id : game.turn, revision:game.revision+1 };
  }
  if (game.revision !== action.expectedRevision) throw new Error('A move was made while you were playing. Review the board and try again.');
  if (action.type === 'finish') {
    if (!game.players?.[user.id] || !['waiting','playing'].includes(game.status)) throw new Error('Only a player can finish an active game.');
    return { ...game,status:'finished',turn:'',finishedAt:action.now,finishedBy:user.id,finishCommandId:action.id,endReason:`Finished by ${game.players[user.id].name}`,revision:game.revision+1 };
  }
  if (!canPlayWordTurn(game,user.id)) throw new Error('It is not your turn.');
  const players = { ...game.players };
  const player = players[user.id];
  let bag = list(game.bag), board = game.board || {}, rack = list(player.rack), score = 0, words = [], passes = game.passes + 1;
  let placedCells = [];
  if (action.type === 'play') {
    const result = evaluateWordMove(game,user.id,action.placements,dictionary);
    board = result.board; score = result.score; words = result.words; passes = 0;
    placedCells = list(action.placements).map(move => cellKey(move.row,move.col));
    rack = rack.filter(tile => !result.used.includes(tile.id));
    rack.push(...bag.splice(0,7-rack.length));
  } else if (action.type === 'swap') {
    const ids = action.tileIds || [];
    if (bag.length < 7) throw new Error('You need at least seven letters in the bag to swap.');
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !rack.some(tile => tile.id === id))) throw new Error('Select the letters you want to swap.');
    const returned = rack.filter(tile => ids.includes(tile.id));
    rack = [...rack.filter(tile => !ids.includes(tile.id)), ...bag.splice(0,ids.length)];
    bag = shuffleTiles([...bag,...returned],seededRandom(action.seed));
  } else if (action.type !== 'pass') throw new Error('Choose a valid move.');
  players[user.id] = { ...player, rack, score:player.score+score };
  const order = list(game.playerOrder);
  const move = { id:action.id, type:action.type, userId:user.id, name:player.name, words, score, placedCells, at:action.now };
  let next = { ...game, players, bag, board, passes, revision:game.revision+1, turn:order.find(id => id !== user.id) || '', lastMove:move, moves:{ ...game.moves,[action.id]:move } };
  if (!bag.length && !rack.length) next = finishGame(next,user.id,action.now);
  else if (passes >= 6) next = finishGame(next,null,action.now);
  return next;
}
