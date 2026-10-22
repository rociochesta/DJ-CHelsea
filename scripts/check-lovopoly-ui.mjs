import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.env.LOVO_NODE_MODULES + '/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({headless:true, channel:'msedge'});
const page = await browser.newPage({viewport:{width:1645,height:1100}});
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/lovopoly-local');
await page.evaluate(() => localStorage.setItem('lovopoly-local-v1',JSON.stringify({id:'visual-test',revision:0,status:'playing',mode:'quick',roundLimit:20,turn:'local-rocio',phase:'roll',players:{'local-rocio':{id:'local-rocio',name:'Rocio',token:'heart',position:18,cash:1500},'local-chelsea':{id:'local-chelsea',name:'Chelsea',token:'kiss',position:19,cash:1500}},owners:{1:'local-rocio',3:'local-rocio',6:'local-rocio',8:'local-chelsea'},events:{}})));
await page.reload();
await page.getByRole('button',{name:'Mortgage +$30',exact:true}).first().click();
await page.getByRole('button',{name:'Repay $33',exact:true}).waitFor();
await page.getByText('Trade or send a gift',{exact:true}).click();
await page.getByRole('group',{name:'You give',exact:true}).getByLabel('Money $').fill('50');
await page.getByRole('button',{name:'Send offer',exact:true}).click();
// Reproduce Realtime Database's removal of empty arrays, rather than relying
// on localStorage's JSON serialization, which preserves them.
async function firebaseGiftRoundtrip(){
  await page.evaluate(()=>{const g=JSON.parse(localStorage.getItem('lovopoly-local-v1'));for(const trade of Object.values(g.trades||{}))for(const side of [trade.give,trade.receive])if(side?.properties?.length===0)delete side.properties;localStorage.setItem('lovopoly-local-v1',JSON.stringify(g));});
  await page.reload();
}
await firebaseGiftRoundtrip();
await page.getByLabel('Play as').selectOption('local-chelsea');
await page.getByRole('button',{name:'Accept',exact:true}).click();
await page.locator('.lovo-economy .lovo-property').filter({hasText:'accepted'}).waitFor();
await firebaseGiftRoundtrip();
await page.locator('.lovo-economy .lovo-property').filter({hasText:'accepted'}).waitFor();
await page.getByLabel('Play as').selectOption('local-chelsea');
if(await page.locator('.lovo-tile').count() !== 40) throw new Error('Expected 40 spaces');
mkdirSync('outputs/lovopoly',{recursive:true});
await page.screenshot({path:'outputs/lovopoly/desktop.png',fullPage:true});
await page.getByRole('button',{name:'Space 18: Midnight Spicy',exact:false}).click();
await page.getByRole('dialog').waitFor();
await page.screenshot({path:'outputs/lovopoly/deed.png'});
await page.getByRole('button',{name:'Close deed'}).click();
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'outputs/lovopoly/mobile.png',fullPage:true});
const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
await page.getByRole('button',{name:'Surrender',exact:true}).click();
await page.getByRole('button',{name:'Keep playing',exact:true}).click();
if(await page.getByRole('button',{name:'Confirm surrender',exact:true}).count()) throw new Error('Surrender confirmation did not close');
await page.getByRole('button',{name:'Surrender',exact:true}).click();
await page.getByRole('button',{name:'Confirm surrender',exact:true}).click();
await page.getByRole('heading',{name:'Match complete',exact:true}).waitFor();
await page.reload();
await page.getByText('Chelsea surrendered. Rocio wins.',{exact:true}).first().waitFor();
if(await page.getByRole('button',{name:'Surrender',exact:true}).count()) throw new Error('Surrender remains available after finish');
await page.getByRole('button',{name:'Request rematch',exact:true}).click();
await page.getByLabel('Play as').selectOption('local-chelsea');
await page.getByRole('button',{name:'Accept rematch',exact:true}).click();
await page.getByRole('button',{name:'Roll to choose first player',exact:true}).waitFor();
const rematch=await page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
if(rematch.players['local-rocio'].cash!==1500 || rematch.players['local-chelsea'].cash!==1500 || rematch.status!=='opening') throw new Error('Rematch was not reset correctly');
await page.getByText('Previous matches',{exact:true}).click();
await page.getByText('Chelsea surrendered. Rocio wins.',{exact:true}).waitFor();
if(overflow || errors.length) throw new Error(JSON.stringify({overflow,errors}));
console.log('Browser checks passed: mortgage, gift acceptance, 40 spaces, deed, mobile overflow, no runtime errors.');
await browser.close();

