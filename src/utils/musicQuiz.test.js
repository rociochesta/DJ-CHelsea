import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMusicQuiz, updateMusicQuiz, ROUND_MS, musicQuizPoints, musicQuizCategories, musicQuizSong, finishMusicQuiz } from './musicQuiz.js';

const user = { id: 'a', name: 'Alex' };
const catalog = Array.from({ length: 5 }, (_, i) => ({ artist: `Artist ${i}`, title: `Song ${i}`, audio_url: `https://example.com/${i}.mp3` }));
const invitation = () => ({ id: 'quiz', type: 'music-quiz', inviterId: 'a', responses: { a: 'joined', b: 'joined' }, quiz: createMusicQuiz(catalog) });

test('host finishes any quiz without losing scores; subsequent actions cannot resume it', () => {
  for (const count of [20, 50, 'unlimited']) {
    let current = { ...invitation(), quiz: createMusicQuiz(catalog, Math.random, undefined, count) };
    current = updateMusicQuiz(current, 'quiz', 0, { type: 'start' }, user, 1000);
    current = updateMusicQuiz(current, 'quiz', 0, { type: 'answer', choice: musicQuizSong(current.quiz).answer }, user, 2000);
    const players = [user, { id: 'b', name: 'Bee' }, { id: 'spectator', name: 'Spectator' }];
    assert.equal(finishMusicQuiz(current, 'quiz', players[1], players, 'room-host', 2500), undefined);
    assert.equal(finishMusicQuiz(current, 'stale', user, players, 'room-host', 2500), undefined);
    for (const finisher of [user, { id: 'room-host' }]) {
      const finished = finishMusicQuiz(current, 'quiz', finisher, players, 'room-host', 2500);
      assert.equal(finished.quiz.finished, true);
      assert.equal(finished.quiz.finishedAt, 2500);
      assert.deepEqual(finished.quiz.scores, { a: 5 });
      assert.deepEqual(finished.quiz.finalPlayers, [user, { id: 'b', name: 'Bee' }]);
      assert.equal(musicQuizSong(finished.quiz), undefined);
      for (const action of [{ type: 'answer', choice: 0 }, { type: 'timeout' }, { type: 'start' }]) {
        assert.equal(updateMusicQuiz(finished, 'quiz', 1, action, user, 100000), undefined);
      }
      assert.equal(finishMusicQuiz(finished, 'quiz', user, players, 'room-host'), undefined);
    }
  }
});

test('every real category supports a quiz using its new folder URLs', () => {
  const songs = JSON.parse(readFileSync(new URL('../../public/music-quiz-catalog.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../../scripts/music-quiz-files.json', import.meta.url), 'utf8'));
  assert.equal(songs.length, Object.values(manifest).reduce((count, files) => count + files.length, 0));
  assert.deepEqual(musicQuizCategories(songs), ['00s', '10s', '40s', '50s', '60s', '70s', '80s', '90s']);


  for (const category of musicQuizCategories(songs)) {
    assert.deepEqual(songs.filter(song => song.category === category).map(song => decodeURIComponent(song.audio_url.split('/').pop())).sort(), manifest[category].map(name => name.replace(/ actions$/,'')).sort());
    const quiz = createMusicQuiz(songs, Math.random, [category]);
    assert.equal(quiz.rounds.length, 20);
    assert.ok(quiz.rounds.every(round => round.category === category && round.audioUrl.includes(`/songs/${category}/`)));
  }
});

test('checked categories restrict rounds and answer options', () => {
  const categorized = ['40s', '70s', '90s'].flatMap(category => catalog.map(song => ({
    artist: `${category} ${song.artist}`, title: `${category} ${song.title}`,
    audio_url: `https://example.com/songs/${category}/${song.title}.mp3`,
  })));
  assert.deepEqual(musicQuizCategories(categorized), ['40s', '70s', '90s']);
  for (const selected of [['70s'], ['40s', '90s'], ['40s', '70s', '90s']]) {
    const quiz = createMusicQuiz(categorized, Math.random, selected);
    assert.deepEqual(quiz.categories, [...selected].sort());
    for (const round of quiz.rounds) {
      assert.ok(selected.includes(round.category));
      assert.ok(round.audioUrl.includes(`/songs/${round.category}/`));
      assert.ok(round.choices.every(choice => selected.some(category => choice.startsWith(category))));
    }
  }
  assert.throws(() => createMusicQuiz(categorized, Math.random, []), /at least one category/);
  assert.throws(() => createMusicQuiz(categorized, Math.random, ['80s']), /Select more categories/);
});

