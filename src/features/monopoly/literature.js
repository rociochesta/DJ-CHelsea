import questions from './data/literature-questions.json' with { type: 'json' };
import { shuffled } from './catalog.js';
export { questions };

// Sample outside transactions, exactly 30 of 100 equally likely outcomes trigger.
export function sampleLiteratureRoll(random=globalThis.crypto) {
  let value;
  do { value=random.getRandomValues(new Uint8Array(1))[0]; } while(value>=200);
  return value%100;
}
export const pendingChallenge = game => ['offered','accepted'].includes(game?.literatureChallenge?.status);
export function purchasePrice(game,tile) {
  const quote=game?.purchaseQuote;
  return quote?.landingId===game?.lastLanding?.id&&quote?.tileId===tile.id&&quote.playerId===game.turn?quote.amount:tile.price;
}
function personalDeck(game,playerId) {
  game.literatureDecks||={};
  let deck=game.literatureDecks[playerId];
  if(!deck||!(deck.remaining||[]).length){
    const cycle=(deck?.cycle||0)+1;
    deck={cycle,remaining:shuffled(questions.map(q=>q.id),`${game.id}:${playerId}:literature:${cycle}`),used:[]};
    game.literatureDecks[playerId]=deck;
  }
  deck.used||=[];
  return deck;
}
export function offerLiterature(game,player,tile,ownerId,rent) {
  if(!tile.price||game.lastLanding.triviaRoll>=30)return false;
  const deck=personalDeck(game,player.id);
  const kind=!ownerId?'purchase':ownerId===player.id?'own':'rent';
  const baseAmount=kind==='purchase'?tile.price:kind==='rent'?rent:0;
  const discount=tile.type==='property'?(kind==='purchase'?20:30):25;
  game.literatureChallenge={
    id:game.lastLanding.id,playerId:player.id,tileId:tile.id,ownerId:ownerId||null,
    questionId:deck.remaining[0],status:'offered',kind,baseAmount,
    correctAmount:kind==='own'?-50:Math.ceil(baseAmount*(100-discount)/100),
    incorrectAmount:kind==='own'?50:Math.ceil(baseAmount*110/100),
    skipAmount:baseAmount,discount,
  };
  game.phase='challenge';
  const visit=game.lastLanding.visits.at(-1);
  visit.message=kind==='purchase'?`Purchase price: $${baseAmount}. Optional literature challenge available.`:kind==='rent'?`Rent due: $${baseAmount}. Choose the optional challenge before payment.`:'Your property. Optional literature challenge: win $50 or risk $50.';
  return true;
}
export function resolveLiterature(game,action,pay) {
  const c=game.literatureChallenge;
  if(!pendingChallenge(game)||game.phase!=='challenge'||c.playerId!==action.user.id||c.id!==action.challengeId||c.id!==game.lastLanding?.id)throw new Error('This challenge is no longer available.');
  if(action.type==='literature-accept'){
    if(c.status!=='offered')throw new Error('The challenge was already accepted.');
    c.status='accepted';return;
  }
  const question=questions.find(q=>q.id===c.questionId);
  const deck=game.literatureDecks[c.playerId];
  const skipped=action.type==='literature-skip';
  if(!skipped&&(c.status!=='accepted'||!Number.isInteger(action.answerIndex)||action.answerIndex<0||action.answerIndex>=question.options.length))throw new Error('Accept the challenge and choose one answer.');
  deck.remaining=(deck.remaining||[]).filter(id=>id!==c.questionId);
  if(skipped)deck.remaining.push(c.questionId);
  else {deck.used||=[];deck.used.push(c.questionId);}
  c.status=skipped?'skipped':action.answerIndex===question.answerIndex?'correct':'incorrect';
  if(!skipped)c.answerIndex=action.answerIndex;
  c.amount=skipped?c.skipAmount:c.status==='correct'?c.correctAmount:c.incorrectAmount;
  game.phase=c.kind==='purchase'?'purchase':'end';
  const player=game.players[c.playerId];
  if(c.kind==='purchase')game.purchaseQuote={landingId:c.id,playerId:c.playerId,tileId:c.tileId,amount:c.amount};
  else if(c.amount<0)player.cash-=c.amount;
  else if(c.amount>0)pay(game,player,c.amount,c.kind==='rent'?c.ownerId:null);
  const visit=game.lastLanding.visits.at(-1);
  visit.message=c.kind==='purchase'?`Purchase price: $${c.amount} (${c.status}).`:c.amount<0?`Received $${-c.amount} from the bank.`:`${game.debt?'Owes':'Paid'} $${c.amount} (${c.status}).`;
  if(c.kind==='rent')visit.rent=c.amount;
  game.message=visit.message;
}
