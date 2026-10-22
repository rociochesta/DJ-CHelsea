import { LOVOPOLY_TILES as tiles } from './lovopolyBoard.js';
import { drawCard } from './lovopolyCards.js';
import { enterDetention } from './lovopolyRomance.js';
import { prepareEscapeChoices } from './lovopolyChallenges.js';

export function propertyRent(game,tile,diceTotal) {
  const owner=game.owners?.[tile.id];
  if(!owner || game.mortgages?.[tile.id]) return 0;
  if(tile.type==='station') return 25*2**(tiles.filter(t=>t.type==='station' && game.owners[t.id]===owner).length-1);
  if(tile.type==='utility') return diceTotal*(tiles.filter(t=>t.type==='utility' && game.owners[t.id]===owner).length===2?10:4);
  const level=game.buildings?.[tile.id]||0;
  return level ? tile.rents[level] : tile.rent*(tile.group && tiles.filter(t=>t.group===tile.group).every(t=>game.owners[t.id]===owner)?2:1);
}
export function resolveLanding(game,action,total) {
  const player=game.players[action.user.id], other=Object.values(game.players).find(p=>p.id!==player.id);
  const messages=[], visits=[], cards=[];
  const pay=(amount,creditorId=null)=>{
    if(player.cash<amount) game.debt={playerId:player.id,amount,creditorId};
    else {player.cash-=amount;if(creditorId) game.players[creditorId].cash+=amount;}
  };
  function visit(depth=0) {
    if(depth>4) throw new Error('Unexpected movement-card loop.');
    const tile=tiles[player.position],owner=game.owners?.[tile.id]||null;
    const rent=tile.price ? propertyRent(game,tile,total):0;
    visits.push({tileId:tile.id,ownerId:owner,rent,mortgaged:!!game.mortgages?.[tile.id]});
    messages.push(`Landed on ${tile.name}.`);
    if(tile.price && !owner) game.phase='purchase';
    if(owner && owner!==player.id && !game.mortgages?.[tile.id]) {
      pay(rent,owner);
      game.lastRent={id:action.id,tileId:tile.id,payerId:player.id,ownerId:owner,amount:rent,status:game.debt?'owed':'paid'};
      messages.push(game.debt ? `Rent owed: ${player.name} owes $${rent} to ${game.players[owner].name}. Resolve the debt before continuing.` : `Rent paid: ${player.name} paid $${rent} to ${game.players[owner].name}.`);
    }
    if(tile.type==='tax'){const amount=tile.id===4?200:100;pay(amount);messages.push(`Tax: $${amount}.`);}
    if(tile.type==='go-to-detention'){enterDetention(player,action.id);game.extraRoll=false;messages.push('Go to Kiss Detention.');}
    if(!['chance','community'].includes(tile.type)) return;
    const card=drawCard(game,tile.type,player.id);
    cards.push({...card,deck:tile.type});messages.push(`${card.title}: ${card.text}`);
    if(card.effect==='cash'){if(card.amount>0) player.cash+=card.amount;else pay(-card.amount);}
    if(card.effect==='gift') other.cash+=card.amount;
    if(card.effect==='keep') player.detentionCards=(player.detentionCards||0)+1;
    if(card.effect==='romance') {
      game.romanticInbox ||= {};
      const id=`${action.id}-${cards.length}`;
      game.romanticInbox[id]={id,cardId:card.id,from:player.id,to:other.id,title:card.title,text:card.text,status:'pending',at:action.now};
      messages.push('Optional invitation saved to the Romantic Inbox. No money or turn effects.');
    }
    if(card.effect==='detain'){enterDetention(player,action.id);game.extraRoll=false;}
    if(card.effect==='move' || card.effect==='back') {
      if(card.effect==='move'){if(card.destination<player.position){player.cash+=200;messages.push('Collected $200 for passing Hello, Beautiful.');}player.position=card.destination;}
      else player.position=(player.position+37)%40;
      visit(depth+1);
    }
  }
  visit();
  if(player.detained)prepareEscapeChoices(game,player);
  game.lastLanding={id:action.id,playerId:player.id,at:action.now,visits,cards,message:messages.join(' ')};
  return game.lastLanding.message;
}
