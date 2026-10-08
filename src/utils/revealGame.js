import { seededRandom, shuffleTiles } from './wordGame.js';

export const REVEAL_SYMBOLS = ['♠','☾','✦','⚡','♫','☀','◆','♣'];
export const REVEAL_STYLES = [
  { id:'rose',name:'Electric Plum',background:'linear-gradient(135deg, #1C1728, #6B21A8)',color:'#F3F4F6' },
  { id:'midnight',name:'Midnight',background:'#13111C',color:'#F3F4F6' },
  { id:'cream',name:'Candlelight',background:'linear-gradient(135deg, #1C1728, #13111C)',color:'#FBBF24' },
  { id:'wine',name:'Deep Wine',background:'linear-gradient(135deg, #13111C, #9D174D)',color:'#F3F4F6' },
];
export const REVEAL_FONTS = [
  { id:'simple',name:'Simple',family:'Inter, system-ui, sans-serif' },
  { id:'letter',name:'Classic letter',family:'Georgia, serif' },
  { id:'bold',name:'Bold',family:'Inter, system-ui, sans-serif' },
];
export const revealCells = game => Object.values(game?.deck || {});
export const canReceiveReveal = (game,userId) => !!userId && !!game && game.senderId !== userId && (!game.recipientId || game.recipientId === userId);
export const revealProgress = game => Object.keys(game?.matched || {}).length / (revealCells(game).length || 1);
export function validateRevealAsset(asset) {
  if (asset?.type === 'photo') {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.url || '') || asset.url.length > 6*1024*1024) throw new Error('Choose a photo up to 4 MB.');
    return { type:'photo',url:asset.url };
  }
  if (asset?.type === 'text') {
    const text = asset.text?.trim();
    if (!text || text.length > 700) throw new Error('Write a note of up to 700 characters.');
    if (!REVEAL_STYLES.some(style => style.id === asset.style) || !REVEAL_FONTS.some(font => font.id === asset.font)) throw new Error('Choose a text style.');
    return { type:'text',text,style:asset.style,font:asset.font };
  }
  throw new Error('Choose a photo or write a note.');
}
export function createReveal({ id,user,recipient,difficulty,seed,now }) {
  if (!id || !user?.id || !Number.isFinite(now) || !['quick','full'].includes(difficulty)) throw new Error('Choose your Reveal settings.');
  if (recipient?.id === user.id) throw new Error('Leave this Reveal for your person.');
  const pairs = difficulty === 'quick' ? 6 : 8;
  const deck = shuffleTiles(Array.from({length:pairs},(_,i) => [i,i]).flat(),seededRandom(seed));
  return { id,senderId:user.id,senderName:user.name || 'Your person',recipientId:recipient?.id || '',recipientName:recipient?.name || 'your person',difficulty,deck,status:'waiting',createdAt:now,revision:0,matched:{},flipped:[],attempts:0 };
}
export function revealSummary(game) {
  return { id:game.id,senderId:game.senderId,senderName:game.senderName,recipientId:game.recipientId || '',recipientName:game.recipientName,difficulty:game.difficulty,status:game.status,createdAt:game.createdAt,revision:game.revision,progress:revealProgress(game),...(game.completedAt ? {completedAt:game.completedAt} : {}) };
}
export function updateRevealGame(game,action) {
  if (!game || !action.user?.id || !Number.isFinite(action.now) || !action.id) throw new Error('Reopen this Reveal to play.');
  if (game.lastCommandId === action.id) return game;
  if (!canReceiveReveal(game,action.user.id)) throw new Error('This Reveal is for someone else.');
  if (game.status === 'complete') throw new Error('You have already uncovered this Reveal.');
  if (game.revision !== action.expectedRevision) throw new Error('This board changed in another tab. Try again.');
  const recipient = { recipientId:action.user.id,recipientName:action.user.name || game.recipientName };
  if (action.type === 'flip') {
    const deck = revealCells(game), flipped = Object.values(game.flipped || {});
    if (game.resolveAt || flipped.length >= 2) throw new Error('Wait for these cards to flip back.');
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= deck.length || game.matched?.[action.index] || flipped.includes(action.index)) throw new Error('Choose a face-down card.');
    const nextFlipped = [...flipped,action.index];
    return { ...game,...recipient,status:'playing',openedAt:game.openedAt || action.now,flipped:nextFlipped,...(nextFlipped.length === 2 ? {resolveAt:action.now+800} : {}),revision:game.revision+1,lastCommandId:action.id };
  }
  if (action.type === 'settle') {
    const flipped = Object.values(game.flipped || {}), deck = revealCells(game);
    if (!game.resolveAt || action.now < game.resolveAt || flipped.length !== 2) throw new Error('The cards are still turning.');
    const matched = {...game.matched};
    if (deck[flipped[0]] === deck[flipped[1]]) { matched[flipped[0]] = true; matched[flipped[1]] = true; }
    const complete = Object.keys(matched).length === deck.length;
    const next = { ...game,...recipient,matched,flipped:[],status:complete ? 'complete' : 'playing',attempts:game.attempts+1,revision:game.revision+1,lastCommandId:action.id,...(complete ? {completedAt:action.now} : {}) };
    delete next.resolveAt;
    return next;
  }
  throw new Error('Choose a card to play.');
}

export function validateRevealReply(blocks) {
  if (!Array.isArray(blocks) || !blocks.length || blocks.length > 40) throw new Error('Add a reply first.');
  let size = 0;
  const cleaned = blocks.map(block => {
    if (block.type === 'text') {
      const text = String(block.text || '').trim(); if (!text || text.length > 10000) throw new Error('Write a shorter reply.'); size += text.length; return {type:'text',text};
    }
    if (block.type === 'audio') {
      if (!/^data:audio\/(webm|ogg|mp4|mpeg)(;codecs=[\w.-]+)?;base64,[A-Za-z0-9+/=]+$/.test(block.url || '') || block.url.length > 2*1024*1024) throw new Error('Record a shorter voice note.');
      size += block.url.length; return {type:'audio',url:block.url};
    }
    if (block.type === 'image' && (/^https:\/\//.test(block.url || '') || /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(block.url || ''))) {
      size += block.url.length; return {type:'image',url:block.url,...(block.giphyId ? {giphyId:block.giphyId,sourceUrl:block.sourceUrl || 'https://giphy.com/'} : {})};
    }
    throw new Error('That attachment could not be saved.');
  });
  if (size > 8*1024*1024) throw new Error('Split large attachments into separate replies.');
  return cleaned;
}
