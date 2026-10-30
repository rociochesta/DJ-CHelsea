import {getLovopolyTiles} from './lovopolyCatalog.js';
import { LOVOPOLY_TILES as tiles } from './lovopolyBoard.js';
import { transferHeldCards, returnHeldCard } from './lovopolyCards.js';

export const liquidationValue = (game, id) => game.players[id].cash + tiles.filter(t => game.owners?.[t.id] === id).reduce((sum,t) => sum + (game.mortgages?.[t.id] ? 0 : t.price / 2) + (game.buildings?.[t.id] || 0) * t.buildingCost / 2, 0);

export const netWorth = (game, id) => game.players[id].cash + tiles.filter(t => game.owners?.[t.id] === id).reduce((sum, t) => sum + t.price * (game.mortgages?.[t.id] ? 0.5 : 1) + (game.buildings?.[t.id] || 0) * t.buildingCost, 0) - (game.debt?.playerId === id ? game.debt.amount : 0);
const groupOf = tile => tile.group ? tiles.filter(t => t.group === tile.group) : [tile];
const cashAmount = n => Number.isSafeInteger(n) && n >= 0;
// Realtime Database removes empty arrays, including gift sides with no deeds.
// Restore only that omitted field; malformed terms must still fail validation.
export const normalizeTradeSide = side => side && typeof side === 'object' && !Array.isArray(side)
  ? { ...side, properties: side.properties ?? [] } : side;
