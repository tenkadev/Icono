'use strict';
const {app,core,action}=require('photoshop');
const {storage,entrypoints}=require('uxp');
const fs=storage.localFileSystem;
const Renderer=require('./renderer.js');
const catalog=require('./data/catalog.json');
const byID=new Map(catalog.map(i=>[i.id,i]));
const frame=document.getElementById('frame');
let busy=false,writeQueue=Promise.resolve();
function send(type,data){frame.postMessage(JSON.stringify(Object.assign({channel:'icono',type},data||{})));}
async function loadState(){try{const folder=await fs.getDataFolder();const file=await folder.getEntry('preferences.json');return JSON.parse(await file.read());}catch(e){return {};}}
async function saveState(value){
 const state={favorites:Array.isArray(value.favorites)?value.favorites.filter(id=>byID.has(id)).slice(0,2000):[],options:Renderer.normalize(value.options),selected:byID.has(value.selected)?value.selected:'brand:whatsapp'};
 const folder=await fs.getDataFolder(),file=await folder.createFile('preferences.json',{overwrite:true});await file.write(JSON.stringify(state));
}
function decodePNG(base64){
 if(typeof base64!=='string'||base64.length>32*1024*1024||!base64.startsWith('iVBORw0KGgo'))throw new Error('PNG no válido o demasiado grande. Prueba con menos píxeles.');
 const text=atob(base64),bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);return bytes.buffer;
}
async function buildFile(message,save){
 const icon=byID.get(message.iconId);if(!icon)throw new Error('Icono no encontrado.');
 const options=Renderer.normalize(message.options),format=message.format==='png'?'png':'svg';
 const content=format==='svg'?Renderer.render(icon,options):decodePNG(message.png);
 const filename='Icono-'+icon.key+'.'+format;
 let file;
 if(save){file=await fs.getFileForSaving(filename,{types:[format]});if(!file)return null;}
 else {const folder=await fs.getTemporaryFolder();file=await folder.createFile(Date.now()+'-'+filename,{overwrite:true});}
 await file.write(content,{format:format==='png'?storage.formats.binary:storage.formats.utf8});
 return {file,icon,options};
}
async function insert(message){
 if(!app.documents.length)throw new Error('Abre o crea un documento de Photoshop antes de insertar.');
 const initialDocID=app.activeDocument.id;
 const built=await buildFile(message,false);const {file,icon,options}=built;
 try{
  await core.executeAsModal(async context=>{
   if(!app.documents.length||app.activeDocument.id!==initialDocID)throw new Error('Cambiaste de documento. Vuelve a pulsar Insertar.');
   const doc=app.activeDocument;
   const history=await context.hostControl.suspendHistory({documentID:doc.id,name:'Insertar '+icon.name+' con Icono'});
   try{
    const token=fs.createSessionToken(file);
    const result=await action.batchPlay([{
     _obj:'placeEvent',null:{_path:token,_kind:'local'},linked:false,
     freeTransformCenterState:{_enum:'quadCenterState',_value:'QCSAverage'},
     offset:{_obj:'offset',horizontal:{_unit:'pixelsUnit',_value:0},vertical:{_unit:'pixelsUnit',_value:0}},
     _options:{dialogOptions:'dontDisplay'}
    }],{});
    if(result[0]&&result[0]._obj==='error')throw new Error(result[0].message||'Photoshop no pudo colocar el archivo.');
    const layer=doc.activeLayers[0];if(!layer)throw new Error('Photoshop no creó la capa.');
    layer.name='Icono · '+icon.name;
    // Scale by visible bounds: Photoshop can auto-fit a placed file or interpret its PPI.
    const b=layer.boundsNoEffects,w=b.right-b.left,h=b.bottom-b.top,largest=Math.max(w,h);
    if(largest>0){const pct=options.size/largest*100;await layer.scale(pct,pct);}
    await context.hostControl.resumeHistory(history,true);
   }catch(e){await context.hostControl.resumeHistory(history,false);throw e;}
  },{commandName:'Insertar icono'});
 }finally{try{await file.delete();}catch(e){/* Embedded source is retained in the PSD. */}}
}
async function handle(event){
 // Only our local webview may ask the host to perform an action.
 if(event.source&&event.source!==frame)return;
 let m;try{m=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch(e){return;}
 if(!m||m.channel!=='icono')return;
 if(m.type==='ready'){send('init',{state:await loadState(),version:app.version});return;}
 if(m.type==='saveState'){writeQueue=writeQueue.then(()=>saveState(m.state||{})).catch(e=>console.warn('Icono: preferencias',e));return;}
 if(m.type!=='insert'&&m.type!=='export')return;
 if(busy){send('result',{requestId:m.requestId,ok:false,error:'Hay una operación en curso. Espera un momento.'});return;}
 busy=true;
 try{
  if(m.type==='insert'){await insert(m);send('result',{requestId:m.requestId,ok:true,message:'Icono insertado. Puedes deshacerlo con Ctrl+Z.'});}
  else{const built=await buildFile(m,true);send('result',{requestId:m.requestId,ok:true,message:built?'Archivo guardado.':'Guardado cancelado.'});}
 }catch(e){console.error('Icono:',e);send('result',{requestId:m.requestId,ok:false,error:String(e.message||e)});}
 finally{busy=false;}
}
window.addEventListener('message',handle);
frame.addEventListener('loaderror',event=>{const error=document.getElementById('hostError');error.style.display='block';error.textContent='No se pudo abrir el panel: '+(event.message||'actualiza Photoshop y UXP WebView Support desde Creative Cloud.');});
entrypoints.setup({panels:{icono:{show(){},hide(){}}}});
frame.src='plugin:/ui/index.html';
