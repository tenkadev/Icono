(function(){
'use strict';
const R=window.IconoRenderer,icons=window.ICON_CATALOG,byID=new Map(icons.map(i=>[i.id,i]));
const $=id=>document.getElementById(id);
let selected=byID.get('brand:whatsapp')||icons[0];
let options=R.normalize({shape:'circle',color:'#FFFFFF',bgColor:'#25D366'}),favorites=new Set(),filter='all',limit=72,previewBG=0,busy=false,connected=false,persistTimer,pendingID=null,requestCounter=0;
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const searchIndex=new Map(icons.map(i=>[i.id,norm(i.name+' '+i.key+' '+i.tags)]));
const controls=['variant','iconMode','color','color2','angle','shape','bgMode','bgColor','bgColor2','bgAngle','border','borderColor','borderWidth','stroke','scale','size'];
const colors=['color','color2','bgColor','bgColor2','borderColor'];
const rangeKeys=['angle','bgAngle','stroke','scale','borderWidth'];
function inHost(){return !!(window.uxpHost&&typeof window.uxpHost.postMessage==='function');}
function post(type,data){if(!inHost())return false;window.uxpHost.postMessage(JSON.stringify(Object.assign({channel:'icono',type},data||{})));return true;}
function status(message,type){$('status').textContent=message;$('status').className=type||'';}
function state(){return {selected:selected.id,options,favorites:Array.from(favorites)};}
function saveSoon(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{if(inHost())post('saveState',{state:state()});else try{localStorage.setItem('icono-v1',JSON.stringify(state()));}catch(e){}},220);}
function restore(s){
 if(!s||typeof s!=='object')return;
 if(byID.has(s.selected))selected=byID.get(s.selected);
 if(s.options)options=R.normalize(s.options);
 if(Array.isArray(s.favorites))favorites=new Set(s.favorites.filter(id=>byID.has(id)));
 if(options.variant==='solid'&&!selected.solid)options.variant='auto';
 if(options.iconMode==='cutout'&&(options.shape==='none'||options.bgMode==='none')){options.shape='circle';options.bgMode='solid';}
 syncControls();renderGrid();renderPreview();
}
function syncControls(){
 controls.forEach(key=>{if(key==='border')$(key).checked=options[key];else $(key).value=options[key];});
 colors.forEach(key=>{$(key+'Hex').value=options[key].toUpperCase();$(key+'Hex').classList.remove('invalid');});
 $('variant').querySelector('[value="solid"]').disabled=!selected.solid;
 visibility();
}
function visibility(){
 $('iconColors').hidden=options.iconMode==='cutout';$('color2Wrap').hidden=options.iconMode!=='gradient';$('iconAngleRow').hidden=options.iconMode!=='gradient';
 $('backgroundControls').hidden=options.shape==='none';$('bgColors').hidden=options.bgMode==='none';$('bgColor2Wrap').hidden=options.bgMode!=='gradient';$('bgAngleRow').hidden=options.bgMode!=='gradient';$('borderControls').hidden=!options.border;
 $('strokeRow').hidden=R.variantFor(selected,options.variant)!=='outline';
 rangeKeys.forEach(key=>{$(key+'Value').textContent=options[key]+(key==='angle'||key==='bgAngle'?'°':key==='scale'?'%':'');});
 $('brandColor').hidden=!selected.color;
 $('formatHint').textContent=$('format').value==='svg'?'Conserva el SVG dentro del documento. Los trazados no se convierten en capas de forma.':'PNG con transparencia. Elige suficientes píxeles para el tamaño de impresión.';
}
function renderPreview(){
 $('selectedName').textContent=selected.name;
 $('selectedFamily').textContent=selected.family==='brands'?'Font Awesome · Redes y marcas':'Tabler Icons · '+(selected.solid&&selected.outline?'Contorno y relleno':selected.outline?'Contorno':'Relleno');
 $('favorite').textContent=favorites.has(selected.id)?'★':'☆';$('favorite').classList.toggle('on',favorites.has(selected.id));$('favorite').setAttribute('aria-pressed',String(favorites.has(selected.id)));
 $('sizeHint').textContent=options.size+' px';
 try{$('previewIcon').innerHTML=R.render(selected,options,'preview');$('insert').disabled=busy||!connected;}
 catch(e){status(e.message,'error');$('insert').disabled=true;}
 visibility();
}
function results(){
 const query=norm($('search').value),terms=query.split(/\s+/).filter(Boolean);
 let found=icons.filter(i=>{
  if(filter==='brands'&&i.family!=='brands')return false;
  if(filter==='favorites'&&!favorites.has(i.id))return false;
  if(filter==='common'&&icons.indexOf(i)>48)return false;
  const hay=searchIndex.get(i.id);return terms.every(t=>hay.includes(t));
 });
 if(query)found.sort((a,b)=>{const score=i=>norm(i.key)===query?0:norm(i.name)===query?0:norm(i.key).startsWith(query)?1:2;return score(a)-score(b);});
 return found;
}
function renderGrid(){
 const found=results();$('resultCount').textContent=found.length.toLocaleString('es-PE')+' iconos'+($('search').value?' encontrados':' disponibles');$('clearSearch').hidden=!$('search').value;$('empty').hidden=found.length!==0;$('more').hidden=found.length<=limit;
 const grid=$('grid');grid.innerHTML='';const fragment=document.createDocumentFragment();
 found.slice(0,limit).forEach((icon,index)=>{
  const button=document.createElement('button');button.className='icon-card'+(icon.id===selected.id?' selected':'');button.type='button';button.title=icon.name;button.dataset.id=icon.id;button.setAttribute('role','listitem');button.setAttribute('aria-label',icon.name);button.setAttribute('aria-pressed',String(icon.id===selected.id));
  let c=icon.color||'#D0D5E2';if(c==='#000000'||c==='#111111'||c==='#24292F')c='#E6EAF2';
  button.innerHTML=R.render(icon,{color:c,size:32},'thumb'+index);
  const label=document.createElement('span');label.textContent=icon.name;button.appendChild(label);
  if(favorites.has(icon.id)){const star=document.createElement('em');star.textContent='★';button.appendChild(star);}
  button.addEventListener('click',()=>select(icon));fragment.appendChild(button);
 });grid.appendChild(fragment);
}
function select(icon){selected=icon;if(options.variant==='solid'&&!icon.solid)options.variant='auto';syncControls();renderPreview();document.querySelectorAll('.icon-card').forEach(b=>{const yes=b.dataset.id===icon.id;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});saveSoon();}
function readControl(key){
 if(key==='size'&&($(key).value===''||Number($(key).value)<16||Number($(key).value)>8192)){status('El tamaño debe estar entre 16 y 8192 px.','error');return;}
 options[key]=key==='border'?$(key).checked:$(key).value;
 options=R.normalize(options);
 if(key==='iconMode'&&options.iconMode==='cutout'){if(options.shape==='none')options.shape='circle';if(options.bgMode==='none')options.bgMode='solid';}
 if((key==='shape'&&options.shape==='none'||key==='bgMode'&&options.bgMode==='none')&&options.iconMode==='cutout')options.iconMode='solid';
 // With a transparent background, show an outline so the selected shape remains useful.
 if(key==='bgMode'&&options.bgMode==='none')options.border=true;
 syncControls();renderPreview();saveSoon();status('Vista previa actualizada.');
}
function preset(name){
 const brand=selected.color||'#111111';
 if(name==='solo')Object.assign(options,{shape:'none',iconMode:'solid',color:brand,variant:'auto',border:false});
 if(name==='circle')Object.assign(options,{shape:'circle',iconMode:'solid',color:'#FFFFFF',bgMode:'solid',bgColor:brand,border:false,variant:'auto'});
 if(name==='gradient')Object.assign(options,{shape:'none',iconMode:'gradient',color:'#F97316',color2:'#A855F7',angle:315,border:false});
 if(name==='cutout')Object.assign(options,{shape:'circle',iconMode:'cutout',bgMode:'solid',bgColor:brand,border:false,variant:'auto'});
 syncControls();renderPreview();saveSoon();status('Estilo aplicado.');
}
function busyUI(value){busy=value;['saveSVG','savePNG','insert'].forEach(id=>$(id).disabled=value||(id==='insert'&&!connected));}
async function pngFromSVG(svg,size){
 if(size>4096)throw new Error('Para PNG el máximo es 4096 px. Usa SVG para tamaños mayores.');
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('No se pudo convertir el icono a PNG.'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;canvas.getContext('2d').drawImage(img,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1];}
 finally{URL.revokeObjectURL(url);}
}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function perform(type,format){
 if(busy)return;
 if(type==='insert'&&!connected){status('Abre Icono desde Photoshop para insertar directamente.','error');return;}
 if(!Number.isFinite(Number($('size').value))||Number($('size').value)<16||Number($('size').value)>8192){status('Indica un tamaño entre 16 y 8192 px.','error');return;}
 busyUI(true);status(type==='insert'?'Insertando en Photoshop…':'Preparando archivo…');
 try{
  const svg=R.render(selected,options),png=format==='png'?await pngFromSVG(svg,options.size):null;
  if(inHost()){
   pendingID='r'+Date.now()+'-'+(++requestCounter);
   post(type,{requestId:pendingID,iconId:selected.id,options,format,png});
  }else{
   if(format==='svg')download(svg,'Icono-'+selected.key+'.svg','image/svg+xml');
   else {const binary=atob(png),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));download(bytes,'Icono-'+selected.key+'.png','image/png');}
   busyUI(false);status('Archivo preparado para descargar.','success');
  }
 }catch(e){busyUI(false);status(e.message||String(e),'error');}
}
window.addEventListener('message',event=>{
 let m;try{m=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch(e){return;}if(!m||m.channel!=='icono')return;
 if(m.type==='init'){connected=true;restore(m.state);$('browserNote').hidden=true;busyUI(false);status('Conectado a Photoshop '+m.version+'.');}
 if(m.type==='result'&&m.requestId===pendingID){pendingID=null;busyUI(false);status(m.ok?m.message:m.error,m.ok?'success':'error');}
});
controls.forEach(key=>$(key).addEventListener($(key).tagName==='SELECT'||key==='border'?'change':'input',()=>readControl(key)));
colors.forEach(key=>$(key+'Hex').addEventListener('change',()=>{const value=$(key+'Hex').value.trim();const withHash=value.startsWith('#')?value:'#'+value;if(!/^#[0-9a-f]{6}$/i.test(withHash)){$(key+'Hex').classList.add('invalid');status('Usa un color HEX de 6 dígitos, por ejemplo #1877F2.','error');return;}options[key]=withHash.toUpperCase();syncControls();renderPreview();saveSoon();}));
$('search').addEventListener('input',()=>{limit=72;renderGrid();});
$('clearSearch').addEventListener('click',()=>{$('search').value='';limit=72;renderGrid();$('search').focus();});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;limit=72;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));renderGrid();}));
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>preset(button.dataset.preset)));
$('more').addEventListener('click',()=>{limit+=72;renderGrid();});
$('favorite').addEventListener('click',()=>{if(favorites.has(selected.id))favorites.delete(selected.id);else favorites.add(selected.id);renderGrid();renderPreview();saveSoon();});
$('brandColor').addEventListener('click',()=>{if(options.shape==='none')options.color=selected.color;else{options.bgColor=selected.color;options.bgMode='solid';if(options.iconMode!=='cutout'){options.color='#FFFFFF';options.iconMode='solid';}}syncControls();renderPreview();saveSoon();});
$('previewBg').addEventListener('click',()=>{previewBG=(previewBG+1)%3;$('preview').className='preview '+['checker','dark','light'][previewBG];});
$('format').addEventListener('change',visibility);
$('saveSVG').addEventListener('click',()=>perform('export','svg'));
$('savePNG').addEventListener('click',()=>perform('export','png'));
$('insert').addEventListener('click',()=>perform('insert',$('format').value));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}if(e.key==='Escape'&&document.activeElement===$('search')){$('search').value='';renderGrid();$('search').blur();}});
syncControls();renderGrid();renderPreview();
if(!inHost()){try{const saved=localStorage.getItem('icono-v1');if(saved)restore(JSON.parse(saved));}catch(e){}$('browserNote').hidden=false;busyUI(false);}
let tries=0;
const connectTimer=setInterval(()=>{tries++;if(connected){clearInterval(connectTimer);return;}if(inHost()){post('ready');$('browserNote').hidden=true;}if(tries>=20){clearInterval(connectTimer);if(inHost())status('El panel está abierto, pero no responde la conexión con Photoshop. Recarga el plugin.','error');}},400);
if(inHost())post('ready');
// Expose the editor state and rendering helpers for browser tests.
window.IconoApp={getState:state,getSelected:()=>selected,results,select,preset,pngFromSVG};
})();
