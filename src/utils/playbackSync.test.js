import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackPosition,playerPlaybackUpdate,seekPlaybackUpdate} from './playbackSync.js';

test('resume uses the actual player position instead of an old paused position',()=>{
  const change=playerPlaybackUpdate({isPlaying:false,pausedAtSeconds:1},1,96,100000);
  assert.deepEqual(change,{isPlaying:true,startTime:4000,pausedAtSeconds:null});
  assert.equal(playbackPosition(change,101000),97);
});
test('repeated playing and buffering events do not restart the shared clock',()=>{
  const state={isPlaying:true,startTime:0};
  assert.equal(playerPlaybackUpdate(state,1,1,100000),null);
  assert.equal(playerPlaybackUpdate(state,3,1,100000),null);
});
test('pause keeps the exact position and repeated pauses do not broadcast',()=>{
  assert.deepEqual(playerPlaybackUpdate({isPlaying:true},2,12.75),{isPlaying:false,pausedAtSeconds:12.75});
  assert.equal(playbackPosition({isPlaying:false,pausedAtSeconds:12.75},999999),12.75);
  assert.equal(playerPlaybackUpdate({isPlaying:false},2,12.75),null);
});
test('manual seeking updates the clock while normal progress does not',()=>{
  const state={isPlaying:true,startTime:0};
  assert.equal(seekPlaybackUpdate(state,10,10000),null);
  const change=seekPlaybackUpdate(state,90,10000);
  assert.equal(playbackPosition(change,11000),91);
  assert.equal(seekPlaybackUpdate({isPlaying:false},90,10000),null);
});
test('invalid positions cannot be broadcast and future timestamps clamp to zero',()=>{
  assert.equal(playerPlaybackUpdate({isPlaying:false},1,NaN),null);
  assert.equal(playbackPosition({isPlaying:true,startTime:2000},1000),0);
});
