export function wallBlocks(post) {
  return post.blocks ? Object.values(post.blocks) : [
    ...(post.message ? [{type:'text',text:post.message}] : []),
    ...(post.imageUrl ? [{type:'image',url:post.imageUrl,giphyId:post.giphyId,sourceUrl:post.giphySourceUrl}] : []),
  ];
}
export function wallMediaKind(block) {
  if(block.type==='youtube'||block.type==='video')return 'video';
  if(block.type!=='image')return null;
  if(block.mediaKind==='doodle')return 'doodle';
  return block.giphyId || /^data:image\/gif[;,]/i.test(block.url||'') || /\.gif(?:[?#]|$)/i.test(block.url||'') ? 'gif' : 'photo';
}
export function filterWallPosts(posts,filter='all',sort='latest') {
  return posts.filter(post=>filter==='all'||wallBlocks(post).some(block=>wallMediaKind(block)===filter))
    .sort((a,b)=>(sort==='oldest'?1:-1)*((a.timestamp||0)-(b.timestamp||0)));
}
