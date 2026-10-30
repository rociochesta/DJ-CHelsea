import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.LOVO_NODE_MODULES+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve('outputs/animation-preview.html')).href);
 await page.locator('#baseFile').setInputFiles('assets/Tiles/18x/Asset 1.svg');
 await page.locator('#layerFiles').setInputFiles('assets/Tiles/18x/midnight-spicy-overlay.svg');
 await page.getByRole('button',{name:'Seleccionar en lienzo'}).click();
 const before=await page.locator('.canvas-layer.active').boundingBox();
 await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
 await page.mouse.move(before.x+before.width/2+30,before.y+before.height/2+20,{steps:4});await page.mouse.up();
 const moved=await page.evaluate(()=>layout(layers[0]));assert.ok(moved.x>0&&moved.y>0);
 const corner=await page.locator('.resize.nw').boundingBox();
 await page.mouse.move(corner.x+7,corner.y+7);await page.mouse.down();await page.keyboard.down('Shift');await page.mouse.move(corner.x+37,corner.y+27);await page.mouse.up();await page.keyboard.up('Shift');
 const resized=await page.evaluate(()=>layout(layers[0]));assert.ok(resized.w<100);assert.equal(resized.w,resized.h);
 await page.locator('.canvas-layer.active').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>layout(layers[0]).x),resized.x+1);
 for(const name of ['Mover','Color','Resplandor','Pulso','Aparecer'])await page.getByLabel(name,{exact:true}).check();
 const svg=await page.evaluate(()=>compose());assert.ok(svg.includes('feDropShadow'));assert.ok(svg.includes('feFlood'));assert.ok(svg.includes('attributeName="width"'));assert.ok(!svg.includes('parsererror'));
 const download=page.waitForEvent('download');await page.locator('#project').click();await (await download).saveAs('artifacts/animation-canvas-project.json');
 const saved=await page.evaluate(()=>JSON.stringify(layers));await page.locator('#clear').click();await page.locator('#projectFile').setInputFiles('artifacts/animation-canvas-project.json');
 assert.equal(await page.evaluate(()=>JSON.stringify(layers)),saved);
 await page.getByRole('button',{name:'Seleccionar en lienzo'}).click();
 await page.screenshot({path:'artifacts/animation-canvas-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/animation-canvas-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('Passed canvas drag, proportional resize, keyboard movement, combined SVG effects, project round-trip and mobile width.');
}finally{await browser.close();}

