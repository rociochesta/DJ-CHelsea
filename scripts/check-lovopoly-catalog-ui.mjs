import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createBoardLayout} from '../src/utils/lovopolyCatalog.js';
import {updateLovopoly} from '../src/utils/lovopoly.js';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),other=await context.newPage();const errors=[];
 for(const p of [page,other]){p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5173/lovopoly-local');}
 const a={id:'local-rocio',name:'Rocio',cash:1500,position:0,token:'heart'},b={id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'};
 const game={id:'catalog-ui',revision:0,status:'playing',mode:'classic',turn:a.id,phase:'roll',players:{[a.id]:a,[b.id]:b},owners:{},events:{},boardLayout:createBoardLayout('catalog-ui')};
 await page.evaluate(g=>{localStorage.clear();localStorage.setItem('lovopoly-local-v1',JSON.stringify(g));},game);await page.reload();await other.reload();await other.getByLabel('Play as').selectOption(b.id);
 const rolled=updateLovopoly(game,{type:'roll',user:a,id:'catalog-roll',now:Date.now(),expectedGameId:game.id,expectedRevision:0,dice:[1,2]});
 await page.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify(g)),rolled);await page.reload();
 for(const p of [page,other]){await p.locator('.lovo-landing-showcase').waitFor();await p.locator('.lovo-place-animation').first().waitFor();}
 if(await other.getByRole('button',{name:/Buy property/}).count())throw Error('Observer can buy');
 mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/lovopoly-catalog-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/lovopoly-catalog-mobile.png'});
 await other.getByRole('button',{name:'Close landing'}).click();await other.reload();await other.getByLabel('Play as').selectOption(b.id);if(await other.locator('.lovo-landing-showcase').count())throw Error('Seen card reopened');
 await other.close();
 await page.evaluate(g=>{localStorage.removeItem('lovo-seen:catalog-ui:local-chelsea');g.lastLanding=null;localStorage.setItem('lovopoly-local-v1',JSON.stringify(g));},rolled);
 const returning=await context.newPage();await returning.goto('http://127.0.0.1:5173/lovopoly-local');await returning.getByLabel('Play as').selectOption(b.id);await returning.locator('.lovo-landing-showcase').waitFor();
 await returning.emulateMedia({reducedMotion:'no-preference'});await returning.reload();await returning.getByLabel('Play as').selectOption(b.id);
 await returning.locator('.lovo-place-animation').first().waitFor();
 const initialSource=await returning.locator('.lovo-place-animation').first().getAttribute('src');
 await returning.waitForFunction(src=>document.querySelector('.lovo-place-animation')?.getAttribute('src')!==src,initialSource,{timeout:20000});
 await returning.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify({...g,status:'finished',result:'Chelsea wins.',lastLanding:null,latestLandings:{}})),game);
 await returning.reload();await returning.getByRole('button',{name:'Start a new game',exact:true}).click();
 await returning.waitForFunction(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')).status==='setup');
 const fresh=await returning.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
 if(JSON.stringify(fresh.boardLayout)===JSON.stringify(game.boardLayout))throw Error('Board did not change');
 console.log('Passed: animations replay while open; Start a new game creates a new board setup.');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Passed: both players see animated landing; observer cannot buy; dismissed card stays closed; returning opponent sees saved landing.');
}finally{await browser.close();}