test('explicit category is used for custom catalogs', () => {
  const songs = catalog.map(song => ({ ...song, category: 'Rock' }));
  assert.deepEqual(musicQuizCategories(songs), ['Rock']);
  assert.ok(createMusicQuiz(songs, Math.random, ['Rock']).rounds.every(round => round.category === 'Rock'));
});
test('both quiz modes offer unique options containing the right answer', () => {
  for (const value of [0.25, 0.75]) {
    const mode = value < 0.5 ? 'artist' : 'title';
    for (const round of createMusicQuiz(catalog, () => value).rounds) {
      assert.equal(round.mode, mode);
      assert.equal(new Set(round.choices).size, 4);
      assert.equal(round.choices[round.answer], round[mode]);
    }
  }
  assert.throws(() => createMusicQuiz(catalog.slice(0, 3)));
});
test('start, first winner, and next round are guarded against duplicate updates', () => {
  const initial = invitation();
  assert.equal(updateMusicQuiz(initial, 'quiz', 0, { type: 'start' }, { id: 'b' }, 1000), undefined);
  const started = updateMusicQuiz(initial, 'quiz', 0, { type: 'start' }, user, 1000);
  const action = { type: 'answer', choice: started.quiz.rounds[0].answer };
  const won = updateMusicQuiz(started, 'quiz', 0, action, user, 2000);
  assert.equal(won.quiz.scores.a, 5);
  assert.equal(won.quiz.results[0].points, 5);
  assert.equal(updateMusicQuiz(won, 'quiz', 0, action, { id: 'b' }, 2001), undefined);
  assert.equal(won.quiz.round, 1);
  assert.equal(won.quiz.startedAt, 2000);
  assert.equal(updateMusicQuiz(won, 'quiz', 0, { type: 'timeout' }, user, 3000), undefined);
  assert.equal(updateMusicQuiz(won, 'quiz', 0, action, user, 3001), undefined);
  assert.deepEqual(won.quiz.attempts, {});
});

test('20 and 50 questions finish immediately on the final correct answer', () => {
  for (const count of [20, 50]) {
    let current = { ...invitation(), quiz: createMusicQuiz(catalog, Math.random, undefined, count) };
    assert.equal(current.quiz.rounds.length, count);
    current = updateMusicQuiz(current, 'quiz', 0, { type: 'start' }, user, 1000);
    for (let round = 0; round < count; round++) {
      const previous = current;
      current = updateMusicQuiz(current, 'quiz', round, { type: 'answer', choice: musicQuizSong(current.quiz).answer }, user, 2000 + round * 1000);
      assert.equal(current.quiz.round, round + 1);
      assert.equal(current.quiz.scores.a, (round + 1) * 5);
      assert.equal(updateMusicQuiz(current, 'quiz', round, { type: 'answer', choice: musicQuizSong(previous.quiz).answer }, { id: 'b', name: 'Bee' }, 2001 + round * 1000), undefined);
    }
    assert.equal(musicQuizSong(current.quiz), undefined);
    assert.equal(updateMusicQuiz(current, 'quiz', count, { type: 'timeout' }, user, 100000), undefined);
  }
});

