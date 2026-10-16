const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../plugin/renderer');
const catalog=require('../plugin/data/catalog.json');
const sharp=require('sharp');
async function pixel(svg,x,y){const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});return Array.from(data.slice((y*info.width+x)*4,(y*info.width+x)*4+4));}
(async()=>{
 assert(catalog.length>5000);
 const ids=new Set(catalog.map(i=>i.id));assert.equal(ids.size,catalog.length);
 for(const brand of ['facebook-f','instagram','x-twitter','pinterest-p','tiktok','youtube','twitch','discord','telegram','whatsapp','threads','facebook-messenger','snapchat','linkedin-in'])assert(ids.has('brand:'+brand),brand);
 let count=0;
 for(const icon of catalog){
  for(const variant of ['auto','outline'].concat(icon.solid?['solid']:[])){
   const svg=R.render(icon,{variant,iconMode:'gradient',shape:'circle',bgMode:'gradient'},'test');
   assert(!svg.includes('currentColor'));assert(!svg.includes('undefined'));assert(!svg.includes('NaN'));assert(svg.includes('viewBox="0 0 100 100"'));count++;
  }
 }
 const square={id:'test:square',name:'Square',w:100,h:100,family:'brands',solid:'<path fill="currentColor" d="M0 0H100V100H0Z"/>'};
 let svg=R.render(square,{shape:'circle',scale:40,iconMode:'cutout',size:100,bgColor:'#FF0000'});
 assert.equal((await pixel(svg,50,50))[3],0,'cutout center must be alpha=0');
 assert.deepEqual(await pixel(svg,50,10),[255,0,0,255],'outer circle remains filled');
 assert.equal((await pixel(svg,0,0))[3],0,'outside circle is transparent');
 svg=R.render(square,{shape:'none',iconMode:'gradient',color:'#FF0000',color2:'#0000FF',angle:0,size:100});
 const left=await pixel(svg,15,50),right=await pixel(svg,85,50);
 assert(left[0]>left[2]);assert(right[2]>right[0]);assert.equal(left[3],255);
 svg=R.render(square,{shape:'circle',bgMode:'none',border:true,borderWidth:4,color:'#00FF00',size:100});
 assert.equal((await pixel(svg,50,14))[3],0,'transparent interior between border and icon');
 assert.equal((await pixel(svg,50,4))[3],255,'border exists');
 assert.throws(()=>R.render(square,{iconMode:'cutout',shape:'none'}));
 const n=R.normalize({color:'\" onload=bad',size:999999,angle:-999,shape:'<script>',border:'yes'});
 assert.equal(n.color,R.DEFAULTS.color);assert.equal(n.size,8192);assert.equal(n.angle,0);assert.equal(n.shape,'none');assert.equal(n.border,false);
 const output=path.resolve(__dirname,'../qa');fs.mkdirSync(output,{recursive:true});
 for(const name of ['brand:whatsapp','brand:instagram','tabler:heart','tabler:map-pin']){
  const icon=catalog.find(i=>i.id===name);
  for(const mode of ['solid','gradient','cutout']){
   await sharp(Buffer.from(R.render(icon,{shape:'circle',bgMode:'gradient',iconMode:mode,color:'#FFFFFF',color2:'#FFD166'}))).png().toFile(path.join(output,name.replace(':','-')+'-'+mode+'.png'));
  }
 }
 console.log(JSON.stringify({ok:true,icons:catalog.length,renderCases:count,checks:['social brands','safe SVG paint values','real transparent cutout','two-color gradient','transparent interior and visible border','size bounds'],nativePhotoshopTested:false},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
