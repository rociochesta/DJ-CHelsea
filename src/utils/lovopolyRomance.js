import {REACTIONS,recordRomanticActivity,validateRomanticMedia,validateRomanticBlocks} from './lovopolyInbox.js';
import {prepareEscapeChoices,escapeChallenge,recordChallengeCompletion} from './lovopolyChallenges.js';
export const romancePending = item => !['completed','declined'].includes(item.status);
export function romanticAction(game,action) {
  const {type,user,now,id}=action;
  const player=game.players[user.id];
  if(type==='detention-challenge' || type==='detention-options') {
    if(!['ready','playing'].includes(game.status) || !player.detained || player.detentionChallengeId || (game.turn===user.id && game.phase==='detention-release')) throw new Error('One escape invitation is available per stay in Kiss Detention, before mandatory release.');
    const choices=prepareEscapeChoices(game,player);
    if(type==='detention-options')return;
    const challenge=escapeChallenge(action.challengeId);
    if(!challenge || !choices.includes(challenge.id))throw new Error('Choose one of the three challenges offered for this detention.');
    const partner=Object.values(game.players).find(p=>p.id!==user.id);
    const session=player.detentionId || `${game.id}:legacy:${user.id}`;
    player.detentionId=session; player.detentionChallengeId=id;
    game.romanticInbox ||= {};
    game.romanticInbox[id]={id,from:user.id,to:partner.id,title:challenge.title,text:challenge.text,tone:challenge.tone,challengeId:challenge.id,challengeCycle:player.detentionChoiceCycle,status:'pending',at:now,detentionId:session,matchId:game.id};
    return;
  }
  const item=game.romanticInbox?.[action.invitationId];
  if(!item || ![item.from,item.to].includes(user.id)) throw new Error('This invitation does not belong to you.');
  if(type==='romance-hide' || type==='romance-restore'){item.hiddenBy ||= {};item.hiddenBy[user.id]=type==='romance-hide';return;}
  if(type.startsWith('romance-delete-')){
    if(type==='romance-delete-request'){
      if(item.deletionRequest)throw new Error('A deletion request is already pending.');
      item.deletionRequest={by:user.id,at:now};
    }else{
      if(!item.deletionRequest || (type==='romance-delete-withdraw'?item.deletionRequest.by!==user.id:item.deletionRequest.by===user.id))throw new Error('Only your partner can answer this request.');
      if(type==='romance-delete-accept'){
        delete game.romanticInbox[item.id];
        for(const archive of Object.values(game.archives || {}))if(archive.romanticInbox)delete archive.romanticInbox[item.id];
        return;
      }
      delete item.deletionRequest;
    }
    recordRomanticActivity(item,action);return;
  }
  if(type==='romance-read') {
    item.readBy ||= {};
    item.readBy[user.id]=Math.max(item.readBy[user.id] || 0,Math.min(Number(action.seenSeq) || 1,item.activitySeq || 1));
    return;
  }
  if(['romance-edit','romance-delete','romance-react'].includes(type)) {
    const message=item.messages?.[action.messageId];
    if(!message || message.deletedAt)throw new Error('This message is no longer available.');
    if(type==='romance-react') {
      if(!REACTIONS.includes(action.emoji))throw new Error('Choose one of the available reactions.');
      message.reactions ||= {};
      if(message.reactions[user.id]===action.emoji)delete message.reactions[user.id];
      else message.reactions[user.id]=action.emoji;
    } else {
      if(message.userId!==user.id)throw new Error('You can only change your own messages.');
      if(type==='romance-delete') {
        item.messages[message.id]={id:message.id,userId:message.userId,at:message.at,kind:message.kind,deletedAt:now};
      } else {
        const text=typeof action.text==='string'?action.text.trim():'';
        if(text.length>2000 || (!text && !message.media && !message.blocks?.some(b=>b.type==='image')))throw new Error('Write a message between 1 and 2,000 characters.');
        message.text=text;message.editedAt=now; if(message.blocks)message.blocks=[{type:'text',text},...message.blocks.filter(b=>b.type!=='text')];
      }
      for(const archive of Object.values(game.archives || {})) {
        const old=archive.romanticInbox?.[item.id];
        if(old?.messages?.[message.id])old.messages[message.id]=structuredClone(item.messages[message.id]);
      }
    }
    recordRomanticActivity(item,action);return;
  }
  if(type==='romance-message' || type==='romance-submit') {
    const blocks=action.blocks ? validateRomanticBlocks(action.blocks) : null;
    const text=blocks ? blocks.filter(b=>b.type==='text').map(b=>b.text).join('\n').trim() : typeof action.text==='string'?action.text.trim():'';
    const media=validateRomanticMedia(action.media);
    if((!text && !media && !blocks?.some(b=>b.type==='image')) || text.length>2000) throw new Error('Write a message between 1 and 2,000 characters.');
    if(type==='romance-submit' && (item.from!==user.id || !['pending','accepted'].includes(item.status))) throw new Error('Only the person doing this gesture can submit it, before confirmation.');
    item.messages ||= {};
    item.messages[id]={id,userId:user.id,text,at:now,kind:type==='romance-submit'?'submission':'message',...(media?{media}:{}),...(blocks?{blocks}:{})};
    if(type==='romance-submit'){item.status='submitted';item.submittedAt=now;}
  } else if(type==='romance-confirm') {
    if(item.to!==user.id || item.status!=='submitted') throw new Error('Your person must submit their response before you confirm completion.');
    item.status='completed';item.completedAt=now;item.confirmedBy=user.id;
    recordChallengeCompletion(game,item);
    const performer=game.players[item.from];
    if(['ready','playing'].includes(game.status) && item.matchId===game.id && item.detentionId && performer?.detained && performer.detentionId===item.detentionId) releaseDetention(performer);
  } else if(type==='romance-respond') {
    if(item.to!==user.id || !romancePending(item) || !['accepted','declined'].includes(action.response) || (action.response==='accepted' && item.status!=='pending')) throw new Error('This invitation is not available for that response.');
    item.status=action.response;item.respondedAt=now;
  } else throw new Error('Unknown romantic action.');
  recordRomanticActivity(item,action);
}

export function enterDetention(player,id) {
  player.position=10;player.detained=true;player.detentionAttempts=0;
  player.detentionId=id;player.detentionChallengeId=null;player.romanticReleaseId=null;
  player.detentionChoices=null;player.detentionChoiceCycle=null;
}
export function releaseDetention(player) {
  player.detained=false;player.detentionAttempts=0;player.romanticReleaseId=null;
}

