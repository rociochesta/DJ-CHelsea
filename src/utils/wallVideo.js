export const MAX_WALL_VIDEO_BYTES=5*1024*1024;
export function validateWallVideoFile(file){
  if(!['video/mp4','video/webm'].includes(file.type))throw new Error('Choose an MP4 or WebM video.');
  if(file.size>MAX_WALL_VIDEO_BYTES)throw new Error('Choose a video up to 5 MB.');
  if(!file.size)throw new Error('This video file is empty.');
}
export function validWallVideoUrl(url){
  return typeof url==='string'&&url.length<=Math.ceil(MAX_WALL_VIDEO_BYTES/3)*4+100&&/^data:video\/(mp4|webm);base64,[A-Za-z0-9+/=]+$/.test(url);
}
