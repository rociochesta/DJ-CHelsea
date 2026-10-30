import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
const page=await browser.newPage({viewport:{width:1400,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(resolve('outputs/animation-preview.html')).href);
const sources=readdirSync('assets/Tiles',{recursive:true}).filter(f=>f.endsWith('.svg')&&!/Asset 1/i.test(f)).map(f=>({name:f,text:readFileSync('assets/Tiles/'+f,'utf8')}));
const failures=await page.evaluate(files=>files.flatMap(f=>{try{const info=inspect(f.text);compileLayer({text:f.text,start:1,duration:3,loop:true});return [];}catch(e){return [f.name+': '+e.message];}}),sources);assert.deepEqual(failures,[]);
await page.locator('#baseFile').setInputFiles('assets/Tiles/18x/Asset 1.svg');
await page.locator('#layerFiles').setInputFiles(['assets/Tiles/18x/midnight-spicy-overlay.svg','assets/Tiles/10/kiss-detention-gate.svg']);
await page.locator('.layer').nth(1).waitFor();await page.locator('.layer').first().locator('input[type=number]').first().fill('1');await page.locator('.layer').first().locator('input[type=number]').first().dispatchEvent('change');
await page.locator('.layer').first().locator('input[type=checkbox]').nth(1).check();await page.locator('#replay').click();
const output=await page.evaluate(()=>compose());assert.ok(output.includes('keyTimes='));assert.ok(!output.includes('blob:'));
const projectDownload=page.waitForEvent('download');await page.locator('#project').click();const project=await projectDownload;await project.saveAs('artifacts/animation-editor-project.json');
await page.locator('#clear').click();await page.locator('#projectFile').setInputFiles('artifacts/animation-editor-project.json');await page.locator('.layer').nth(1).waitFor();assert.equal(await page.locator('.layer').first().locator('input[type=number]').first().inputValue(),'1');
const downloaded=page.waitForEvent('download');await page.locator('#export').click();const exported=await downloaded;await exported.saveAs('artifacts/compiled-overlay.svg');
await page.screenshot({path:'artifacts/animation-editor-desktop.png'});
// Verify the exported standalone SVG actually delays, moves and freezes (no editor timers).
const snapshots=await page.evaluate(async()=>{
const test='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="20" height="20" fill="red"><animate attributeName="x" from="0" to="80" dur="1s" fill="freeze"/></rect></svg>';
base={width:100,height:100};layers=[{text:test,start:.4,duration:.8,loop:false,visible:true}];
const img=new Image();img.src=svgData(compose());await img.decode();document.body.replaceChildren(img);return true;
});
await page.waitForTimeout(100);const first=await page.locator('img').screenshot();await page.waitForTimeout(550);const moving=await page.locator('img').screenshot();await page.waitForTimeout(800);const last=await page.locator('img').screenshot();await page.waitForTimeout(400);const frozen=await page.locator('img').screenshot();
assert.notDeepEqual(first,moving);assert.notDeepEqual(moving,last);assert.deepEqual(last,frozen);assert.deepEqual(errors,[]);

for(const css of [false,true]){
await page.evaluate(css=>{
const motion=css?'<style>rect{animation:move 1s linear both}@keyframes move{from{transform:translateX(0)}to{transform:translateX(80px)}}</style>':'<animate attributeName="x" from="0" to="80" dur="1s" fill="freeze"/>';
const text='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+(css?motion:'')+'<rect width="20" height="20" fill="red">'+(css?'':motion)+'</rect></svg>';
layers=[{text,start:0,duration:.8,loop:true,visible:true}];const img=new Image();img.src=svgData(compose());document.body.replaceChildren(img);
},css);
await page.waitForTimeout(1100);const a=await page.locator('img').screenshot();await page.waitForTimeout(250);const b=await page.locator('img').screenshot();assert.notDeepEqual(a,b,css?'CSS loop stopped':'SMIL loop stopped');
}
console.log(`Passed ${sources.length} source SVGs, CSS/SMIL compilation, project round-trip, SVG export, delayed playback and final-frame freeze.`);
}finally{await browser.close();}

