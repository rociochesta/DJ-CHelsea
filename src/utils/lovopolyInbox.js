export const ROMANCE_ACTIONS = ['romance-hide','romance-restore','romance-delete-request','romance-delete-accept','romance-delete-decline','romance-delete-withdraw','romance-respond','romance-submit','romance-confirm','romance-message','romance-read','romance-react','romance-edit','romance-delete'];
export const REACTIONS = ['❤️','😘','😂','🔥'];
export function unreadActivity(item,userId) {
  return Object.values(item.activity || {initial:{seq:1,userId:item.from}}).filter(e=>e.userId!==userId && e.seq>(item.readBy?.[userId] || 0)).length;
}
export function recordRomanticActivity(item,action) {
  item.activity ||= {initial:{seq:1,userId:item.from}};
  item.activitySeq=(item.activitySeq || 1)+1;
  item.activity[action.id]={seq:item.activitySeq,userId:action.user.id,type:action.type,at:action.now};
}
export function validateRomanticMedia(media) {
  if(!media)return null;
  if(!['photo','gif'].includes(media.type) || typeof media.url!=='string')throw new Error('Choose a photo or GIF.');
  const inline=/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(media.url);
  let remote=false;
  try { const url=new URL(media.url);remote=media.type==='gif' && url.protocol==='https:' && !url.username && !url.password && (/\.gif$/i.test(url.pathname) || /(^|\.)giphy\.com$/.test(url.hostname)); } catch {}
  if((!inline && !remote) || media.url.length>700000)throw new Error('Choose an image under 500 KB or a direct HTTPS GIF link.');
  return {type:media.type,url:media.url};
}
// Keep media in the existing shared Firebase save, with no public upload bucket.
export async function readRomanticMedia(file) {
  if(!file || !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Choose a JPG, PNG, WebP or GIF.');
  if(file.size>500*1024)throw new Error('Choose a photo or GIF up to 500 KB.');
  const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read this image.'));r.readAsDataURL(file);});
  return validateRomanticMedia({type:file.type==='image/gif'?'gif':'photo',url});
}

export function validateRomanticBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length > 100) throw new Error('Invalid message.');
  let size = 0, textSize = 0;
  return blocks.map(block => {
    if (block.type === 'text') {
      if (typeof block.text !== 'string') throw new Error('Invalid text.');
      textSize += block.text.length;
      if (textSize > 2000) throw new Error('Use up to 2,000 characters.');
      return {type:'text',text:block.text};
    }
    if (block.type !== 'image' || typeof block.url !== 'string') throw new Error('Choose a picture or GIF.');
    const inline = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(block.url);
    let remote = false;
    try { const url = new URL(block.url); remote = url.protocol === 'https:' && !url.username && !url.password; } catch {}
    if ((!inline && !remote) || block.url.length > 2800000) throw new Error('Choose an image up to 2 MB.');
    size += inline ? block.url.length : 0;
    if (size > 8*1024*1024) throw new Error('Split large pictures into separate messages.');
    return {type:'image',url:block.url,...(typeof block.giphyId==='string'?{giphyId:block.giphyId}:{} )};
  });
}
