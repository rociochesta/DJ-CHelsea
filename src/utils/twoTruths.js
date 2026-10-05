export function makeEntry(values, random = Math.random, revision = crypto.randomUUID()) {
  const cards = values.map((text, index) => ({ id: crypto.randomUUID(), text: text.trim(), isLie: index === 2 }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { revision, statements: cards.map(({ id, text }) => ({ id, text })), lieId: cards.find((card) => card.isLie).id };
}

export function recordGuess(session, targetId, revision, user, choiceId, now = Date.now()) {
  const entry = session?.statements?.[targetId];
  if (!entry || targetId === user.id || entry.revision !== revision || !entry.statements.some((card) => card.id === choiceId)) return;
  if (session.guesses?.[revision]?.[user.id]) return;
  const correct = entry.lieId === choiceId;
  return { ...session, guesses: { ...session.guesses, [revision]: { ...session.guesses?.[revision], [user.id]: {
    choiceId, correct, playerName: user.name, targetId, at: now,
  } } } };
}

export function getScores(guesses = {}) {
  const scores = {};
  Object.values(guesses).forEach((round) => Object.entries(round).forEach(([id, guess]) => {
    if (guess.correct) scores[id] = (scores[id] || 0) + 1;
  }));
  return scores;
}
