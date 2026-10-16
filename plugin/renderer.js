(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IconoRenderer=factory();})(typeof window!=='undefined'?window:this,function(){
'use strict';
const DEFAULTS={variant:'auto',iconMode:'solid',color:'#111111',color2:'#8B5CF6',angle:45,shape:'none',bgMode:'solid',bgColor:'#1877F2',bgColor2:'#9333EA',bgAngle:45,border:false,borderColor:'#111111',borderWidth:3,stroke:2,scale:60,size:512};
const clamp=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
const hex=(v,def)=>/^#[0-9a-f]{6}$/i.test(v||'')?v.toUpperCase():def;
const pick=(v,arr,def)=>arr.indexOf(v)>=0?v:def;
function normalize(input){
 const o=Object.assign({},DEFAULTS,input||{});
 return {variant:pick(o.variant,['auto','outline','solid'],'auto'),iconMode:pick(o.iconMode,['solid','gradient','cutout'],'solid'),color:hex(o.color,DEFAULTS.color),color2:hex(o.color2,DEFAULTS.color2),angle:clamp(o.angle,0,360,45),shape:pick(o.shape,['none','circle','rounded','square'],'none'),bgMode:pick(o.bgMode,['solid','gradient','none'],'solid'),bgColor:hex(o.bgColor,DEFAULTS.bgColor),bgColor2:hex(o.bgColor2,DEFAULTS.bgColor2),bgAngle:clamp(o.bgAngle,0,360,45),border:o.border===true,borderColor:hex(o.borderColor,DEFAULTS.borderColor),borderWidth:clamp(o.borderWidth,0.2,15,3),stroke:clamp(o.stroke,0.5,4,2),scale:clamp(o.scale,20,85,60),size:Math.round(clamp(o.size,16,8192,512))};
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function gradient(id,a,b,angle){let r=angle*Math.PI/180,dx=Math.cos(r)*50,dy=Math.sin(r)*50;return '<linearGradient id="'+id+'" x1="'+(50-dx)+'%" y1="'+(50-dy)+'%" x2="'+(50+dx)+'%" y2="'+(50+dy)+'%"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient>';}
function variantFor(icon,choice){if(choice==='auto')return icon.family==='brands'?'solid':(icon.outline?'outline':'solid');if(choice==='solid'&&!icon.solid)throw new Error('Este icono solo tiene variante de contorno. Elige otro resultado o usa Contorno.');return choice;}
function normalizedBody(icon,o,paint,uid){
 const variant=variantFor(icon,o.variant), synth=variant==='outline'&&!icon.outline;
 let body=variant==='solid'?icon.solid:(icon.outline||icon.solid);
 if(typeof body!=='string')throw new Error('Variante no disponible.');
 const max=Math.max(icon.w,icon.h), extent=o.shape==='none'?88:o.scale;
 const factor=extent/max,tx=(100-icon.w*factor)/2,ty=(100-icon.h*factor)/2;
 if(synth){
  body=body.replace(/\sfill="[^"]*"/g,'').replace(/\sstroke="[^"]*"/g,'');
  body='<g fill="none" stroke="'+paint+'" stroke-width="'+(o.stroke*max/24)+'" stroke-linejoin="round" stroke-linecap="round">'+body+'</g>';
 }else{
  body=body.replace(/currentColor/g,paint);
  if(variant==='outline')body=body.replace(/stroke-width="[^"]*"/g,'stroke-width="'+o.stroke+'"');
 }
 return '<g transform="translate('+tx+' '+ty+') scale('+factor+')">'+body+'</g>';
}
function shapeMarkup(o,fill,stroke,width,extra){let a=' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'"'+(extra||'');let pad=2+width/2, side=100-2*pad;if(o.shape==='circle')return '<circle cx="50" cy="50" r="'+(50-pad)+'"'+a+'/>';return '<rect x="'+pad+'" y="'+pad+'" width="'+side+'" height="'+side+'" rx="'+(o.shape==='rounded'?18:0)+'"'+a+'/>';}
function render(icon,input,uid){
 if(!icon||typeof icon.id!=='string')throw new Error('Selecciona un icono.');
 const o=normalize(input), id=String(uid||'export').replace(/[^a-zA-Z0-9_-]/g,'');
 if(o.iconMode==='cutout'&&(o.shape==='none'||o.bgMode==='none'))throw new Error('El interior transparente necesita un círculo o cuadrado con fondo.');
 let defs='',paint=o.color,bg=o.bgColor;
 if(o.iconMode==='gradient'){defs+=gradient('i'+id,o.color,o.color2,o.angle);paint='url(#i'+id+')';}
 if(o.bgMode==='gradient'){defs+=gradient('b'+id,o.bgColor,o.bgColor2,o.bgAngle);bg='url(#b'+id+')';}
 if(o.bgMode==='none')bg='none';
 let content='';
 if(o.shape!=='none'){
  let extra='';
  if(o.iconMode==='cutout'){
   defs+='<mask id="m'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style="mask-type:luminance"><rect width="100" height="100" fill="#ffffff"/>'+normalizedBody(icon,o,'#000000',id)+'</mask>';
   extra=' mask="url(#m'+id+')"';
  }
  content+=shapeMarkup(o,bg,o.border?o.borderColor:'none',o.border?o.borderWidth:0,extra);
 }
 if(o.iconMode!=='cutout')content+=normalizedBody(icon,o,paint,id);
 const license=icon.family==='brands'?'Font Awesome Free 6.7.2 by Fonticons, Inc. / Dave Gandy; CC BY 4.0; https://fontawesome.com/license/free; modified colors/composition.':'Tabler Icons by Paweł Kuna; MIT; https://github.com/tabler/tabler-icons; modified colors/composition.';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+o.size+'" height="'+o.size+'" viewBox="0 0 100 100"><title>'+esc(icon.name)+'</title><desc>'+esc(license)+'</desc><defs>'+defs+'</defs>'+content+'</svg>';
}
return {DEFAULTS,normalize,render,variantFor};
});
