export function youtubeVideoId(value) {
  try {
    const url=new URL(value.trim()),host=url.hostname.toLowerCase();
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
    let id;
    if(host==='youtu.be')id=url.pathname.split('/')[1];
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
      const parts=url.pathname.split('/');
      id=url.pathname==='/watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[1])?parts[2]:null;
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;
  }catch{return null;}
}
