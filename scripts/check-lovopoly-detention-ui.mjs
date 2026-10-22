import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/lovopoly-local');
 const base={id:'detention-popup',revision:0,status:'playing',mode:'classic',phase:'roll',turn:'local-rocio',players:{'local-rocio':{id:'local-rocio',name:'Rocio',cash:1500,position:10,token:'heart',detained:true,detentionId:'test-stay'},'local-chelsea':{id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'}},events:{},owners:{}};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
 async function seed(extra={},player={}){const g=structuredClone(base);Object.assign(g,extra);Object.assign(g.players['local-rocio'],player);await page.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify(g)),g);await page.reload();}
 await seed();await page.getByRole('dialog',{name:'Kiss Detention',exact:true}).waitFor();
 await page.getByRole('button',{name:'Dismiss',exact:true}).click();assert.equal((await saved()).players['local-rocio'].detained,true);
 await page.getByRole('button',{name:'View escape options',exact:true}).click();
 await page.getByRole('button',{name:'Pay $50 to leave',exact:true}).click();assert.equal((await saved()).players['local-rocio'].cash,1450);assert(!(await saved()).players['local-rocio'].detained);
 await seed({}, {detentionCards:1});await page.getByRole('button',{name:'Use detention card',exact:true}).click();assert.equal((await saved()).players['local-rocio'].cash,1500);assert(!(await saved()).players['local-rocio'].detained);
 await seed();await page.getByRole('button',{name:'Show my three challenges',exact:true}).click();assert.equal(await page.getByRole('radio').count(),3);await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Send chosen challenge',exact:true}).click();assert((await saved()).players['local-rocio'].detentionChallengeId);
 await seed({phase:'end'});assert(await page.getByRole('button',{name:'Pay $50 to leave',exact:true}).isDisabled());await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();assert.equal((await saved()).turn,'local-chelsea');
 await seed({}, {detentionAttempts:2,cash:20});await page.evaluate(()=>{let count=0;crypto.getRandomValues=array=>{array[0]=count++%2;return array;};});
 await page.getByRole('button',{name:'Roll to escape',exact:true}).click();assert.equal((await saved()).phase,'detention-release');assert.equal((await saved()).debt.amount,50);assert(await page.getByRole('button',{name:'Roll to escape',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Manage properties',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);
 await seed({}, {detained:false});await page.getByRole('button',{name:/Space 10:/}).click();await page.getByText(/You’re just visiting/).waitFor();assert.equal(await page.getByRole('button',{name:'Pay $50 to leave',exact:true}).count(),0);
 await seed();await page.getByRole('dialog').screenshot({path:'outputs/lovopoly/detention-popup-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Passed: automatic popup, dismiss/reopen, pay, escape card, challenge invitation, end turn, third-failure debt, no reroll, visiting distinction.');
} finally {await browser.close();}
