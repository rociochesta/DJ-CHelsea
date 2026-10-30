import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/rocio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 const page=await browser.newPage({reducedMotion:'reduce'});let delayed=false;
 await page.route('**/src/components/LovopolyLocal.jsx*',async route=>{
   const response=await route.fetch();let body=await response.text();
   const original='await navigator.locks.request(KEY, save);';
   assert.ok(body.includes(original),'Expected local save handler');
   body=body.replace(original,'{ await navigator.locks.request(KEY, save); await new Promise(resolve => setTimeout(resolve, 1200)); }');delayed=true;
   await route.fulfill({response,body});
 });
 await page.goto('http://127.0.0.1:5173/lovopoly-local');
 const a={id:'local-rocio',name:'Rocio',cash:1500,position:3,token:'heart'},b={id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'};
 const g={id:'purchase-confirm-regression',revision:0,status:'playing',mode:'classic',turn:a.id,phase:'purchase',players:{[a.id]:a,[b.id]:b},owners:{},events:{}};
 await page.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify(g)),g);await page.reload();
 await page.getByRole('button',{name:'Buy property',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Buy property',exact:true});
 await dialog.getByRole('button',{name:'Buy · $60',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')).owners[3]==='local-rocio');
 assert.equal(await dialog.count(),1,'Dialog remains while acknowledgment is delayed');
 assert.equal(await dialog.getByRole('alert').count(),0,'No false purchase error during subscription update');
 await dialog.waitFor({state:'detached'});
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
 assert.equal(result.players[a.id].cash,1440);assert.equal(result.phase,'end');assert.ok(delayed);
 assert.equal(await page.getByText('There is no property to buy.',{exact:true}).count(),0);
 console.log('PASS: delayed purchase acknowledgment updates ownership once without a false confirmation error.');
}finally{await browser.close();}
