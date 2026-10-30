import {createRequire} from 'node:module';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {default:Monopoly}=await import('/src/features/monopoly/Monopoly.jsx');
  const {updateMonopoly}=await import('/src/features/monopoly/engine.js');
  const container=document.createElement('div');container.style='max-width:1200px;margin:auto';document.body.replaceChildren(container);const root=createRoot(container);
  let n=0;
  window.showLanding=(kind,spectator=false)=>{
   let game=null;const a={id:'a',name:'Rocio'},b={id:'b',name:'Chelsea'};
   const act=(type,user,extra={})=>{game=updateMonopoly(game,{type,user,id:`fixture-${++n}`,now:n,expectedGameId:game?.id||null,expectedRevision:game?.revision,...extra});};
   act('create',a);act('join',b);act('start',a);const player=game.players[game.turn];
   if(kind==='chance'){game.decks.chance=['chance-service'];act('roll',player,{dice:[3,4]});}
   else if(kind==='community'){game.decks.community=['community-welcome'];act('roll',player,{dice:[1,1]});}
   else if(kind==='detention'){player.position=23;act('roll',player,{dice:[3,4]});}
   else act('roll',player,{dice:[1,2]});
   root.render(React.createElement(Monopoly,{roomCode:'PREVIEW',currentUser:spectator?{id:'observer',name:'Observer'}:player,game,participants:game.players}));
  };
  window.showLanding('property');
 });
 let panel=page.locator('.na-landing');await panel.waitFor();await panel.getByRole('button',{name:'Buy property · $60',exact:true}).waitFor();
 const box=await panel.boundingBox(),board=await page.locator('.na-board').boundingBox();if(box.x<board.x||box.x+box.width>board.x+board.width+1)throw new Error('Popup outside board');
 await page.screenshot({path:'outputs/monopoly/landing-property.png',fullPage:true});
 await page.keyboard.press('Escape');if(await panel.count())throw new Error('Escape did not close');
 await page.getByRole('button',{name:'View landing',exact:true}).click();await panel.waitFor();
 await page.evaluate(()=>window.showLanding('chance'));await panel.getByText('Service visit',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'Next · The Amends Department',exact:true}).click();await panel.getByRole('button',{name:'Buy property · $200',exact:true}).waitFor();
 await page.evaluate(()=>window.showLanding('community'));await panel.getByText('Welcome fund',{exact:true}).waitFor();
 await page.screenshot({path:'outputs/monopoly/landing-community.png',fullPage:true});
 await page.evaluate(()=>window.showLanding('detention'));await panel.getByRole('button',{name:'Next · Ego',exact:true}).click();await panel.getByRole('heading',{name:'Ego',exact:true}).waitFor();
 await page.evaluate(()=>window.showLanding('property',true));await panel.getByRole('heading',{name:'The Awkward Hug',exact:true}).waitFor();if(await panel.getByRole('button',{name:/Buy property/}).count())throw new Error('Spectator may purchase');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/monopoly/landing-mobile.png',fullPage:true});
 const mobile=await panel.boundingBox();if(mobile.x<0||mobile.x+mobile.width>390||mobile.height>844||mobile.y<0||mobile.y+mobile.height>845)throw new Error('Mobile popup overflow');
 if(errors.length)throw new Error(errors.join('\n'));console.log('Landing UI passed: automatic open, card movement sequence, detention, spectator permissions, reopen, Escape and mobile fit.');
}finally{await browser.close();}
