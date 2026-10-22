import { ROMANCE_ACTIONS } from './lovopolyInbox.js';
import { LOVOPOLY_TOKENS, LOVOPOLY_TILES } from './lovopolyBoard.js';
import { economyAction, netWorth } from './lovopolyEconomy.js';
import { ensureDecks, returnHeldCard } from './lovopolyCards.js';
import { resolveLanding } from './lovopolyLanding.js';
import { romanticAction, enterDetention, releaseDetention } from './lovopolyRomance.js';
import { prepareEscapeChoices } from './lovopolyChallenges.js';

function finishDetentionMove(game,action) {
  const pending=game.detentionRoll;
  if(!pending || pending.playerId!==action.user.id) throw new Error('No saved detention roll.');
  const player=game.players[action.user.id];
  releaseDetention(player);game.phase='end';game.extraRoll=false;game.doubles=0;
  game.detentionRoll=null;
  player.position=(player.position+pending.total)%40;
  return `Left Kiss Detention using the saved roll (${pending.dice.join(' + ')}). `+resolveLanding(game,action,pending.total);
}

export const QUICK_ROUNDS = [10, 20, 30, 50];
const tokenIds = new Set(LOVOPOLY_TOKENS.map(token => token.id));

// Sample once outside the Firebase transaction. Retries must reuse the same dice.
export function rollLovopolyDice(random = globalThis.crypto) {
  const dice = [];
  while (dice.length < 2) {
    const value = random.getRandomValues(new Uint8Array(1))[0];
    if (value < 252) dice.push(value % 6 + 1);
  }
  return dice;
}

function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 2 || dice.some(value => !Number.isInteger(value) || value < 1 || value > 6)) throw new Error('Roll two valid dice.');
}

function ensureToken(token, players = {}, userId) {
  if (!tokenIds.has(token)) throw new Error('Choose a token.');
  if (Object.values(players).some(player => player.id !== userId && player.token === token)) throw new Error('That token is already taken. Choose another.');
}

function playerFor(user, token) {
  return { id: user.id, name: String(user.name || 'Your person').slice(0, 80), token, cash: 1500, position: 0 };
}

function log(game, action, text) {
  game.events ||= {};
  game.events[action.id] = { id: action.id, at: action.now, userId: action.user.id, text };
}

