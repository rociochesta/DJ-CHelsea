import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default;const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
 const {default:Monopoly}=await import('/src/features/monopoly/Monopoly.jsx');const {updateMonopoly}=await import('/src/features/monopoly/engine.js');
 let n=0,g=null;const players=Array.from({length:8},(_,i)=>({id:`preview${i}`,name:['Rocio','Chelsea','Alex','Sam','Taylor','Jordan','Morgan','Jamie'][i]}));
 const act=(type,user)=>{g=updateMonopoly(g,{type,user,id:`preview-action${++n}`,now:n,expectedGameId:g?.id||null,expectedRevision:g?.revision});};
 act('create',players[0]);players.slice(1).forEach(p=>act('join',p));act('start',players[0]);
 const container=document.createElement('div');container.id='monopoly-preview';container.style='max-width:1100px;margin:20px auto;padding:12px';document.body.replaceChildren(container);
 createRoot(container).render(React.createElement(Monopoly,{roomCode:'PREVIEW',currentUser:g.players[g.turn],game:g,participants:Object.fromEntries(players.map(p=>[p.id,p]))}));
});
await page.getByRole('heading',{name:'NA Monopoly',exact:true}).waitFor();
if(await page.locator('.na-tile').count()!==40)throw new Error('Expected 40 tiles');
await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.na-tile-art img')];return images.length===40&&images.every(img=>img.complete&&img.naturalWidth>0);});
if(await page.locator('.na-players li').count()!==8)throw new Error('Expected 8 players');
await page.locator('.na-tile').nth(1).click();await page.locator('.na-landing').waitFor();
mkdirSync('outputs/monopoly',{recursive:true});await page.screenshot({path:'outputs/monopoly/desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/monopoly/mobile.png',fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile page overflow');
if(errors.length)throw new Error(errors.join('\n'));
console.log('UI passed: 40 tiles, eight players, property details, mobile containment, no runtime errors.');
}finally{await browser.close();}


