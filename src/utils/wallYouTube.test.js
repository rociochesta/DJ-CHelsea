import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeVideoId} from './wallYouTube.js';
import {cleanWallDraft,insertWallMedia} from './wallDraft.js';
import {filterWallPosts} from './wallPosts.js';
test('YouTube watch, share, shorts, live and embed links resolve to a video ID',()=>{
  for(const url of ['https://www.youtube.com/watch?v=iGS07iQaAcg&list=abc','https://youtu.be/iGS07iQaAcg?si=123','https://m.youtube.com/shorts/iGS07iQaAcg','https://youtube.com/live/iGS07iQaAcg','https://www.youtube-nocookie.com/embed/iGS07iQaAcg'])assert.equal(youtubeVideoId(url),'iGS07iQaAcg');
});
test('invalid links and lookalike hosts are rejected',()=>{
  for(const url of ['https://youtube.com.evil.com/watch?v=iGS07iQaAcg','https://evil.com/youtube.com/watch?v=iGS07iQaAcg','https://youtube.com/playlist?list=abc','javascript:alert(1)','https://youtube.com/watch?v=bad','https://user@youtube.com/watch?v=iGS07iQaAcg','not a link'])assert.equal(youtubeVideoId(url),null);
});
test('videos preserve surrounding text, persist and appear in video filtering',()=>{
  const draft=insertWallMedia([{type:'text',text:'AboveBelow'}],0,5,5,[{type:'youtube',videoId:'iGS07iQaAcg'}]);
  assert.deepEqual(cleanWallDraft(draft),[{type:'text',text:'Above'},{type:'youtube',videoId:'iGS07iQaAcg'},{type:'text',text:'Below'}]);
  assert.deepEqual(cleanWallDraft([{type:'youtube',videoId:'bad'}]),[]);
  assert.equal(filterWallPosts([{blocks:cleanWallDraft(draft)}],'video').length,1);
  assert.equal(filterWallPosts([{blocks:cleanWallDraft(draft)}],'photo').length,0);
});