// All actions are deterministic so Firebase can safely retry a transaction.
export function updateLovopoly(game, action) {
  const { type, user, id, now } = action;
  if (!user?.id || !id || !Number.isFinite(now)) throw new Error('Join the room before setting up Lovopoly.');
  if (game?.lastCommandId === id) return game;
  if ((game?.id || null) !== action.expectedGameId || (game && game.revision !== action.expectedRevision)) throw new Error('Lovopoly changed on another screen. Please try again.');

  if (type === 'create') {
    if (game && game.status !== 'cancelled') throw new Error('There is already a saved match. Open it to continue.');
    if (game && !game.players?.[user.id]) throw new Error('Only the players in this match can start its replacement.');
    if (!['classic', 'quick'].includes(action.mode)) throw new Error('Choose Classic or Quick mode.');
    if (action.mode === 'quick' && !QUICK_ROUNDS.includes(action.roundLimit)) throw new Error('Choose 10, 20, 30, or 50 rounds.');
    ensureToken(action.token);
    const next = {
      schemaVersion: 1, id, revision: 0, status: 'setup', createdAt: now,
      creatorId: user.id, mode: action.mode, roundLimit: action.mode === 'quick' ? action.roundLimit : 0,
      players: { [user.id]: playerFor(user, action.token) },
      romanticInbox: game?.romanticInbox || {}, escapeProgress: game?.escapeProgress || {},
      openingRound: 1, openingRolls: {}, events: {}, lastCommandId: id,
      // Preserve cancelled setups as well; new setup never erases prior history.
      archives: { ...game?.archives, ...(game ? { [game.id]: { ...game, archives: null } } : {}) },
    };
    ensureDecks(next);
    log(next, action, `${next.players[user.id].name} started a ${action.mode === 'quick' ? `${action.roundLimit}-round Quick` : 'Classic'} match setup.`);
    return next;
  }

  if (['rematch-request','rematch-accept','rematch-decline','rematch-withdraw'].includes(type)) {
    if (game?.status !== 'finished' || !game.players?.[user.id] || Object.keys(game.players).length !== 2) throw new Error('Only the two players of a completed match can arrange a rematch.');
    const next=structuredClone(game);
    if(type==='rematch-request') {
      if(next.rematch)throw new Error('A rematch request is already waiting.');
      next.rematch={requestedBy:user.id,at:now};
      log(next,action,`${next.players[user.id].name} requested a rematch with the same settings.`);
    } else {
      if(!next.rematch || (type==='rematch-withdraw' ? next.rematch.requestedBy!==user.id : next.rematch.requestedBy===user.id)) throw new Error('Only your partner can answer the rematch request; only its sender can withdraw it.');
      if(type==='rematch-accept') {
        const fresh={schemaVersion:1,id,revision:0,status:'opening',createdAt:now,creatorId:next.rematch.requestedBy,
          mode:next.mode,roundLimit:next.roundLimit,players:Object.fromEntries(Object.values(next.players).map(p=>[p.id,playerFor(p,p.token)])),
          openingRound:1,openingRolls:{},events:{},lastCommandId:id,
          romanticInbox:next.romanticInbox || {},
          escapeProgress:next.escapeProgress || {},
          archives:{...next.archives,[next.id]:{...next,archives:null}},
        };
        ensureDecks(fresh);
        log(fresh,action,`${next.players[user.id].name} accepted the rematch. Both players start with $1,500. Roll to decide who starts.`);
        return fresh;
      }
      next.rematch=null;
      log(next,action,`${next.players[user.id].name} ${type==='rematch-decline'?'declined':'withdrew'} the rematch request.`);
    }
    next.revision++;next.lastCommandId=id;return next;
  }

  const romanticResponse = ROMANCE_ACTIONS.includes(type);
  if (!game || (game.status === 'cancelled' && !romanticResponse)) throw new Error('Start a match setup first.');
  if (game.status === 'finished' && !romanticResponse) throw new Error('This match has ended. Its result cannot be changed.');
  const next = structuredClone(game);
  next.openingRolls ||= {};
  next.players ||= {};
  const player = next.players[user.id];

  if (type === 'join') {
    if (player) throw new Error('You have already joined this match.');
    if (next.status !== 'setup' || Object.keys(next.players).length !== 1) throw new Error('Lovopoly is for two players. This match is full.');
    ensureToken(action.token, next.players, user.id);
    next.players[user.id] = playerFor(user, action.token);
    next.status = 'opening';
    log(next, action, `${next.players[user.id].name} joined. Both players can roll to decide who starts.`);
  } else {
    if (!player) throw new Error('Join this match first.');
    if (romanticResponse || type==='detention-challenge' || type==='detention-options') {
      const performerId=type==='romance-confirm' ? next.romanticInbox?.[action.invitationId]?.from : null;
      const wasDetained=performerId && next.players[performerId]?.detained;
      romanticAction(next,action);
      if(wasDetained && !next.players[performerId].detained) {
        let message=`${next.players[performerId].name} leaves Kiss Detention for free: challenge confirmed.`;
        if(next.turn===performerId) {
          if(next.phase==='detention-release') {
            if(next.debt?.playerId===performerId && next.debt.reason==='detention')next.debt=null;
            message+=' '+finishDetentionMove(next,{...action,user:next.players[performerId]});
          } else if(next.phase==='end') {
            next.phase='roll';next.extraRoll=false;next.doubles=0;
          }
        }
        log(next,action,message);
      }
    } else if (type === 'surrender') {
      const opponent = Object.values(next.players).find(other => other.id !== user.id);
      if (!opponent || !['opening', 'ready', 'playing'].includes(next.status)) throw new Error('Both players must join before you can surrender.');
      next.status = 'finished';
      next.winner = opponent.id;
      next.finishReason = 'surrender';
      next.surrenderedBy = user.id;
      next.finishedAt = now;
      next.cancellation = null;
      next.extraRoll = false;
      next.result = `${player.name} surrendered. ${opponent.name} wins.`;
      log(next, action, next.result);
    } else if (type === 'token') {
      if (!['setup', 'opening'].includes(next.status) || next.openingRolls[user.id]) throw new Error('Your token is locked after your opening roll.');
      ensureToken(action.token, next.players, user.id);
      player.token = action.token;
      log(next, action, `${player.name} chose the ${LOVOPOLY_TOKENS.find(token => token.id === action.token).name} token.`);
    } else if (type === 'opening-roll') {
      if (next.status !== 'opening' || Object.keys(next.players).length !== 2) throw new Error('Both players must join before rolling.');
      if (next.openingRolls[user.id]) throw new Error('You have already rolled. Wait for your partner.');
      validateDice(action.dice);
      next.openingRolls[user.id] = { dice: [...action.dice], total: action.dice[0] + action.dice[1] };
      let message = `${player.name} rolled ${action.dice.join(' + ')} = ${action.dice[0] + action.dice[1]}.`;
      const entries = Object.entries(next.openingRolls);
      if (entries.length === 2) {
        if (entries[0][1].total === entries[1][1].total) {
          next.lastOpeningTie = { round: next.openingRound, rolls: structuredClone(next.openingRolls) };
          next.openingRound++;
          next.openingRolls = {};
          message += ' It is a tie! Both players roll again.';
        } else {
          const [winnerId] = entries.sort((a, b) => b[1].total - a[1].total)[0];
          next.firstPlayerId = winnerId;
          next.turn = winnerId;
          next.status = 'ready';
          next.readyAt = now;
          message += ` ${next.players[winnerId].name} will take the first turn.`;
        }
      }
      log(next, action, message);
    } else if (['mortgage', 'unmortgage', 'build', 'sell-building', 'trade-offer', 'trade-accept', 'trade-decline', 'trade-withdraw', 'settle-debt', 'bankrupt'].includes(type)) {
      const detentionDebt=type==='settle-debt' && next.debt?.reason==='detention';
      let message=economyAction(next, action);
      if(detentionDebt) message+=' '+finishDetentionMove(next,action);
      log(next, action, message);
    } else if (['roll', 'buy', 'pass', 'end-turn', 'detention-card','detention-pay'].includes(type)) {
      if (!['ready', 'playing'].includes(next.status) || next.turn !== user.id) throw new Error('Wait for your turn.');
      if (next.debt && !(type==='detention-card' && next.debt.reason==='detention' && next.debt.playerId===user.id)) throw new Error('Resolve the outstanding debt before continuing.');
      next.status = 'playing';
      next.owners ||= {};
      next.phase ||= 'roll';
      next.completedTurns ||= 0;
      const opponent = Object.values(next.players).find(other => other.id !== user.id);
      if (type === 'detention-card' || type==='detention-pay') {
        if (!player.detained || !['roll','detention-release'].includes(next.phase)) throw new Error('Pay or use a card before rolling, or after the third failed attempt.');
        if(type==='detention-card') {
          if(!player.detentionCards)throw new Error('No detention card available.');
          player.detentionCards--;returnHeldCard(next,user.id);
          if(next.debt?.reason==='detention')next.debt=null;
        } else {
          if(player.cash<50)throw new Error('Raise $50 by selling buildings, mortgaging or trading, or use an escape card.');
          player.cash-=50;
        }
        let message=player.name+(type==='detention-card'?' used a Get Out of Kiss Detention card.':' paid $50 to leave Kiss Detention.');
        if(next.phase==='detention-release')message+=' '+finishDetentionMove(next,action);
        else {releaseDetention(player);next.doubles=0;}
        log(next, action, message);
      } else if (type === 'roll') {
        if (next.phase !== 'roll') throw new Error('Resolve this landing and end your turn first.');
        validateDice(action.dice);
        next.lastDice = [...action.dice];
        next.lastRent = null;
        next.lastLanding = null;
        const total = action.dice[0] + action.dice[1];
        next.phase = 'end';
        next.extraRoll = action.dice[0] === action.dice[1] && !player.detained;
        next.doubles = next.extraRoll ? (next.doubles || 0) + 1 : 0;
        let message = player.name + ' rolled ' + action.dice.join(' + ') + '.';
        if (next.doubles === 3) {
          enterDetention(player,action.id); next.extraRoll = false;
          prepareEscapeChoices(next,player);
          message += ' Three consecutive doubles: go to Kiss Detention.';
        } else if (player.detained) {
          player.detentionAttempts=(player.detentionAttempts||0)+1;
          if(action.dice[0]===action.dice[1]) {
            releaseDetention(player);player.position=(player.position+total)%40;
            message+=' Escaped Kiss Detention with doubles. No bonus roll. '+resolveLanding(next,action,total);
          } else if(player.detentionAttempts>=3) {
            next.phase='detention-release';next.detentionRoll={playerId:user.id,total,dice:[...action.dice]};
            if(player.cash<50)next.debt={playerId:user.id,amount:50,creditorId:null,reason:'detention'};
            message+=' Third failed escape attempt. Pay $50 or use a card, then move with this saved roll. No bonus roll.';
          } else message+=` Kiss Detention attempt ${player.detentionAttempts}/3: no doubles. Remain detained.`;
        } else {
          const destination = player.position + total;
          if (destination >= 40) { player.cash += 200; message += ' Collected $200 for passing Hello, Beautiful.'; }
          player.position = destination % 40;
          message += ' ' + resolveLanding(next, action, total);
        }
        log(next, action, message);
      } else if (type === 'buy' || type === 'pass') {
        if (next.phase !== 'purchase') throw new Error('There is no property to buy.');
        const tile = LOVOPOLY_TILES[player.position];
        if (type === 'buy') {
          if (next.owners[tile.id] || !tile.price || player.cash < tile.price) throw new Error('You cannot afford this property. You can pass.');
          player.cash -= tile.price; next.owners[tile.id] = user.id;
        }
        next.phase = 'end';
        log(next, action, player.name + (type === 'buy' ? ' bought ' : ' passed on ') + tile.name + '.');
      } else {
        if (next.phase !== 'end') throw new Error('Roll and resolve your landing first.');
        if (next.extraRoll) {
          next.phase = 'roll'; next.extraRoll = false;
          log(next, action, player.name + ' rolls again after doubles.');
          next.revision++; next.lastCommandId = id; return next;
        }
        next.doubles = 0;
        next.completedTurns++;
        if (next.mode === 'quick' && next.completedTurns >= next.roundLimit * 2) {
          const worth = p => netWorth(next, p.id);
          next.status = 'finished'; next.winner = worth(player) === worth(opponent) ? 'tie' : worth(player) > worth(opponent) ? player.id : opponent.id;
          next.result = 'Round limit reached. Net worth includes cash, properties (mortgaged at half value), and building purchase costs.';
        } else {
          next.turn = opponent.id; next.phase = 'roll';
          if(opponent.detained && opponent.romanticReleaseId && opponent.romanticReleaseId===opponent.detentionId){releaseDetention(opponent);log(next,{...action,id:`${id}-romantic-release`},`${opponent.name} leaves Kiss Detention for free after their partner confirmed the escape gesture.`);}
        }
        const previousEnd=Math.max(0,...Object.values(next.events || {}).filter(e=>e.text.includes('ended their turn.')).map(e=>e.at));
        next.lastTurnSummary={playerId:user.id,text:Object.values(next.events || {}).filter(e=>e.userId===user.id && e.at>previousEnd).sort((a,b)=>a.at-b.at).map(e=>e.text).join(' ')};
        log(next, action, player.name + ' ended their turn.');
      }
    } else if (type === 'cancel-request') {
      if (next.cancellation) throw new Error('A cancellation request is already waiting.');
      if (Object.keys(next.players).length === 1) {
        next.status = 'cancelled'; next.cancelledAt = now;
        log(next, action, `${player.name} cancelled the unjoined setup.`);
      } else {
        next.cancellation = { requestedBy: user.id, at: now };
        log(next, action, `${player.name} asked to cancel this match setup.`);
      }
    } else if (type === 'cancel-accept') {
      if (!next.cancellation || next.cancellation.requestedBy === user.id) throw new Error('Your partner must confirm cancellation.');
      next.status = 'cancelled'; next.cancelledAt = now; next.cancellation = null;
      log(next, action, `${player.name} agreed to cancel the setup.`);
    } else if (type === 'cancel-decline') {
      if (!next.cancellation) throw new Error('There is no cancellation request.');
      next.cancellation = null;
      log(next, action, `${player.name} kept the saved setup.`);
    } else {
      throw new Error('That Lovopoly action is not available yet.');
    }
  }
  next.revision++;
  if (['finished', 'cancelled'].includes(next.status)) Object.values(next.trades || {}).filter(t => t.status === 'pending').forEach(t => { t.status = 'match-ended'; });
  next.lastCommandId = id;
  if (type === 'surrender') next.archives = { ...next.archives, [next.id]: { ...structuredClone(next), archives: null } };
  return next;
}
