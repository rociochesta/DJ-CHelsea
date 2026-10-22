import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {updateLovopoly} from '../src/utils/lovopoly.js';
import {ensureDecks} from '../src/utils/lovopolyCards.js';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const a={id:'local-rocio',name:'Rocio',cash:1500,position:0,token:'heart'},b={id:'local-chelsea',name:'Chelsea',cash:1500,position:0,token:'kiss'};
let serial=0;
const fixture=()=>({id:`ui-${++serial}`,revision:0,status:'playing',mode:'classic',turn:a.id,phase:'roll',players:{[a.id]:{...a},[b.id]:{...b}},owners:{},events:{}});
const roll=g=>updateLovopoly(g,{type:'roll',user:a,id:`ui-roll-${serial}`,now:Date.now(),expectedGameId:g.id,expectedRevision:g.revision,dice:[1,2]});
await page.goto('http://127.0.0.1:5173/lovopoly-local');
async function load(g){await page.evaluate(g=>localStorage.setItem('lovopoly-local-v1',JSON.stringify(g)),g);await page.reload();}
await load(roll(fixture()));
const landing=page.getByRole('dialog');await landing.waitFor();
await landing.getByRole('button',{name:'Buy property · $60',exact:true}).click();
const confirm=page.getByRole('dialog',{name:'Buy property',exact:true});
await confirm.getByRole('button',{name:'Cancel',exact:true}).click();
await page.getByRole('dialog').getByRole('button',{name:'Buy property · $60',exact:true}).click();
await confirm.getByRole('button',{name:'Buy · $60',exact:true}).click();
if(await page.getByRole('dialog').count())throw new Error('Purchase left a popup open');
const purchased=await page.evaluate(()=>JSON.parse(localStorage.getItem('lovopoly-local-v1')));
if(purchased.owners[3]!==a.id || purchased.players[a.id].cash!==1440)throw new Error('Purchase not saved');
await page.reload();if(await page.getByRole('dialog').count())throw new Error('Purchased landing reopened');
console.log('Passed: cancel preserves landing; confirmed purchase saves and closes both dialogs; reload stays closed.');}finally{await browser.close();}
