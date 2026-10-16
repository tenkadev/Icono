const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync(require.resolve('../plugin/host.js'),'utf8');
async function harness({noDoc=false,failPlace=false,failScale=false}={}){
 const messages=[],calls=[],written=[];let listener;
 const frame={postMessage:m=>messages.push(JSON.parse(m)),addEventListener(){}};
 const entry={write:async(content,opts)=>written.push({content,opts}),delete:async()=>calls.push('delete')};
 const files={getTemporaryFolder:async()=>({createFile:async()=>entry}),createSessionToken:()=> 'session-token',getDataFolder:async()=>({getEntry:async()=>{throw Error('missing')},createFile:async()=>entry}),getFileForSaving:async()=>entry};
 const layer={boundsNoEffects:{left:0,top:0,right:256,bottom:256},scale:async(x,y)=>{calls.push(['scale',x,y]);if(failScale)throw Error('scale failed')}};
 const ps={app:{documents:noDoc?[]:[{}],activeDocument:{id:123,activeLayers:[layer]},version:'27.x-mock'},core:{executeAsModal:async(fn)=>{calls.push('modal');return fn({hostControl:{suspendHistory:async()=>{calls.push('suspend');return 'history'},resumeHistory:async(id,commit)=>calls.push(['resume',commit])}})}},action:{batchPlay:async(d)=>{calls.push(d[0]);return failPlace?[{_obj:'error',message:'Place failed'}]:[{}]}}};
 const context={require:id=>id==='photoshop'?ps:id==='uxp'?{storage:{localFileSystem:files,formats:{binary:'binary',utf8:'utf8'}},entrypoints:{setup(){}}}:id==='./renderer.js'?require('../plugin/renderer'):require('../plugin/data/catalog.json'),window:{addEventListener:(event,fn)=>listener=fn},document:{getElementById:()=>frame},console:{error(){},warn(){}},atob,Uint8Array,Map,JSON,Date,Promise};
 vm.runInNewContext(code,context);
 const send=async message=>listener({source:frame,data:JSON.stringify({channel:'icono',...message})});
 return {send,messages,calls,written,layer};
}
(async()=>{
 const request={type:'insert',requestId:'1',iconId:'brand:whatsapp',options:{shape:'circle',iconMode:'cutout',size:512},format:'svg'};
 let h=await harness();await h.send(request);assert.equal(h.messages.at(-1).ok,true);assert(h.written[0].content.includes('<mask'));assert(h.calls.some(c=>c._obj==='placeEvent'&&c.null._path==='session-token'&&c.linked===false));assert(h.calls.some(c=>Array.isArray(c)&&c[0]==='scale'&&c[1]===200));assert(h.calls.some(c=>Array.isArray(c)&&c[0]==='resume'&&c[1]===true));assert(h.calls.includes('delete'));assert.equal(h.layer.name,'Icono · Whatsapp');
 h=await harness({noDoc:true});await h.send(request);assert.equal(h.messages.at(-1).ok,false);assert.equal(h.written.length,0);
 for(const config of [{failPlace:true},{failScale:true}]){h=await harness(config);await h.send(request);assert.equal(h.messages.at(-1).ok,false);assert(h.calls.some(c=>Array.isArray(c)&&c[0]==='resume'&&c[1]===false),'failure must roll back');assert(h.calls.includes('delete'));}
 h=await harness();await h.send({...request,iconId:'unknown'});assert.equal(h.messages.at(-1).ok,false);assert.equal(h.written.length,0);
 await h.send({...request,type:'export',format:'png',png:'bad'});assert.equal(h.messages.at(-1).ok,false);assert.equal(h.written.length,0);
 console.log(JSON.stringify({ok:true,checks:['embedded SVG placement command','size adjustment','single undo step','no-document message','placement error rollback','scale error rollback','temporary file cleanup','unknown icon and invalid PNG rejected'],type:'Mocked host API; not a Photoshop runtime test'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
