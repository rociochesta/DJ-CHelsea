import test from 'node:test';
import assert from 'node:assert/strict';
import {updateLovopoly} from './lovopoly.js';
import {unreadActivity,validateRomanticMedia} from './lovopolyInbox.js';
let n=0;const a={id:'a',name:'A'},b={id:'b',name:'B'};
const start=()=>({id:'g',revision:0,status:'finished',players:{a:{...a,token:'heart'},b:{...b,token:'kiss'}},romanticInbox:{i:{id:'i',from:'a',to:'b',status:'completed',at:1}},archives:{}});
const act=(g,type,user=a,extra={})=>updateLovopoly(g,{type,user,id:`x${++n}`,now:n+10,expectedGameId:g.id,expectedRevision:g.revision,invitationId:'i',...extra});
test('read cursors are per player and do not swallow later activity',()=>{
 let g=start();assert.equal(unreadActivity(g.romanticInbox.i,'b'),1);
 g=act(g,'romance-read',b,{seenSeq:1});g=act(g,'romance-message',a,{text:'Hello'});
 assert.equal(unreadActivity(g.romanticInbox.i,'b'),1);assert.equal(unreadActivity(g.romanticInbox.i,'a'),0);
 g=act(g,'romance-read',b,{seenSeq:1});assert.equal(unreadActivity(g.romanticInbox.i,'b'),1);
 
});
test('media survives new setup; only sender edits/deletes, including archived media',()=>{
 let g=act(start(),'romance-message',a,{text:'Memory',media:{type:'photo',url:'data:image/png;base64,YQ=='}});const messageId=g.lastCommandId;
 assert.throws(()=>act(g,'romance-edit',b,{messageId,text:'No'}));assert.throws(()=>act(g,'romance-delete',b,{messageId}));
 g.status='cancelled';g=act(g,'create',a,{mode:'classic',token:'heart'});
 assert.ok(g.romanticInbox.i.messages[messageId].media);assert.ok(g.archives.g.romanticInbox.i.messages[messageId].media);
 g=act(g,'romance-edit',a,{messageId,text:'Updated'});assert.ok(g.romanticInbox.i.messages[messageId].editedAt);
 g=act(g,'romance-delete',a,{messageId});assert.ok(g.romanticInbox.i.messages[messageId].deletedAt);assert.equal(g.archives.g.romanticInbox.i.messages[messageId].media,undefined);
});
test('reactions notify the other player and toggle without changing completed status',()=>{
 let g=act(start(),'romance-message',a,{text:'Hi'});const messageId=g.lastCommandId;
 g=act(g,'romance-react',b,{messageId,emoji:'🔥'});assert.equal(unreadActivity(g.romanticInbox.i,'a'),1);assert.equal(g.romanticInbox.i.status,'completed');
 g=act(g,'romance-react',b,{messageId,emoji:'🔥'});assert.equal(g.romanticInbox.i.messages[messageId].reactions.b,undefined);
});
test('media rejects unsafe URLs and oversized uploads',()=>{for(const url of ['javascript:alert(1)','http://example.com/a.gif','data:image/svg+xml;base64,YQ=='])assert.throws(()=>validateRomanticMedia({type:'gif',url}));assert.throws(()=>validateRomanticMedia({type:'photo',url:'data:image/png;base64,'+'A'.repeat(700001)}));assert.ok(validateRomanticMedia({type:'gif',url:'https://media.giphy.com/media/example/giphy.gif'}));});

test('Wall composer blocks preserve multiple attachments and reject unsupported content',()=>{
 let g=act(start(),'romance-message',a,{blocks:[{type:'text',text:'Our memory'},{type:'image',url:'data:image/png;base64,YQ=='},{type:'text',text:'And this'},{type:'image',url:'https://media.giphy.com/media/test/giphy.gif',giphyId:'test'}]});
 const id=g.lastCommandId;assert.equal(g.romanticInbox.i.messages[id].blocks.length,4);
 assert.throws(()=>act(g,'romance-message',a,{blocks:[{type:'image',url:'javascript:alert(1)'}]}));
 assert.throws(()=>act(g,'romance-message',a,{blocks:[{type:'text',text:'x'.repeat(2001)}]}));
 g=act(g,'romance-delete',a,{messageId:id});assert.equal(g.romanticInbox.i.messages[id].blocks,undefined);
});
test('hiding is personal; permanent deletion requires partner and removes archived copies',()=>{
 let g=start();g.archives.old={romanticInbox:structuredClone(g.romanticInbox)};
 g=act(g,'romance-hide');assert.equal(g.romanticInbox.i.hiddenBy.a,true);assert.equal(g.romanticInbox.i.hiddenBy.b,undefined);
 g=act(g,'romance-restore');assert.equal(g.romanticInbox.i.hiddenBy.a,false);
 g=act(g,'romance-delete-request');assert.throws(()=>act(g,'romance-delete-accept'));
 g=act(g,'romance-delete-decline',b);assert.ok(g.romanticInbox.i);
 g=act(g,'romance-delete-request');g=act(g,'romance-delete-accept',b);
 assert.equal(g.romanticInbox.i,undefined);assert.equal(g.archives.old.romanticInbox.i,undefined);
});
