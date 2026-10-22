import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/lovopoly-local');
 const base={id:'layout-check',revision:0,status:'playing',mode:'classic',phase:'roll',turn:'local-rocio',players:{'local-rocio':{id:'local-rocio',name:'Rocio',cash:1500,position:1,token:'heart'},'local-chelsea':{id:'local-chelsea',name:'Chelsea',cash:1400,position:0,token:'kiss'}},owners:{},events:{},romanticInbox:{}};
 async function seed(extra={}){await page.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify(g)),{...base,...extra});await page.reload();await page.locator('.lovo-match-player').first().waitFor();}
 await seed();
 assert.equal(await page.locator('.lovo-match-player').count(),2);
 await page.getByRole('button',{name:'Roll dice',exact:true}).waitFor();
 const cards=await page.locator('.lovo-match-players').boundingBox(), action=await page.locator('.lovo-main-action').boundingBox(),tabs=await page.getByRole('tablist').boundingBox();assert(cards.y<action.y&&action.y<tabs.y);
 for(const name of ['Trade','History','Rules','Properties']){await page.getByRole('tab',{name,exact:true}).click();assert.equal(await page.getByRole('tab',{name,exact:true}).getAttribute('aria-selected'),'true');}
 await page.getByRole('tab',{name:'Properties',exact:true}).press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Trade',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByRole('button',{name:'Leave match'}).click();await page.getByRole('button',{name:'Surrender',exact:true}).click();await page.getByRole('button',{name:'Confirm surrender',exact:true}).waitFor();await page.getByRole('button',{name:'Keep playing',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')).status),'playing');
 await page.getByRole('button',{name:'Leave match'}).click();await page.getByRole('button',{name:'Cancel setup',exact:true}).click();await page.getByRole('button',{name:'Send cancellation request'}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await seed({phase:'purchase'});await page.getByRole('button',{name:'Buy property',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await seed({phase:'end'});await page.getByRole('button',{name:'End turn',exact:true}).click();await page.getByText('Waiting for Chelsea to play',{exact:true}).waitFor();
 await seed({debt:{playerId:'local-rocio',amount:20}});await page.getByRole('button',{name:'Pay debt',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Roll dice',exact:true}).count(),0);
 await seed();await page.getByRole('tab',{name:'Properties',exact:true}).click();await page.locator('.lovo-setup').screenshot({path:'outputs/lovopoly/match-layout-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('.lovo-setup').screenshot({path:'outputs/lovopoly/match-layout-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await seed({owners:{1:'local-rocio',3:'local-rocio',6:'local-rocio'},buildings:{1:2,3:2,6:2}});
 await page.locator('.lovo-property-group').filter({has:page.getByText('Chile',{exact:true})}).locator('summary').click();
 await page.getByRole('button',{name:'Open deed: Costanera Center',exact:true}).click();
 await page.getByRole('dialog',{name:'Costanera Center',exact:true}).waitFor();
 assert.equal(await page.locator('.lovo-rent-ladder .is-current').count(),1);
 assert.match(await page.locator('.lovo-rent-ladder .is-current').innerText(),/2 Love Nests/);
 assert.equal(await page.getByRole('button',{name:'Mortgage +$30',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Build −$50',exact:true}).click();await page.getByRole('dialog',{name:'Build Love Nest',exact:true}).screenshot({path:'outputs/lovopoly/build-confirm-mobile.png'});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.locator('.lovo-deed').isVisible(),true);
 await page.locator('.lovo-deed').screenshot({path:'outputs/lovopoly/deed-refined-mobile.png'});
 await page.getByRole('button',{name:'Close deed',exact:true}).click();
 await page.locator('.lovo-setup').screenshot({path:'outputs/lovopoly/properties-refined-mobile.png'});
 await seed({owners:{12:'local-rocio'}});
 await page.locator('.lovo-property-group').filter({has:page.getByText('Utilities',{exact:true})}).locator('summary').click();
 await page.getByRole('button',{name:/Open deed:/}).first().click();
 assert.equal(await page.getByRole('button',{name:'Build',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Sell',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('.lovo-rent-ladder li').count(),2);
 await page.getByRole('button',{name:'Mortgage +$75',exact:true}).click();
 await page.getByRole('dialog',{name:'Mortgage',exact:true}).getByRole('button',{name:/^Mortgage ·/}).click();
 assert.equal(await page.getByRole('button',{name:'Unmortgage −$83',exact:true}).isVisible(),true);
 await page.getByRole('button',{name:'Close deed',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('Passed: desktop/mobile layout, cards, tabs and keyboard, buy confirmation, end turn, debt controls, leave dialog and dismissal.');
} finally {await browser.close();}


