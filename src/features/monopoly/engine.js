import { offerLiterature, resolveLiterature, pendingChallenge, purchasePrice } from './literature.js';
import { tiles, tokens, decks, shuffled } from './catalog.js';
import { propertyRent } from '../../utils/lovopolyLanding.js';
import { economyAction, liquidationValue, netWorth } from '../../utils/lovopolyEconomy.js';
export { rollLovopolyDice as rollDice } from '../../utils/lovopoly.js';
const active = g => g.order.filter(id => !g.players[id].eliminated);
function advance(g) {
  const ids=active(g);
  if(ids.length===1){g.status='finished';g.winner=ids[0];return;}
  if(ids.every(id=>g.roundTurns?.[id])){
    g.completedRounds=(g.completedRounds||0)+1;g.roundTurns={};
    if(g.mode==='quick'&&g.completedRounds>=g.roundLimit){
      const ranked=[...ids].sort((a,b)=>netWorth(g,b)-netWorth(g,a));
      g.status='finished';g.winner=netWorth(g,ranked[0])===netWorth(g,ranked[1])?'tie':ranked[0];return;
    }
  }
  const index=g.order.indexOf(g.turn);
  g.turn=Array.from({length:g.order.length},(_,i)=>g.order[(index+i+1)%g.order.length]).find(id=>!g.players[id].eliminated);
  g.phase='roll';g.doubles=0;g.extraRoll=false;
}
function pay(g,p,amount,creditorId=null){
  if(p.cash<amount)g.debt={playerId:p.id,amount,creditorId};
  else {p.cash-=amount;if(creditorId)g.players[creditorId].cash+=amount;}
}
function detain(g,p){p.position=10;p.detained=true;p.attempts=0;g.extraRoll=false;}
function beginLanding(g,p,a) {
  const triviaRoll=a.triviaRoll??99;
  if(!Number.isInteger(triviaRoll)||triviaRoll<0||triviaRoll>=100)throw new Error('Invalid literature chance roll.');
  g.lastLanding={id:a.id,playerId:p.id,at:a.now,triviaRoll,visits:[],cards:[]};
  g.literatureChallenge=null;g.purchaseQuote=null;
}
function recordVisit(g,p,tile,total) {
  const owner=g.owners[tile.id]||null;
  const rent=owner&&owner!==p.id?propertyRent(g,tile,total):0;
  const tax=tile.type==='tax'?(tile.id===4?200:100):0;
  const message=rent?`${p.name} ${p.cash<rent?'owes':'paid'} $${rent} rent to ${g.players[owner].name}.`:tax?`${p.name} ${p.cash<tax?'owes':'paid'} $${tax} to the bank.`:`${p.name} landed on ${tile.name}.`;
  g.lastLanding.visits.push({tileId:tile.id,ownerId:owner,rent,message});
}
function landing(g,p,total,depth=0){
  if(depth>4)throw new Error('Card movement loop.');
  const tile=tiles[p.position],owner=g.owners[tile.id];
  recordVisit(g,p,tile,total);
  g.message=`${p.name}: ${tile.name}.`;
  if(offerLiterature(g,p,tile,owner,owner&&owner!==p.id?propertyRent(g,tile,total):0))return;
  if(tile.price&&!owner)g.phase='purchase';
  if(owner&&owner!==p.id)pay(g,p,propertyRent(g,tile,total),owner);
  if(tile.type==='tax')pay(g,p,tile.id===4?200:100);
  if(tile.type==='go-to-detention'){detain(g,p);recordVisit(g,p,tiles[10],total);}
  if(!decks[tile.type])return;
  const deck=g.decks[tile.type],cardId=deck.shift();deck.push(cardId);
  const card=decks[tile.type].find(c=>c.id===cardId);g.lastCard={...card,deck:tile.type};
  g.lastLanding.cards.push({...g.lastCard,visitIndex:g.lastLanding.visits.length-1});
  if(card.effect==='cash'){if(card.amount>=0)p.cash+=card.amount;else pay(g,p,-card.amount);}
  if(card.effect==='detain'){detain(g,p);recordVisit(g,p,tiles[10],total);}
  if(card.effect==='move'){if(card.destination<p.position)p.cash+=200;p.position=card.destination;landing(g,p,total,depth+1);}
  if(card.effect==='nearest'){
    const destination=Array.from({length:40},(_,i)=>(p.position+i+1)%40).find(id=>tiles[id].type===card.target);
    if(destination===undefined)throw new Error('No matching destination for card.');
    if(destination<p.position)p.cash+=200;
    p.position=destination;landing(g,p,total,depth+1);
  }
  if(card.effect==='other-utility'){
    // Choose the second utility encountered moving forward, skipping the nearest.
    const utilities=Array.from({length:40},(_,i)=>(p.position+i+1)%40).filter(id=>tiles[id].type==='utility');
    const destination=utilities[1];
    if(destination===undefined)throw new Error('Two utilities are required for this card.');
    if(destination<p.position)p.cash+=200;
    p.position=destination;landing(g,p,total,depth+1);
  }
  if(card.effect==='back'){
    p.position=((p.position-card.spaces)%40+40)%40;
    landing(g,p,total,depth+1);
  }
}
export function updateMonopoly(game,a){
  if(!a.user?.id||!a.id||!Number.isFinite(a.now))throw new Error('Join the room first.');
  if(game?.lastCommandId===a.id)return game;
  if((game?.id||null)!==a.expectedGameId||(game&&game.revision!==a.expectedRevision))throw new Error('The game changed. Please try again.');
  if(a.type==='create'){
    if(game&&game.status!=='finished')throw new Error('A match already exists.');
    return {id:a.id,theme:'na',boardLayout:{version:1,slots:Object.fromEntries(tiles.map(t=>[t.id,{id:`na-${t.id}`,name:t.name,category:t.group||t.type,description:'',image:''}]))},revision:0,lastCommandId:a.id,status:'setup',creatorId:a.user.id,players:{[a.user.id]:{id:a.user.id,name:String(a.user.name||'Player').slice(0,80),token:tokens[0].id,cash:1500,position:0}},order:[a.user.id],owners:{},decks:Object.fromEntries(Object.entries(decks).map(([key,cards])=>[key,shuffled(cards.map(c=>c.id),a.id+key)])),events:{},mode:a.mode==='quick'?'quick':'classic',roundLimit:20,completedTurns:0};
  }
  if(!game||game.status==='finished')throw new Error('Start a new match.');
  const g=structuredClone(game);g.owners||={};g.events||={};
  let p=g.players[a.user.id];
  if(a.type==='join'){
    if(g.status!=='setup'||p||g.order.length>=8)throw new Error('The lobby is full or already started.');
    const token=tokens.find(t=>!Object.values(g.players).some(p=>p.token===t.id));
    g.players[a.user.id]={id:a.user.id,name:String(a.user.name||'Player').slice(0,80),token:token.id,cash:1500,position:0};g.order.push(a.user.id);
  }else{
    if(!p||p.eliminated)throw new Error('Join this match first.');
    if(a.type==='start'){
      if(g.status!=='setup'||a.user.id!==g.creatorId||g.order.length<2)throw new Error('The creator can start with 2–8 players.');
      g.order=shuffled(g.order,g.id);g.turn=g.order[0];g.status='playing';g.phase='roll';
    }else if(a.type==='leave-lobby'){
      if(g.status!=='setup')throw new Error('The match has started.');
      delete g.players[p.id];g.order=g.order.filter(id=>id!==p.id);
      if(!g.order.length)return null;
      if(g.creatorId===p.id)g.creatorId=g.order[0];
    }else{
      if(g.status!=='playing'||g.turn!==p.id)throw new Error('Wait for your turn.');
      const management=['mortgage','unmortgage','build','sell-building','settle-debt'];
      if(pendingChallenge(g)&&!['literature-accept','literature-answer','literature-skip','surrender'].includes(a.type))throw new Error('Answer or skip the literature challenge first.');
      if(['literature-accept','literature-answer','literature-skip'].includes(a.type)){
        resolveLiterature(g,a,pay);
      }else if(management.includes(a.type)){
        if(a.type==='settle-debt'&&g.debt?.reason==='detention'){
          economyAction(g,a);beginLanding(g,p,a);p.detained=false;p.position=(p.position+g.savedMove)%40;g.phase='end';landing(g,p,g.savedMove);delete g.savedMove;
        }else economyAction(g,a);
      }else if(a.type==='surrender'||a.type==='bankrupt'){
        if(a.type==='bankrupt'&&(!g.debt||liquidationValue(g,p.id)>=g.debt.amount))throw new Error('Raise funds to settle the debt first.');
        const creditor=g.debt?.creditorId;
        if(creditor)g.players[creditor].cash+=p.cash;
        for(const t of tiles.filter(t=>g.owners[t.id]===p.id)){
          if(creditor){g.owners[t.id]=creditor;g.players[creditor].cash+=(g.buildings?.[t.id]||0)*t.buildingCost/2;}
          else {delete g.owners[t.id];if(g.mortgages)delete g.mortgages[t.id];}
          if(g.buildings)delete g.buildings[t.id];
        }
        p.cash=0;p.eliminated=true;g.debt=null;advance(g);
      }else{
        if(g.debt)throw new Error('Resolve your debt first.');
        if(a.type==='roll'){
          if(g.phase!=='roll'||!Array.isArray(a.dice)||a.dice.length!==2||a.dice.some(n=>!Number.isInteger(n)||n<1||n>6))throw new Error('Roll two valid dice on your turn.');
          beginLanding(g,p,a);g.lastDice=a.dice;g.lastCard=null;g.phase='end';const total=a.dice[0]+a.dice[1],double=a.dice[0]===a.dice[1];
          g.extraRoll=double&&!p.detained;g.doubles=g.extraRoll?(g.doubles||0)+1:0;
          if(g.doubles===3)detain(g,p);
          else if(p.detained){
            p.attempts=(p.attempts||0)+1;
            if(double||p.attempts>=3){
              if(!double){pay(g,p,50);if(g.debt){g.debt.reason='detention';g.savedMove=total;}}
              if(!g.debt){p.detained=false;p.position=(p.position+total)%40;landing(g,p,total);}
            }
          }else{if(p.position+total>=40)p.cash+=200;p.position=(p.position+total)%40;landing(g,p,total);}
          if(!g.lastLanding.visits.length){recordVisit(g,p,tiles[p.position],total);g.lastLanding.visits[0].message=p.detained?'Still in Ego. Roll doubles on your next turn, or pay after the third attempt.':g.lastLanding.visits[0].message;}
        }else if(a.type==='buy'||a.type==='pass'){
          const tile=tiles[p.position];if(g.phase!=='purchase')throw new Error('No purchase pending.');
          if(a.type==='buy'){const price=purchasePrice(g,tile);if(g.owners[tile.id]||p.cash<price)throw new Error('Insufficient cash.');p.cash-=price;g.owners[tile.id]=p.id;}g.phase='end';
        }else if(a.type==='end-turn'){
          if(g.phase!=='end')throw new Error('Resolve your landing first.');
          if(g.extraRoll){g.extraRoll=false;g.phase='roll';}
          else {g.completedTurns++;g.roundTurns||={};g.roundTurns[p.id]=true;advance(g);}
        }else throw new Error('Unknown action.');
      }
    }
  }
  g.revision++;g.lastCommandId=a.id;g.events[a.id]={at:a.now,text:`${a.user.name||'Player'} · ${a.type}`};
  const entries=Object.entries(g.events).slice(-60);g.events=Object.fromEntries(entries);return g;
}
