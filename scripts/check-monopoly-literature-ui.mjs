import { createRequire } from 'node:module';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  await import('/src/features/monopoly/Monopoly.jsx');
  const {default:TilePopup}=await import('/src/features/monopoly/TilePopup.jsx');
  const {updateMonopoly}=await import('/src/features/monopoly/engine.js');
  const {questions}=await import('/src/features/monopoly/literature.js');
  const container=document.createElement('div');container.className='na-monopoly';container.style='max-width:1200px;margin:auto';document.body.replaceChildren(container);const root=createRoot(container);
  let n=0,game;
  const apply=(type,user,extra={})=>updateMonopoly(game,{type,user,id:`trivia-preview-${++n}`,now:n,expectedGameId:game?.id||null,expectedRevision:game?.revision,...extra});
  function Harness({initial}){
   const [g,setGame]=React.useState(initial),[error,setError]=React.useState('');
   window.fixtureGame=g;window.correctOption=questions.find(q=>q.id===g.literatureChallenge.questionId).options[questions.find(q=>q.id===g.literatureChallenge.questionId).answerIndex];
   return React.createElement('div',{className:'na-board'},React.createElement(TilePopup,{game:g,tileId:3,landing:g.lastLanding,userId:g.turn,busy:false,error,onClose:()=>{},onAction:async(type,extra)=>{try{game=g;const next=apply(type,g.players[g.turn],extra);setGame(next);return true;}catch(e){setError(e.message);return false;}}}));
  }
  window.resetTrivia=(kind='purchase')=>{
   game=null;const a={id:'a',name:'Rocio'},b={id:'b',name:'Chelsea'};game=apply('create',a);game=apply('join',b);game=apply('start',a);
   if(kind==='rent'){game.owners[3]=game.order.find(id=>id!==game.turn);game.buildings={3:1};}
   if(kind==='own')game.owners[3]=game.turn;
   game=apply('roll',game.players[game.turn],{dice:[1,2],triviaRoll:0});
   root.render(React.createElement(Harness,{key:game.lastLanding.id,initial:game}));
  };
  window.resetTrivia();
 });
 const challenge=page.getByRole('article',{name:'NA Literature Challenge'});
 await challenge.getByText('Purchase price before challenge: $60',{exact:true}).waitFor();
 if(await page.locator('.na-literature-question').count())throw new Error('Question shown before consent');
 await challenge.getByRole('button',{name:'Accept challenge',exact:true}).click();
 await challenge.getByRole('button',{name:await page.evaluate(()=>window.correctOption),exact:true}).click();
 await page.getByRole('button',{name:'Buy property · $48',exact:true}).waitFor();
 await page.getByRole('button',{name:'Buy property · $48',exact:true}).click();
 if(await page.evaluate(()=>window.fixtureGame.players[window.fixtureGame.turn].cash)!==1452)throw new Error('Discount purchase failed');
 await page.evaluate(()=>window.resetTrivia('rent'));
 await challenge.getByText('Rent due before challenge: $10',{exact:true}).waitFor();
 await challenge.getByRole('button',{name:'Skip · normal price',exact:true}).click();
 if(await page.evaluate(()=>window.fixtureGame.players[window.fixtureGame.turn].cash)!==1490)throw new Error('Skip rent failed');
 if(await page.evaluate(()=>window.fixtureGame.literatureDecks[window.fixtureGame.turn].used.length)!==0)throw new Error('Skipped question was consumed');
 await page.evaluate(()=>window.resetTrivia('own'));await challenge.getByRole('button',{name:'Accept challenge',exact:true}).click();
 const correct=await page.evaluate(()=>window.correctOption);const options=page.locator('.na-literature-question button');
 for(let i=0;i<3;i++){if(await options.nth(i).textContent()!==correct){await options.nth(i).click();break;}}
 await challenge.getByText('Incorrect answer.',{exact:true}).waitFor();if(await page.evaluate(()=>window.fixtureGame.players[window.fixtureGame.turn].cash)!==1450)throw new Error('Own-property penalty failed');
 await page.screenshot({path:'outputs/monopoly/literature-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.resetTrivia());await challenge.getByRole('button',{name:'Accept challenge',exact:true}).click();
 await page.screenshot({path:'outputs/monopoly/literature-mobile.png',fullPage:true});
 const box=await page.locator('.na-landing').boundingBox();if(box.x<0||box.x+box.width>391||box.y<0||box.y+box.height>845)throw new Error('Mobile overflow');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Literature UI passed: displayed price before consent, correct purchase, skip rent, own-property penalty, question availability, mobile fit.');
}finally{await browser.close();}
