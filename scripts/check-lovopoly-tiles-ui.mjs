import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createBoardLayout} from '../src/utils/lovopolyCatalog.js';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/lovopoly-local');
const a={id:'local-rocio',name:'Rocio',cash:1500,position:0,token:'heart'};
const b={id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'};
const game={id:'tiles-ui',revision:0,status:'playing',mode:'classic',turn:a.id,phase:'roll',players:{[a.id]:a,[b.id]:b},owners:{},events:{},boardLayout:createBoardLayout('tiles-ui')};
await page.evaluate(g=>{localStorage.clear();localStorage.setItem('lovopoly-local-v1',JSON.stringify(g));},game);await page.reload();
for(const id of [0,1,2,10,21,39]){
await page.locator('.lovo-tile').nth(id).click();await page.locator('.lovo-place-animation').first().waitFor();
await page.waitForFunction(()=>[...document.querySelectorAll('.lovo-place-art img')].every(i=>i.complete&&i.naturalWidth>0));
assert.equal(await page.locator('.lovo-showcase-info>small').textContent(),'Explore the board');
if(id===21){await page.screenshot({path:'artifacts/lovopoly-tiles-desktop.png'});}
await page.getByRole('button',{name:'Close landing'}).click();
}
await page.locator('.lovo-tile').nth(1).click();await page.getByRole('button',{name:'View Deed',exact:true}).click();assert.equal(await page.locator('.lovo-landing-showcase').count(),0);
await page.keyboard.press('Escape');
await page.setViewportSize({width:390,height:844});await page.locator('.lovo-tile').nth(21).click();await page.locator('.lovo-place-animation').first().waitFor();await page.screenshot({path:'artifacts/lovopoly-tiles-mobile.png'});
assert.deepEqual(errors,[]);console.log('Passed: exploration, all tile types, loaded animated artwork, deed navigation, desktop and mobile.');
}finally{await browser.close();}
