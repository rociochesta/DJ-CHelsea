export const ROUND_MS = 30000;

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function loadMusicQuizCatalog() {
  const url = import.meta.env.VITE_MUSIC_QUIZ_CATALOG_URL || `${import.meta.env.BASE_URL}music-quiz-catalog.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load the song catalog. Check its public URL and try again.');
  const data = await response.json();
  return Array.isArray(data) ? data : data.songs;
}

export function musicQuizCategory(song) {
  if (typeof song.category === 'string' && song.category.trim()) return song.category.trim();
  const match = song.audio_url?.match(/\/songs\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : 'Other';
}

export function musicQuizCategories(catalog) {
  return [...new Set((Array.isArray(catalog) ? catalog : []).map(musicQuizCategory))].sort();
}

export function createMusicQuiz(catalog, random = Math.random, selectedCategories, questionCount = 20) {
  if (![20, 50, 'unlimited'].includes(questionCount)) throw new Error('Choose 20, 50, or continuous questions.');
  if (selectedCategories && !selectedCategories.length) throw new Error('Select at least one category to play.');
  const songs = (Array.isArray(catalog) ? catalog : []).filter(song =>
    (!selectedCategories || selectedCategories.includes(musicQuizCategory(song))) &&
    typeof song.artist === 'string' && song.artist.trim() && typeof song.title === 'string' && song.title.trim() &&
    typeof song.audio_url === 'string' && /^https:\/\//.test(song.audio_url)
  ).map(song => ({ artist: song.artist.trim(), title: song.title.trim(), audioUrl: song.audio_url, category: musicQuizCategory(song) }));
  const options = Object.fromEntries(['artist', 'title'].map(mode => [mode, [...new Set(songs.map(song => song[mode]))]]));
  if (options.artist.length < 4 || options.title.length < 4) throw new Error('Select more categories: the quiz needs at least four different artists and song titles with public MP3 URLs.');
  const picked = [];
  const count = questionCount === 'unlimited' ? songs.length : questionCount;
  while (picked.length < count) picked.push(...shuffle(songs, random).slice(0, count - picked.length));
  const rounds = picked.map(song => {
    const mode = random() < 0.5 ? 'artist' : 'title';
    const labels = options[mode];
    const choices = shuffle([song[mode], ...shuffle(labels.filter(label => label !== song[mode]), random).slice(0, 3)], random);
    return { mode, audioUrl: song.audioUrl, choices, answer: choices.indexOf(song[mode]), artist: song.artist, title: song.title, category: song.category };
  });
  return { rounds, questionCount, categories: [...new Set(songs.map(song => song.category))].sort(), round: 0, startedAt: 0, scores: {}, attempts: {}, results: {} };
}

export function musicQuizSong(quiz) {
  if (quiz.finished) return;
  return quiz.rounds[quiz.questionCount === 'unlimited' ? quiz.round % quiz.rounds.length : quiz.round];
}

export function finishMusicQuiz(current, sessionId, user, players, roomHostId, now = Date.now()) {
  if (current?.id !== sessionId || current.type !== 'music-quiz' || !current.quiz || current.quiz.finished) return;
  if (user.id !== current.inviterId && user.id !== roomHostId) return;
  return { ...current, quiz: { ...current.quiz, finished: true, finishedAt: now,
    finalPlayers: players.filter(player => current.responses?.[player.id] === 'joined' || current.quiz.scores?.[player.id] !== undefined)
      .map(player => ({ id: player.id, name: player.name })),
  } };
}

function advanceMusicQuiz(quiz, now) {
  return { ...quiz, round: quiz.round + 1, startedAt: now, attempts: {},
    ...(quiz.questionCount === 'unlimited' ? { results: {} } : {}) };
}

export function musicQuizPoints(remainingMs) {
  if (remainingMs <= 0 || remainingMs > ROUND_MS) return 0;
  const seconds = Math.ceil(remainingMs / 1000);
  return seconds >= 20 ? 5 : seconds >= 10 ? 3 : 1;
}

export function updateMusicQuiz(current, sessionId, round, action, user, now = Date.now()) {
  if (current?.id !== sessionId || current.type !== 'music-quiz' || current.responses?.[user.id] !== 'joined') return;
  const quiz = current.quiz;
  if (!quiz || quiz.round !== round || !musicQuizSong(quiz)) return;
  const song = musicQuizSong(quiz);
  const host = current.inviterId === user.id;
  if (action.type === 'start') {
    if (!host || quiz.startedAt) return;
    return { ...current, quiz: { ...quiz, startedAt: now } };
  }
  if (!quiz.startedAt) return;
  const expired = now >= quiz.startedAt + ROUND_MS;
  if (action.type === 'timeout') {
    if (!expired) return;
    return { ...current, quiz: advanceMusicQuiz({ ...quiz,
      lastTimeout: { round, artist: song.artist, title: song.title },
    }, now) };
  }
  const choice = action.choice;
  if (action.type !== 'answer' || expired || quiz.results?.[round] || !Number.isInteger(choice) || choice < 0 || choice >= song.choices.length || quiz.attempts?.[round]?.[user.id] !== undefined) return;
  const correct = choice === song.answer;
  const points = musicQuizPoints(quiz.startedAt + ROUND_MS - now);
  if (correct) {
    const winner = { name: user.name, id: user.id, points, artist: song.artist, title: song.title, round };
    return { ...current, quiz: advanceMusicQuiz({ ...quiz,
      scores: { ...quiz.scores, [user.id]: (quiz.scores?.[user.id] || 0) + points },
      results: { ...quiz.results, [round]: winner }, lastWinner: winner,
    }, now) };
  }
  return { ...current, quiz: { ...quiz,
    attempts: { ...quiz.attempts, [round]: { ...quiz.attempts?.[round], [user.id]: choice } },
  } };
}
