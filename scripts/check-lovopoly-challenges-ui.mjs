import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/lovopoly-local');
  await page.evaluate(()=>localStorage.setItem('lovopoly-local-v1',JSON.stringify({id:'escape-ui',revision:0,status:'playing',mode:'classic',phase:'roll',turn:'local-rocio',players:{'local-rocio':{id:'local-rocio',name:'Rocio',cash:1500,position:10,token:'heart',detained:true,detentionId:'ui-stay'},'local-chelsea':{id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'}},events:{}})));
  await page.reload();
  await page.getByRole('button',{name:'Show my three challenges',exact:true}).click();
  const choices=page.getByRole('group',{name:'Choose one challenge',exact:true});
  if(await choices.getByRole('radio').count()!==3)throw new Error('Expected three choices');
  const first=await choices.innerText();await page.reload();
  if(await choices.innerText()!==first)throw new Error('Choices changed on reload');
  await page.setViewportSize({width:390,height:844});
  await choices.getByRole('radio').first().check();
  mkdirSync('outputs/lovopoly',{recursive:true});
  await page.locator('.lovo-escape-choices').screenshot({path:'outputs/lovopoly/escape-choices-mobile.png'});
  await page.getByRole('button',{name:'Send chosen challenge',exact:true}).click();
  if(await page.getByRole('button',{name:'Send chosen challenge',exact:true}).count())throw new Error('Duplicate invitation remains available');
  await page.locator('.lovo-romance-preview').first().click();
  await page.getByRole('textbox',{name:'Your message or response'}).fill('Here is my little romantic response, just for you.');
  await page.getByRole('button',{name:'Submit gesture for confirmation',exact:true}).click();
  await page.getByLabel('Play as').selectOption('local-chelsea');
  await page.getByRole('button',{name:'Confirm completion',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
  if(saved.players['local-rocio'].romanticReleaseId!=='ui-stay' || Object.keys(saved.escapeProgress['local-rocio'].completed).length!==1)throw new Error('Confirmation did not record progress and pending release');
  if(saved.players['local-rocio'].cash!==1500 || !saved.players['local-rocio'].detained)throw new Error('Romantic release applied before next turn');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile page overflow');
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('UI passed: three saved choices, reload stability, mobile selection, single invitation, response/confirmation, completion progress, release waits for next turn.');
}finally{await browser.close();}

