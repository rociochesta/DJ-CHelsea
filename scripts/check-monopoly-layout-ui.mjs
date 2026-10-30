import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['HostView','ParticipantView']){
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(async view=>{
   const React=(await import('/node_modules/.vite/deps/react.js')).default;
   const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
   const {default:View}=await import(`/src/components/${view}.jsx`);
   const root=document.createElement('div');document.body.replaceChildren(root);
   createRoot(root).render(React.createElement(View,{roomCode:'LAYOUTPREVIEW',currentUser:{id:'preview',name:'Preview'},roomState:{mode:'dj',roomMode:'dj',hostId:'preview',participants:{preview:{id:'preview',name:'Preview'}}},onCloseRoom:()=>{}}));
  },view);
  await page.getByRole('button',{name:'NA Monopoly · 2–8 online players',exact:true}).click();
  await page.getByRole('heading',{name:'NA Monopoly',exact:true}).waitFor();
  const toggle=page.getByRole('button',{name:'← Games · Queue · Search',exact:true});
  if(await toggle.getAttribute('aria-expanded')!=='false')throw new Error('Tools should start collapsed');
  const board=await page.locator('.na-room-board').boundingBox(),rail=await toggle.boundingBox();
  if(rail.x<board.x+board.width-1)throw new Error('Rail is not right of the board');
  if(await page.locator('.na-tile').count()!==40)throw new Error('Missing board tiles');
  await toggle.click();
  await page.getByRole('button',{name:'→ Close',exact:true}).waitFor();
  if(!await page.getByRole('button',{name:'NA Monopoly · 2–8 online players',exact:true}).isVisible())throw new Error('Games not available in side panel');
  await page.getByRole('button',{name:'→ Close',exact:true}).click();
  mkdirSync('outputs/monopoly',{recursive:true});await page.screenshot({path:`outputs/monopoly/${view}-focused.png`,fullPage:true});
  await page.getByRole('button',{name:'← Back to room',exact:true}).click();
  if(await page.locator('.na-room-board').count())throw new Error('Board did not close');
  await page.getByRole('button',{name:'NA Monopoly · 2–8 online players',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
  await page.getByRole('button',{name:'← Games · Queue · Search',exact:true}).click();
  await page.getByRole('button',{name:'→ Close',exact:true}).click();
  await page.getByRole('button',{name:'← Back to room',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Host and participant: open centrally, collapsed right rail, expand/collapse, back to room, mobile overflow checks passed.');
}finally{await browser.close();}