test('continuous play keeps scores and accepts fresh attempts across repeated song cycles', () => {
  let current = { ...invitation(), quiz: createMusicQuiz(catalog, Math.random, undefined, 'unlimited') };
  current = updateMusicQuiz(current, 'quiz', 0, { type: 'start' }, user, 1000);
  for (let round = 0; round < 60; round++) {
    const answer = musicQuizSong(current.quiz).answer;
    const missed = updateMusicQuiz(current, 'quiz', round, { type: 'answer', choice: (answer + 1) % 4 }, { id: 'b', name: 'Bee' }, 1500 + round * 1000);
    current = updateMusicQuiz(missed, 'quiz', round, { type: 'answer', choice: answer }, user, 2000 + round * 1000);
    assert.equal(current.quiz.round, round + 1);
    assert.equal(current.quiz.scores.a, (round + 1) * 5);
    assert.ok(musicQuizSong(current.quiz));
    assert.deepEqual(current.quiz.attempts, {});
    assert.deepEqual(current.quiz.results, {});
    assert.equal(updateMusicQuiz(current, 'quiz', 0, { type: 'answer', choice: answer }, user, 2001 + round * 1000), undefined);
  }
});
test('points match displayed seconds: 30–20, 19–10, and 9–1; expiry rejects answers', () => {
  for (const [remaining, expected] of [[30000,5],[20000,5],[19001,5],[19000,3],[10000,3],[9001,3],[9000,1],[1,1],[0,0]]) {
    assert.equal(musicQuizPoints(remaining), expected);
    const started = updateMusicQuiz(invitation(), 'quiz', 0, { type: 'start' }, user, 1000);
    const won = updateMusicQuiz(started, 'quiz', 0, { type: 'answer', choice: started.quiz.rounds[0].answer }, user, 31000 - remaining);
    if (expected) assert.equal(won.quiz.scores.a, expected);
    else assert.equal(won, undefined);
  }
});
test('timeouts advance once for all players without points, including final and continuous questions', () => {
  for (const count of [20, 50, 'unlimited']) {
    let current = { ...invitation(), quiz: createMusicQuiz(catalog, Math.random, undefined, count) };
    current = updateMusicQuiz(current, 'quiz', 0, { type: 'start' }, user, 1000);
    current.quiz.scores = { a: 5 };
    const guest = { id: 'b', name: 'Bee' };
    const length = count === 'unlimited' ? current.quiz.rounds.length + 2 : count;
    for (let round = 0; round < length; round++) {
      const deadline = current.quiz.startedAt + ROUND_MS;
      const song = musicQuizSong(current.quiz);
      assert.equal(updateMusicQuiz(current, 'quiz', round, { type: 'timeout' }, guest, deadline - 1), undefined);
      assert.equal(updateMusicQuiz(current, 'quiz', round, { type: 'timeout' }, { id: 'outsider' }, deadline), undefined);
      const advanced = updateMusicQuiz(current, 'quiz', round, { type: 'timeout' }, guest, deadline);
      assert.equal(advanced.quiz.round, round + 1);
      assert.equal(advanced.quiz.startedAt, deadline);
      assert.deepEqual(advanced.quiz.scores, { a: 5 });
      assert.deepEqual(advanced.quiz.lastTimeout, { round, artist: song.artist, title: song.title });
      assert.equal(updateMusicQuiz(advanced, 'quiz', round, { type: 'timeout' }, user, deadline + 1), undefined);
      assert.equal(updateMusicQuiz(advanced, 'quiz', round, { type: 'answer', choice: song.answer }, user, deadline + 1), undefined);
      current = advanced;
    }
    assert.equal(!!musicQuizSong(current.quiz), count === 'unlimited');
  }
});

test('winning just before expiry rejects a competing timeout from the old round', () => {
  const started = updateMusicQuiz(invitation(), 'quiz', 0, { type: 'start' }, user, 1000);
  const won = updateMusicQuiz(started, 'quiz', 0, { type: 'answer', choice: musicQuizSong(started.quiz).answer }, user, 30999);
  assert.equal(won.quiz.scores.a, 1);
  assert.equal(won.quiz.round, 1);
  assert.equal(updateMusicQuiz(won, 'quiz', 0, { type: 'timeout' }, { id: 'b' }, 31000), undefined);
});

test('one attempt per person and no answers after the deadline', () => {
  const started = updateMusicQuiz(invitation(), 'quiz', 0, { type: 'start' }, user, 1000);
  const correct = started.quiz.rounds[0].answer;
  const missed = updateMusicQuiz(started, 'quiz', 0, { type: 'answer', choice: (correct + 1) % 4 }, user, 2000);
  assert.equal(updateMusicQuiz(missed, 'quiz', 0, { type: 'answer', choice: correct }, user, 2001), undefined);
  assert.equal(updateMusicQuiz(started, 'quiz', 0, { type: 'answer', choice: correct }, user, 1000 + ROUND_MS), undefined);
  assert.equal(updateMusicQuiz(started, 'quiz', 0, { type: 'timeout' }, user, 2000), undefined);
  assert.equal(updateMusicQuiz(started, 'quiz', 0, { type: 'timeout' }, user, 1000 + ROUND_MS).quiz.round, 1);
});
