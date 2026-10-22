const money = (prefix, rows) => rows.map(([title, amount], i) => ({ id:`${prefix}-money-${i}`, category:'financial', title, effect:'cash', amount, text:amount > 0 ? `Collect $${amount} from the bank.` : `Pay $${-amount} to the bank.` }));
const romance = (prefix, rows) => rows.map(([title,text],i) => ({id:`${prefix}-romance-${i}`,category:'romantic',title,text,effect:'romance'}));
const keep = prefix => ({id:`${prefix}-escape`,category:prefix === 'chance' ? 'mischief' : 'financial',title:'A kiss and a key',text:'Keep this Get Out of Kiss Detention Free card. You may trade it or use it before rolling.',effect:'keep'});
export const CARD_DECKS = {
  chance:[
    ...money('chance', [['Surprise bonus',100],['Lost luggage',-50],['Date-night refund',50],['Phone repair',-100],['Lucky ticket',150],['Missed connection',-75],['Found in your pocket',25],['Spilled coffee',-25],['Creative spark',200],['Impulse shopping',-100],['Travel voucher',75],['Extra baggage',-50],['Good karma',50],['Broken headphones',-150],['A little windfall',100]]),
    ...[
      ['Meet me at the start',0],['Fly to Santiago',5],['Lake-side detour',9],['Sushi date',13],['A midnight invitation',18],['Love takes flight',25],['All yours tonight',37],
    ].map(([title,destination],i)=>({id:`chance-move-${i}`,category:'mischief',title,effect:'move',destination,text:`Advance to space ${destination}. Collect $200 if you pass or reach Hello, Beautiful. Resolve the destination normally.`})),
    {id:'chance-back',category:'mischief',title:'Three steps back',effect:'back',text:'Move back three spaces. Do not collect GO money. Resolve the destination normally.'},
    {id:'chance-detain',category:'mischief',title:'Caught being cute',effect:'detain',text:'Go directly to Kiss Detention. Do not collect GO money.'}, keep('chance'),
    ...romance('chance', [['A daring compliment','Tell your person one thing about them you find irresistible.'],['Our imaginary escape','Invent a playful getaway for the two of you.'],['Flirty soundtrack','Share a song that makes you think of your person.'],['A tiny confession','Share a sweet or flirty thought, only if you feel like it.'],['Your choice of kiss','Describe the kiss you would send across the distance.']]),
  ],
  community:[
    ...money('community',[['A little thank-you',100],['Birthday envelope',200],['Coffee money',25],['Unexpected refund',50],['Rainy-day repair',-50],['Savings interest',25],['A good week',100],['Shared memories print',-25],['Travel fund boost',150],['Appointment fee',-100],['Lucky discovery',50],['Home comforts',-75],['Kindness returned',75],['Celebration fund',100]]), keep('community'),
    ...[['Coffee on me',25],['Flowers from afar',50],['Lunch surprise',75],['A little treat',25],['Date-night envelope',100],['Playlist prize',50],['Travel wishes',150],['Something cozy',75],['Just because',50],['A generous surprise',100]].map(([title,amount],i)=>({id:`community-gift-${i}`,category:'gift',title,effect:'gift',amount,text:`The bank gives your person $${amount}. Your cash does not change.`})),
    ...romance('community',[['One lovely memory','Tell your person about a memory of the two of you that makes you smile.'],['A note for later','Send your person a kind message they can read whenever they want.'],['Something I appreciate','Name one small thing your person does that you appreciate.'],['Our next little date','Suggest a simple date you would enjoy together.'],['A warm goodnight','Send a sweet goodnight wish, whenever the time feels right.']]),
  ],
};
export const cardById = id => Object.values(CARD_DECKS).flat().find(c=>c.id===id);

// Stable Fisher–Yates permutation seeded by the match UUID and cycle. Transaction
// retries never consume randomness or change the draw. Decks persist in Firebase.
function shuffle(ids, seed) {
  let state=2166136261;
  for (const ch of seed) state=Math.imul(state ^ ch.charCodeAt(0),16777619)>>>0;
  const result=[...ids];
  for(let i=result.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function ensureDecks(game) {
  game.decks ||= {};
  for(const name of Object.keys(CARD_DECKS)) game.decks[name] ||= {cycle:0,remaining:shuffle(CARD_DECKS[name].map(c=>c.id),`${game.id}:${name}:0`),held:{}};
}
export function drawCard(game,name,playerId) {
  ensureDecks(game);
  const deck=game.decks[name]; deck.remaining ||= []; deck.held ||= {};
  if(!deck.remaining.length){deck.cycle++;deck.remaining=shuffle(CARD_DECKS[name].filter(c=>!deck.held[c.id]).map(c=>c.id),`${game.id}:${name}:${deck.cycle}`);}
  const card=cardById(deck.remaining.shift());
  if(card.effect==='keep') deck.held[card.id]=playerId;
  return card;
}
export function transferHeldCards(game,from,to,count) {
  // Legacy saves may have anonymous cards; preserve their numeric balances.
  for(const deck of Object.values(game.decks || {})) for(const [id,owner] of Object.entries(deck.held || {})) {
    if(count>0 && owner===from){deck.held[id]=to;count--;}
  }
}
export function returnHeldCard(game,playerId) {
  for(const deck of Object.values(game.decks || {})) for(const [id,owner] of Object.entries(deck.held || {})) {
    if(owner===playerId){delete deck.held[id];deck.remaining ||= [];deck.remaining.push(id);return;}
  }
}