export function describeTradeSide(raw,game) {
  const tiles=getLovopolyTiles(game);
  const side=normalizeTradeSide(raw);
  if(!side || !cashAmount(side.cash) || !cashAmount(side.cards) || !Array.isArray(side.properties)) return 'Offer details unavailable';
  return `$${side.cash} · ${side.cards} cards${side.properties.map(id=>` · ${tiles[id]?.name || 'Unknown property'}`).join('')}`;
}
export function economyAction(game, action) {
  const tiles=getLovopolyTiles(game);
  const { type, user, tileId } = action;
  if (!['ready', 'playing'].includes(game.status)) throw new Error('This match is not active.');
  game.owners ||= {}; game.mortgages ||= {}; game.buildings ||= {}; game.trades ||= {};
  const player = game.players[user.id];
  const other = Object.values(game.players).find(p => p.id !== user.id);
  const tile = tiles[tileId];
  if (['mortgage', 'unmortgage', 'build', 'sell-building'].includes(type)) {
    if (!tile?.price || game.owners[tileId] !== user.id) throw new Error('Choose one of your properties.');
    const group = groupOf(tile), level = game.buildings[tileId] || 0;
    if (type === 'mortgage') {
      if (game.mortgages[tileId] || group.some(t => game.buildings[t.id])) throw new Error('Sell all buildings in this color group before mortgaging.');
      game.mortgages[tileId] = true; player.cash += tile.price / 2;
    } else if (type === 'unmortgage') {
      const cost = Math.ceil(tile.price * 55 / 100);
      if (game.debt?.playerId === user.id || !game.mortgages[tileId] || player.cash < cost) throw new Error('Repay your debt first and keep enough cash for principal plus 10% interest.');
      player.cash -= cost; delete game.mortgages[tileId];
    } else if (type === 'build') {
      if (game.debt?.playerId === user.id || !tile.group || level >= 5 || group.some(t => game.owners[t.id] !== user.id || game.mortgages[t.id] || (game.buildings[t.id] || 0) < level) || player.cash < tile.buildingCost) throw new Error('Own the unmortgaged group, build evenly, and keep enough cash. Maximum: one Love Castle.');
      player.cash -= tile.buildingCost; game.buildings[tileId] = level + 1;
    } else {
      if (!level || group.some(t => (game.buildings[t.id] || 0) > level)) throw new Error('Sell buildings evenly across the group.');
      player.cash += tile.buildingCost / 2; game.buildings[tileId] = level - 1;
    }
    return `${player.name}: ${type} · ${tile.name}.`;
  }
  const validateSide = (side, owner) => {
    if (!side || !cashAmount(side.cash) || !cashAmount(side.cards) || !Array.isArray(side.properties) || new Set(side.properties).size !== side.properties.length) throw new Error('Enter valid trade amounts and properties.');
    if (game.players[owner].cash < side.cash || (game.players[owner].detentionCards || 0) < side.cards) throw new Error('The offered cash or cards are no longer available.');
    for (const id of side.properties) {
      if (!Number.isInteger(id) || !tiles[id]?.price || game.owners[id] !== owner || groupOf(tiles[id]).some(t => game.buildings[t.id])) throw new Error('Trade only owned properties with no buildings in their color group.');
    }
  };
  if (type === 'trade-offer') {
    const original=action.counterTradeId ? game.trades[action.counterTradeId] : null;
    if(action.counterTradeId && (!original || original.status!=='pending' || original.to!==user.id))throw new Error('This offer is no longer available to counter.');
    const give=normalizeTradeSide(action.give), receive=normalizeTradeSide(action.receive);
    validateSide(give, user.id); validateSide(receive, other.id);
    if (![give, receive].some(s => s.cash || s.cards || s.properties.length)) throw new Error('Include money, a property, or a card.');
    game.trades[action.id] = { id: action.id, from: user.id, to: other.id, give, receive, status: 'pending', at: action.now };
    if(original){original.status='countered';original.counterOfferId=action.id;game.trades[action.id].counterOf=original.id;}
    return `${player.name} sent ${original?'a counteroffer':'an offer'}. It stays pending until answered or withdrawn.`;
  }
  if (['trade-accept', 'trade-decline', 'trade-withdraw'].includes(type)) {
    const trade = game.trades[action.tradeId];
    if (!trade || trade.status !== 'pending' || (type === 'trade-withdraw' ? trade.from : trade.to) !== user.id) throw new Error('This offer is not available to you.');
    if (type === 'trade-accept') {
      trade.give=normalizeTradeSide(trade.give);trade.receive=normalizeTradeSide(trade.receive);
      validateSide(trade.give, trade.from); validateSide(trade.receive, trade.to);
      // Transfer specific deck cards simultaneously, so exchanging one each
      // cannot accidentally move the same card twice.
      const heldBefore=structuredClone(game.decks || {});
      for (const [side,from,to] of [[trade.give,trade.from,trade.to],[trade.receive,trade.to,trade.from]]) {
        let remaining=side.cards;
        for(const [name,deck] of Object.entries(heldBefore)) for(const [id,owner] of Object.entries(deck.held || {})) if(remaining>0 && owner===from){game.decks[name].held[id]=to;remaining--;}
      }
      for (const [side, from, to] of [[trade.give, trade.from, trade.to], [trade.receive, trade.to, trade.from]]) {
        game.players[from].cash -= side.cash; game.players[to].cash += side.cash;
        game.players[from].detentionCards = (game.players[from].detentionCards || 0) - side.cards;
        game.players[to].detentionCards = (game.players[to].detentionCards || 0) + side.cards;
        side.properties.forEach(id => { game.owners[id] = to; });
      }
    }
    trade.status = type === 'trade-accept' ? 'accepted' : type === 'trade-decline' ? 'declined' : 'withdrawn';
    return `${player.name} ${trade.status} the offer.`;
  }
  if (type === 'settle-debt' || type === 'bankrupt') {
    const debt = game.debt;
    if (!debt || debt.playerId !== user.id) throw new Error('You have no pending debt.');
    if (type === 'settle-debt') {
      if (player.cash < debt.amount) throw new Error('Sell buildings, mortgage properties, or receive a gift to cover the debt.');
      player.cash -= debt.amount;
      if (debt.creditorId) game.players[debt.creditorId].cash += debt.amount;
      if (game.lastRent?.status === 'owed' && game.lastRent.payerId === user.id && game.lastRent.ownerId === debt.creditorId) game.lastRent.status = 'paid';
      game.debt = null;
      return `${player.name} paid the outstanding debt.`;
    }
    if (liquidationValue(game,user.id) >= debt.amount) throw new Error('You can cover this debt by selling buildings and mortgaging properties. Raise the cash and pay, or choose Surrender to concede.');
    if (debt.creditorId) game.players[debt.creditorId].cash += player.cash;
    player.cash = 0;
    for (const t of tiles.filter(t => game.owners[t.id] === user.id)) {
      if (debt.creditorId) game.owners[t.id] = debt.creditorId;
      else { delete game.owners[t.id]; delete game.mortgages[t.id]; }
      const refund = (game.buildings[t.id] || 0) * t.buildingCost / 2;
      if (debt.creditorId) game.players[debt.creditorId].cash += refund;
      delete game.buildings[t.id];
    }
    if (debt.creditorId) {
      game.players[debt.creditorId].detentionCards = (game.players[debt.creditorId].detentionCards || 0) + (player.detentionCards || 0);
      transferHeldCards(game,user.id,debt.creditorId,player.detentionCards || 0);
    } else for(let i=0;i<(player.detentionCards || 0);i++) returnHeldCard(game,user.id);
    player.detentionCards = 0; game.debt = null; game.status = 'finished'; game.winner = other.id;
    if (game.lastRent?.status === 'owed') game.lastRent.status = 'bankruptcy';
    game.result = `${player.name} declared bankruptcy. ${other.name} wins.`;
    return game.result;
  }
  throw new Error('Unknown economy action.');
}
