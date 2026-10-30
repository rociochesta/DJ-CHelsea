const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
let base=null,layers=[],previewURL=null;
let selected=null;
const layout=l=>({x:0,y:0,w:100,h:100,...l.layout});
function animate(doc,parent,attribute,values,layer){
 const a=doc.createElementNS(NS,'animate');
 for(const [k,v] of Object.entries({attributeName:attribute,values,dur:`${layer.duration}s`,begin:`${layer.start}s`,repeatCount:layer.loop?'indefinite':'1',fill:'freeze'}))a.setAttribute(k,v);
 parent.append(a);return a;
}
const xml=new XMLSerializer();
const seconds=value=>{
 const match=String(value || '0').trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(ms|s)?$/);
 if(!match)throw Error(`Tiempo SVG no compatible: ${value}`);
 return Number(match[1])/(match[2]==='ms'?1000:1);
};
const svgData=text=>'data:image/svg+xml;base64,'+btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(''));
function parseSVG(text){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror') || doc.documentElement.localName!=='svg')throw Error('El archivo no es un SVG válido.');
 doc.querySelectorAll('script,foreignObject').forEach(el=>el.remove());
 for(const el of doc.querySelectorAll('*'))for(const attr of [...el.attributes]){
  if(/^on/i.test(attr.name))el.removeAttribute(attr.name);
  if(/^(href|xlink:href)$/i.test(attr.name)&&!attr.value.startsWith('#')&&!attr.value.startsWith('data:'))throw Error('El SVG contiene un recurso externo. Incrústalo antes de cargarlo.');
 }
 return doc;
}
function cssInfo(doc){
 const sheets=[...doc.querySelectorAll('style')].map(el=>{const sheet=new CSSStyleSheet();sheet.replaceSync(el.textContent);return {el,sheet};});
 const rules=[];const frames=new Map();
 function walk(list){for(const rule of list){if(rule.type===CSSRule.KEYFRAMES_RULE)frames.set(rule.name,rule);else if(rule.type===CSSRule.STYLE_RULE)rules.push(rule);else if(rule.cssRules)walk(rule.cssRules);}}
 sheets.forEach(s=>walk(s.sheet.cssRules));
 for(const el of doc.querySelectorAll('[style]'))rules.push({style:el.style});
 const animations=[];
 for(const rule of rules){const style=rule.style;const names=style.animationName.split(',').map(s=>s.trim());
  names.forEach((name,i)=>{if(!name||name==='none')return;
   const list=key=>style[key].split(',').map(s=>s.trim());
   const duration=list('animationDuration'),delay=list('animationDelay');
   animations.push({style,name,index:i,duration:seconds(duration[i%duration.length]),delay:seconds(delay[i%delay.length]),frames:frames.get(name)});
  });
 }
 return {sheets,animations};
}
function inspect(text){
 const doc=parseSVG(text),css=cssInfo(doc);
 const smil=[...doc.querySelectorAll('animate,animateTransform,animateMotion,set')];
 let duration=0;
 for(const el of smil){const dur=el.getAttribute('dur');if(dur==='indefinite')throw Error('Una animación tiene duración indefinida. Asígnale segundos en el SVG original.');duration=Math.max(duration,Math.max(0,seconds(el.getAttribute('begin')))+seconds(dur));}
 for(const a of css.animations)duration=Math.max(duration,Math.max(0,a.delay)+a.duration);
 return {doc,css,smil,duration:duration || 4};
}
function compileLayer(layer){
 const {doc,css,smil,duration}=inspect(layer.text),root=doc.documentElement;
 const scope='layer-'+crypto.randomUUID();
 const scale=layer.duration/duration;
 // Pad every SMIL movement to the layer's cycle; no event handlers are needed.
 for(const el of smil){const delay=Math.max(0,seconds(el.getAttribute('begin')));
  const originalDuration=seconds(el.getAttribute('dur'));
  let values=el.getAttribute('values')?.split(';');
  if(!values&&el.hasAttribute('from')&&el.hasAttribute('to'))values=[el.getAttribute('from'),el.getAttribute('to')];
  if(values&&values.length>1){
   const times=(el.getAttribute('keyTimes')?.split(';').map(Number)||values.map((_,i)=>i/(values.length-1))).map(t=>(delay+t*originalDuration)/duration);
   const splines=el.getAttribute('keySplines')?.split(';');
   if(times[0]>0){times.unshift(0);values.unshift(values[0]);splines?.unshift('0 0 1 1');}
   if(times.at(-1)<1){times.push(1);values.push(values.at(-1));splines?.push('0 0 1 1');}
   el.setAttribute('values',values.join(';'));el.setAttribute('keyTimes',times.join(';'));el.removeAttribute('from');el.removeAttribute('to');
   if(splines)el.setAttribute('keySplines',splines.join(';'));
   if(el.getAttribute('calcMode')==='paced')el.setAttribute('calcMode','linear');
   el.setAttribute('begin',`${layer.start}s`);el.setAttribute('dur',`${layer.duration}s`);
  }else{el.setAttribute('begin',`${layer.start+delay*scale}s`);if(el.hasAttribute('dur'))el.setAttribute('dur',`${Math.max(.001,originalDuration*scale)}s`);}
  el.setAttribute('repeatCount',layer.loop?'indefinite':'1');el.removeAttribute('repeatDur');el.removeAttribute('end');el.setAttribute('fill','freeze');
 }
 // Pad CSS keyframes to a full layer cycle so staggered CSS and SMIL stay aligned.
 const added=[];const grouped=new Map();
 for(const a of css.animations){
  if(!a.frames)throw Error(`No se encontraron los fotogramas de ${a.name}.`);
  const name=`${scope}_${added.length}_${a.name}`;const frames=[];
  for(const f of a.frames.cssRules)for(const key of f.keyText.split(',')){
   const percent=key.trim()==='from'?0:key.trim()==='to'?100:parseFloat(key);
   frames.push({at:Math.min(100,Math.max(0,(Math.max(0,a.delay)+a.duration*percent/100)/duration*100)),body:f.style.cssText});
  }
  frames.sort((a,b)=>a.at-b.at);
  if(frames[0]?.at>0)frames.unshift({at:0,body:frames[0].body});
  if(frames.at(-1)?.at<100)frames.push({at:100,body:frames.at(-1).body});
  added.push(`@keyframes ${name}{${frames.map(f=>`${f.at}%{${f.body}}`).join('')}}`);
  if(!grouped.has(a.style))grouped.set(a.style,[]);grouped.get(a.style).push({...a,newName:name});
 }
 for(const [style,entries] of grouped){
  const names=style.animationName.split(',');entries.forEach(a=>names[a.index]=a.newName);
  style.animationName=names.join(',');style.animationDuration=`${layer.duration}s`;style.animationDelay=`${layer.start}s`;style.animationIterationCount=layer.loop?'infinite':'1';style.animationFillMode='both';
 }
 const scopeRules=rules=>{for(const rule of rules){if(rule.type===CSSRule.STYLE_RULE)rule.selectorText=rule.selectorText.split(',').map(s=>`#${scope} ${s.trim()}`).join(',');else if(rule.type!==CSSRule.KEYFRAMES_RULE&&rule.cssRules)scopeRules(rule.cssRules);}};
 for(const {el,sheet} of css.sheets){scopeRules(sheet.cssRules);el.textContent=[...sheet.cssRules].map(r=>r.cssText).join('\n');}
 if(added.length){const style=doc.createElementNS(NS,'style');style.textContent=added.join('\n');root.append(style);}
 // Inline SVGs share a document: isolate IDs, paint servers and SMIL references.
 const ids=[...root.querySelectorAll('[id]')].map(el=>el.id);
 let output=xml.serializeToString(root);
 for(const id of ids){const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  output=output.replaceAll(`id="${id}"`,`id="${scope}-${id}"`)
   .replace(new RegExp(`#${escaped}(?=[\\s)"';,{.:>\\[]|$)`,'g'),`#${scope}-${id}`)
   .replace(new RegExp(`(?<=[";\\s])${escaped}\\.(begin|end|repeat)`,'g'),`${scope}-${id}.$1`);
 }
 const isolated=parseSVG(output).documentElement;isolated.setAttribute('id',scope);
 return xml.serializeToString(isolated);
}
function compose(includeBase=false){
 if(!base)throw Error('Selecciona un fondo primero.');
 const doc=document.implementation.createDocument(NS,'svg');const root=doc.documentElement;
 root.setAttribute('width',base.width);root.setAttribute('height',base.height);root.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
 const addImage=(href)=>{const img=doc.createElementNS(NS,'image');img.setAttribute('width','100%');img.setAttribute('height','100%');img.setAttribute('preserveAspectRatio','none');img.setAttribute('href',href);root.append(img);return img;};
 if(includeBase)addImage(base.data);
 for(const layer of layers.filter(l=>l.visible)){
  if(!Number.isFinite(layer.start)||layer.start<0||!Number.isFinite(layer.duration)||layer.duration<=0)throw Error('El inicio debe ser 0 o más, y la duración mayor que 0.');
  const box=layout(layer),fx=layer.effects||{};
  const group=doc.createElementNS(NS,'g');root.append(group);
  const img=doc.importNode(parseSVG(compileLayer(layer)).documentElement,true);group.append(img);
  img.setAttribute('x',box.x*base.width/100);img.setAttribute('y',box.y*base.height/100);
  img.setAttribute('width',box.w*base.width/100);img.setAttribute('height',box.h*base.height/100);img.setAttribute('preserveAspectRatio','none');img.setAttribute('opacity','0');
  if(fx.move){animate(doc,img,'x',`${box.x*base.width/100};${(box.x+Number(fx.dx||0))*base.width/100};${box.x*base.width/100}`,layer);animate(doc,img,'y',`${box.y*base.height/100};${(box.y+Number(fx.dy||0))*base.height/100};${box.y*base.height/100}`,layer);}
  if(fx.pulse){for(const [attr,value] of [['width',box.w*base.width/100],['height',box.h*base.height/100]])animate(doc,img,attr,`${value};${value*1.08};${value}`,layer);for(const [attr,value,size] of [['x',box.x*base.width/100,box.w*base.width/100],['y',box.y*base.height/100,box.h*base.height/100]])if(!fx.move)animate(doc,img,attr,`${value};${value-size*.04};${value}`,layer);}
  if(fx.fade)animate(doc,group,'opacity','0;1;1',layer);
  if(fx.glow||fx.color){
   const filter=doc.createElementNS(NS,'filter'),id='fx-'+crypto.randomUUID();filter.id=id;filter.setAttribute('x','-100%');filter.setAttribute('y','-100%');filter.setAttribute('width','300%');filter.setAttribute('height','300%');root.append(filter);group.setAttribute('filter',`url(#${id})`);
   const node=(name,attrs)=>{const n=doc.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);filter.append(n);return n;};
   let source='SourceGraphic';
   if(fx.color){node('feFlood',{'flood-color':fx.tint||'#ff62b2',result:'tint'});node('feComposite',{in:'tint',in2:'SourceAlpha',operator:'in',result:'paint'});const mix=node('feComposite',{in:'paint',in2:'SourceGraphic',operator:'arithmetic',k2:0,k3:1,result:'colored'});animate(doc,mix,'k2','0;1;0',layer);animate(doc,mix,'k3','1;0;1',layer);source='colored';}
   if(fx.glow){const glow=node('feDropShadow',{in:source,dx:0,dy:0,stdDeviation:2,'flood-color':fx.tint||'#ff62b2','flood-opacity':.8});animate(doc,glow,'stdDeviation','1;8;1',layer);}
  }
  const show=doc.createElementNS(NS,'set');show.setAttribute('attributeName','opacity');show.setAttribute('to','1');show.setAttribute('begin',`${layer.start}s`);show.setAttribute('fill','freeze');img.append(show);
 }
 return xml.serializeToString(root);
}
function replay(){try{const result=compose();if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(new Blob([result],{type:'image/svg+xml'}));$('overlay').src=previewURL;drawCanvas();$('status').textContent='Reproduciendo desde 0 s. Los cambios se guardan al descargar el proyecto.';}catch(e){$('status').textContent=e.message;}}
function render(){
 $('layers').replaceChildren();
 layers.forEach((layer,index)=>{
  const card=document.createElement('div');card.className='layer';
  card.classList.toggle('selected',selected===layer);
  const select=document.createElement('button');select.textContent=selected===layer?'Capa seleccionada':'Seleccionar en lienzo';select.onclick=()=>{selected=layer;render();drawCanvas();};card.append(select);
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=layer.visible;check.onchange=()=>{layer.visible=check.checked;replay();};label.append(check,document.createTextNode(' '+layer.name));card.append(label);
  const controls=document.createElement('div');controls.className='controls';
  for(const [key,title,min] of [['start','Inicio (s)',0],['duration','Duración (s)',.1]]){const label=document.createElement('label'),input=document.createElement('input');input.type='number';input.min=min;input.step=.1;input.value=layer[key];input.setAttribute('aria-label',`${title}: ${layer.name}`);input.onchange=()=>{layer[key]=Number(input.value);replay();};label.append(document.createTextNode(title),input);controls.append(label);}
  const loopLabel=document.createElement('label'),loop=document.createElement('input');loop.type='checkbox';loop.checked=layer.loop;loop.onchange=()=>{layer.loop=loop.checked;replay();};loopLabel.append(loop,document.createTextNode(' Loop'));controls.append(loopLabel);card.append(controls);
  const position=document.createElement('div');position.className='controls';
  for(const [key,title] of [['x','X (%)'],['y','Y (%)'],['w','Ancho (%)'],['h','Alto (%)']]){const label=document.createElement('label'),input=document.createElement('input');input.type='number';input.step='.1';input.value=layout(layer)[key];input.setAttribute('aria-label',`${title}: ${layer.name}`);if(key==='w'||key==='h')input.min=1;input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value)||((key==='w'||key==='h')&&value<1))return;layer.layout={...layout(layer),[key]:value};replay();};label.append(title,input);position.append(label);}card.append(position);
  const reset=document.createElement('button');reset.textContent='Ajustar al fondo';reset.onclick=()=>{layer.layout={x:0,y:0,w:100,h:100};render();replay();};card.append(reset);
  layer.effects ||= {};
  const effects=document.createElement('div');effects.className='controls';
  for(const [key,title] of [['move','Mover'],['color','Color'],['glow','Resplandor'],['pulse','Pulso'],['fade','Aparecer']]){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!!layer.effects[key];input.onchange=()=>{layer.effects[key]=input.checked;replay();};label.append(input,title);effects.append(label);}
  for(const [key,title,type,value] of [['tint','Color del efecto','color','#ff62b2'],['dx','Mover X (%)','number',0],['dy','Mover Y (%)','number',-5]]){const label=document.createElement('label'),input=document.createElement('input');input.type=type;input.value=layer.effects[key]??value;layer.effects[key]=input.value;input.setAttribute('aria-label',`${title}: ${layer.name}`);input.onchange=()=>{layer.effects[key]=type==='number'?Number(input.value):input.value;replay();};label.append(title,input);effects.append(label);}card.append(effects);
  for(const [label,delta] of [['Subir',-1],['Bajar',1]]){const button=document.createElement('button');button.textContent=label;button.disabled=index+delta<0||index+delta>=layers.length;button.onclick=()=>{[layers[index],layers[index+delta]]=[layers[index+delta],layers[index]];render();replay();};card.append(button);}
  $('layers').append(card);
 });
}
function showBase(){if(!base)return;$('base').src=base.data;$('art').hidden=false;$('empty').hidden=true;}
function drawCanvas(){
 $('canvasControls')?.remove();if(!base)return;
 const canvas=document.createElement('div');canvas.id='canvasControls';$('art').append(canvas);
 for(const layer of layers.filter(l=>l.visible)){
  const box=layout(layer),target=document.createElement('div');target.className='canvas-layer'+(selected===layer?' active':'');
  Object.assign(target.style,{left:box.x+'%',top:box.y+'%',width:box.w+'%',height:box.h+'%'});
  target.tabIndex=0;target.setAttribute('role','button');target.setAttribute('aria-label','Mover '+layer.name);target.title=layer.name;
  if(selected===layer){for(const corner of ['nw','ne','sw','se']){const handle=document.createElement('span');handle.className='resize '+corner;handle.dataset.corner=corner;target.append(handle);}}
  target.onkeydown=e=>{const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!directions[e.key])return;e.preventDefault();selected=layer;const [x,y]=directions[e.key],b=layout(layer);layer.layout={...b,x:b.x+x*(e.shiftKey?5:1),y:b.y+y*(e.shiftKey?5:1)};render();replay();$('canvasControls').children[layers.filter(l=>l.visible).indexOf(layer)]?.focus();};
  target.onpointerdown=e=>{
   if(e.button!==0)return;e.preventDefault();e.stopPropagation();selected=layer;render();
   const corner=e.target.dataset.corner,rect=$('art').getBoundingClientRect(),start=layout(layer),px=e.clientX,py=e.clientY;
   target.setPointerCapture(e.pointerId);
   target.onpointermove=event=>{const dx=(event.clientX-px)/rect.width*100,dy=(event.clientY-py)/rect.height*100;let b={...start};
    if(!corner){b.x+=dx;b.y+=dy;}else{const west=corner.includes('w'),north=corner.includes('n');b.w=Math.max(1,start.w+(west?-dx:dx));b.h=Math.max(1,start.h+(north?-dy:dy));if(event.shiftKey)b.h=b.w*start.h/start.w;if(west)b.x=start.x+start.w-b.w;if(north)b.y=start.y+start.h-b.h;}
    layer.layout=b;Object.assign(target.style,{left:b.x+'%',top:b.y+'%',width:b.w+'%',height:b.h+'%'});
    // Refresh the artwork while preserving the captured pointer and drag target.
    try{const result=compose();if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(new Blob([result],{type:'image/svg+xml'}));$('overlay').src=previewURL;}catch(error){$('status').textContent=error.message;}
   };
   const finish=()=>{target.onpointermove=null;target.onpointerup=null;target.onpointercancel=null;render();replay();};target.onpointerup=finish;target.onpointercancel=finish;
  };
  canvas.append(target);
 }
 // The selected layer stays reachable even underneath another overlay.
 const active=canvas.querySelector('.active');if(active)canvas.append(active);
}
async function loadBase(file){
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
 let width,height,normalized=data;
 if(/\.svg$/i.test(file.name)){const doc=parseSVG(await file.text()),root=doc.documentElement;const box=root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);width=box?.[2]||parseFloat(root.getAttribute('width'));height=box?.[3]||parseFloat(root.getAttribute('height'));root.setAttribute('width',width);root.setAttribute('height',height);normalized=svgData(xml.serializeToString(root));}
 else {const img=new Image();img.src=data;await img.decode();width=img.naturalWidth;height=img.naturalHeight;}
 if(!(width>0&&height>0))throw Error('El fondo necesita un viewBox o dimensiones válidas.');
 base={name:file.name,data:normalized,width,height};showBase();replay();
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const handle=fn=>async()=>{try{await fn();}catch(e){$('status').textContent=e.message;}};
$('baseFile').onchange=handle(async()=>{if($('baseFile').files[0])await loadBase($('baseFile').files[0]);});
$('layerFiles').onchange=handle(async()=>{const next=[];for(const file of $('layerFiles').files){const text=await file.text();const info=inspect(text);next.push({name:file.name,text,start:0,duration:Number(info.duration.toFixed(3)),loop:false,visible:true});}layers=next;render();replay();});
$('replay').onclick=replay;
$('export').onclick=handle(()=>{download($('includeBase').checked?'complete-scene.svg':'compiled-overlay.svg',compose($('includeBase').checked),'image/svg+xml');$('status').textContent='SVG exportado con los tiempos y loops actuales.';});
$('project').onclick=handle(()=>{if(!base)throw Error('Selecciona el fondo primero.');download('animation-project.json',JSON.stringify({version:1,base,layers},null,2),'application/json');});
$('projectFile').onchange=handle(async()=>{const file=$('projectFile').files[0];if(!file)return;const p=JSON.parse(await file.text());if(p.version!==1||!p.base||!Array.isArray(p.layers))throw Error('Proyecto no válido.');for(const l of p.layers)inspect(l.text);if(!/^data:image\//.test(p.base.data))throw Error('Fondo de proyecto no válido.');base=p.base;layers=p.layers;showBase();render();replay();});
$('clear').onclick=()=>{base=null;layers=[];if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;for(const id of ['base','overlay'])$(id).removeAttribute('src');for(const id of ['baseFile','layerFiles','projectFile'])$(id).value='';$('art').hidden=true;$('empty').hidden=false;render();$('status').textContent='Selecciona el fondo y las capas.';};
window.addEventListener('beforeunload',()=>{if(previewURL)URL.revokeObjectURL(previewURL);});

