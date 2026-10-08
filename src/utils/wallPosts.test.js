import test from 'node:test';
import assert from 'node:assert/strict';
import {wallBlocks,wallMediaKind,filterWallPosts} from './wallPosts.js';
import {cleanWallDraft} from './wallDraft.js';
test('wall filters recognize Giphy, uploaded GIFs, photos and drawings',()=>{
  const posts=[{id:'mixed',timestamp:3,blocks:[{type:'image',url:'https://a/photo.png'},{type:'image',url:'https://a/gif',giphyId:'abc'}]},{id:'draw',timestamp:2,blocks:[{type:'image',url:'data:image/png;base64,abc',mediaKind:'doodle'}]},{id:'old',timestamp:1,imageUrl:'https://a/old.GIF?x=1'},{id:'text',timestamp:4,message:'Hi'}];
  assert.deepEqual(filterWallPosts(posts,'photo').map(p=>p.id),['mixed']);
  assert.deepEqual(filterWallPosts(posts,'gif').map(p=>p.id),['mixed','old']);
  assert.deepEqual(filterWallPosts(posts,'doodle').map(p=>p.id),['draw']);
  assert.equal(wallMediaKind({type:'image',url:'data:image/gif;base64,abc'}),'gif');
  assert.equal(wallBlocks(posts[3])[0].text,'Hi');
  assert.equal(posts[0].id,'mixed');
});
test('sorting handles old posts without dates and does not mutate input',()=>{
  const posts=[{id:'new',timestamp:5},{id:'legacy'},{id:'old',timestamp:1}];
  assert.deepEqual(filterWallPosts(posts).map(p=>p.id),['new','old','legacy']);
  assert.deepEqual(filterWallPosts(posts,'all','oldest').map(p=>p.id),['legacy','old','new']);
  assert.equal(posts[0].id,'new');
});
test('drawing metadata survives saving a rich post',()=>{
  const blocks=cleanWallDraft([{type:'text',text:'  hi  '},{type:'image',url:'data:image/png;base64,abc',mediaKind:'doodle'}]);
  assert.equal(blocks[1].mediaKind,'doodle');assert.equal(blocks[0].text,'hi');
});
