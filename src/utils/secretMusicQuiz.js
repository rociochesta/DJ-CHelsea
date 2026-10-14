import { ROUND_MS, musicQuizPoints } from './musicQuiz.js';

export function updateSecretMusicQuiz(game, action) {
  const { user, now, type } = action;
  if (!game || game.id !== action.gameId || !user?.id) return;
  const players = game.players || {};
  let player = players[user.id];
  if (type === 'join') {
    if (player || Object.keys(players).length >= 2 || !players[game.creatorId]?.finished) return;
    return { ...game, players: { ...players, [user.id]: { id: user.id, name: user.name || 'Someone', round: 0, score: 0, startedAt: 0 } } };
  }
  if (!player || player.finished || player.round !== action.round) return;
  const song = game.rounds[player.round];
  if (!song) return;
  if (type === 'start') {
    if (player.startedAt || now < (player.nextAt || 0)) return;
    player = { ...player, startedAt: now };
  } else {
    if (!player.startedAt) return;
    const remaining = player.startedAt + ROUND_MS - now;
    if (type === 'timeout') { if (remaining > 0) return; }
    else if (type === 'skip') { if (remaining <= 0) return; }
    else if (type !== 'answer' || remaining <= 0 || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= song.choices.length) return;
    const points = type === 'answer' && action.choice === song.answer ? musicQuizPoints(remaining) : 0;
    const round = player.round + 1;
    player = { ...player, round, score: player.score + points, startedAt: 0, nextAt: now + 2000,
      results: { ...(player.results || {}), [player.round]: { points, choice: type === 'answer' ? action.choice : -1 } },
      ...(round === game.rounds.length ? { finished: true, finishedAt: now } : {}) };
  }
  return { ...game, players: { ...players, [user.id]: player } };
}

export function secretMusicQuizResult(game) {
  const players = Object.values(game?.players || {});
  if (players.length !== 2 || !players.every(player => player.finished)) return null;
  return players[0].score === players[1].score ? { tie: true } : { winner: players.reduce((a, b) => a.score > b.score ? a : b) };
}
