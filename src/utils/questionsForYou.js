export function pendingQuestions(inbox, userId) {
  return Object.values(inbox || {}).filter(item => item.recipientId === userId && !item.answer).sort((a, b) => a.createdAt - b.createdAt);
}

export function answerQuestion(question, user, blocks, now) {
  if (!question || question.answer || question.recipientId !== user?.id || !blocks?.length) return;
  return { ...question, answer: { userId: user.id, name: user.name, blocks, answeredAt: now } };
}
