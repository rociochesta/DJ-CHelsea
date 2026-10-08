import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWallVideoFile,validWallVideoUrl,MAX_WALL_VIDEO_BYTES} from './wallVideo.js';
import {cleanWallDraft,insertWallMedia} from './wallDraft.js';
import {filterWallPosts} from './wallPosts.js';
test('uploaded clips allow MP4 and WebM up to 5 MB',()=>{
  for(const type of ['video/mp4','video/webm'])assert.doesNotThrow(()=>validateWallVideoFile({type,size:MAX_WALL_VIDEO_BYTES}));
  assert.throws(()=>validateWallVideoFile({type:'video/mp4',size:MAX_WALL_VIDEO_BYTES+1}));
  assert.throws(()=>validateWallVideoFile({type:'video/quicktime',size:100}));
  assert.throws(()=>validateWallVideoFile({type:'video/mp4',size:0}));
});
test('invalid or oversized encoded video URLs are rejected',()=>{
  assert.equal(validWallVideoUrl('data:video/mp4;base64,YWJj'),true);
  for(const url of ['javascript:alert(1)','data:text/html;base64,YWJj','data:video/mp4;base64,!!!',`data:video/mp4;base64,${'A'.repeat(8*1024*1024)}`])assert.equal(validWallVideoUrl(url),false);
});
test('video attachments preserve text, survive saving and appear in the Videos filter',()=>{
  const video={type:'video',url:'data:video/webm;base64,YWJj'};
  const draft=cleanWallDraft(insertWallMedia([{type:'text',text:'BeforeAfter'}],0,6,6,[video]));
  assert.deepEqual(draft,[{type:'text',text:'Before'},video,{type:'text',text:'After'}]);
  assert.equal(filterWallPosts([{blocks:draft}],'video').length,1);
  assert.deepEqual(cleanWallDraft([{type:'video',url:'data:text/html;base64,YWJj'}]),[]);
});
