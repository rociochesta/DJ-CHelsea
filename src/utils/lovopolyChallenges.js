const playful = [
  ['Three irresistible things','Tell your person three little things you find irresistible about them.'],
  ['Our tiny adventure','Describe a playful mini-adventure you would love to share together.'],
  ['The smile effect','Tell them about a moment when their smile changed your day.'],
  ['A stolen kiss','Describe how you would steal a kiss if they were beside you and wanted one too.'],
  ['Flirty weather report','Write a silly weather forecast for your next date, with a chance of kisses.'],
  ['Your personal theme song','Choose a song that reminds you of them and explain your favorite connection.'],
  ['A very serious award','Invent a funny award for your person and write a tiny acceptance speech for them.'],
  ['Meet-cute, take two','Reimagine your first meeting as a sweet romantic-comedy scene.'],
  ['A pocket-sized love note','Write a love note short enough to hide in their pocket.'],
  ['Dream breakfast','Describe the breakfast you would make for them and the note you would leave.'],
  ['Only we understand','Share an inside joke or a funny memory that belongs to the two of you.'],
  ['The compliment remix','Compliment them without using the words beautiful, cute, or amazing.'],
  ['Our next date title','Give your next imaginary date a movie title and a playful one-sentence plot.'],
  ['A little happy memory','Describe one memory together you would happily relive.'],
  ['A text from the future','Write a sweet message from your imagined next holiday together.'],
  ['Five-word flirting','Write three flirty messages of exactly five words each.'],
  ['You make ordinary special','Tell them about an ordinary activity that would be better with them.'],
  ['The perfect hug','Describe the hug you would send them across the distance.'],
  ['A playful invitation','Invite them on an imaginary date using your most charmingly ridiculous line.'],
  ['One thing I notice','Share a small detail about them you notice and appreciate.'],
];
const spicy = [
  ['Where the next kiss lands','Tell them where you would like your next kiss to happen, and why.'],
  ['Closer, if you want','Describe a moment when you would like to pull them a little closer, if they want it too.'],
  ['A whispered confession','Write one bolder, flirty thought you would whisper in their ear.'],
  ['The slow kiss','Describe an imaginary slow kiss, focusing on the anticipation and how you would feel.'],
  ['A look across the room','Describe the look you would give them across a room when you want a private moment together.'],
  ['Our private date','Imagine an intimate date for just the two of you: setting, mood, and one wish.'],
  ['The butterflies confession','Tell them something they do that gives you butterflies in a deliciously distracting way.'],
  ['A daring invitation','Write a teasing invitation for a romantic moment they are completely free to accept or decline.'],
  ['Almost a kiss','Describe the moment just before a kiss, when you both know what you want.'],
  ['Your kind of chemistry','Share what makes the chemistry between you feel special, and a romantic moment you would like to explore together.'],
];
export const ESCAPE_CHALLENGES = [
  ...playful.map(([title,text],i)=>({id:`escape-b-${i+1}`,tone:'B',title,text})),
  ...spicy.map(([title,text],i)=>({id:`escape-c-${i+1}`,tone:'C',title,text})),
];
export const escapeChallenge = id => ESCAPE_CHALLENGES.find(c=>c.id===id);

function shuffle(values,seed) {
  let state=2166136261;
  for(const ch of seed)state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;
  const result=[...values];
  for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function challengeProgress(game,playerId) {
  game.escapeProgress ||= {};
  game.escapeProgress[playerId] ||= {cycle:1,completed:{}};
  const progress=game.escapeProgress[playerId];progress.completed ||= {};
  return progress;
}
export function prepareEscapeChoices(game,player) {
  if(player.detentionChoices?.length===3)return player.detentionChoices;
  const progress=challengeProgress(game,player.id);
  if(ESCAPE_CHALLENGES.every(c=>progress.completed[c.id])){progress.cycle++;progress.completed={};}
  player.detentionId ||= `${game.id}:legacy:${player.id}`;
  const shuffled=shuffle(ESCAPE_CHALLENGES.map(c=>c.id),`${game.id}:${player.id}:${player.detentionId}:${progress.cycle}`);
  player.detentionChoices=[...shuffled.filter(id=>!progress.completed[id]),...shuffled.filter(id=>progress.completed[id])].slice(0,3);
  player.detentionChoiceCycle=progress.cycle;
  return player.detentionChoices;
}
export function recordChallengeCompletion(game,item) {
  if(!escapeChallenge(item.challengeId))return;
  const progress=challengeProgress(game,item.from);
  // A late confirmation from a previous cycle stays in History but cannot
  // consume a challenge in a new cycle.
  if(item.challengeCycle===progress.cycle)progress.completed[item.challengeId]=true;
}
