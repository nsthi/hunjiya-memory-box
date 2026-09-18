/* Articulated 1b carton. Real photographic kraft/tape maps, one deterministic pose.
   Coordinates follow the original 1b hinge net, converted from screen-y to world-y.
   Kept independent of the tap/scroll controller for future offline frame rendering. */
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const seg=(p,a,b)=>smooth((p-a)/(b-a));
const TAU=Math.PI/2;
const F=new THREE.Matrix4().makeScale(1,-1,1);
const tr=(x,y,z)=>new THREE.Matrix4().makeTranslation(x,y,z);
const rot=(axis,a)=>axis==='x'?new THREE.Matrix4().makeRotationX(a):new THREE.Matrix4().makeRotationY(a);
const mul=(...m)=>m.reduce((a,b)=>a.multiply(b),new THREE.Matrix4());
const faces=[
 {id:'back',c:1,r:1},
 {id:'left',c:0,r:1,p:'back',dir:'left',span:[.65,.91]},
 {id:'right',c:2,r:1,p:'back',dir:'right',span:[.61,.9]},
 {id:'front',c:3,r:1,p:'right',dir:'right',span:[.55,.84]},
 {id:'tb',c:1,r:0,p:'back',dir:'up',layer:3,span:[.29,.49]},
 {id:'tl',c:0,r:0,p:'left',dir:'up',layer:2,span:[.35,.56]},
 {id:'tr',c:2,r:0,p:'right',dir:'up',layer:1,span:[.4,.61]},
 {id:'tf',c:3,r:0,p:'front',dir:'up',span:[.45,.66]},
 {id:'bb',c:1,r:2,p:'back',dir:'down',layer:3,span:[.56,.77]},
 {id:'bl',c:0,r:2,p:'left',dir:'down',layer:2,span:[.59,.8]},
 {id:'br',c:2,r:2,p:'right',dir:'down',layer:1,span:[.62,.83]},
 {id:'bf',c:3,r:2,p:'front',dir:'down',span:[.65,.86]}
];
export async function createCarton(canvas,tiles){
 const compact=matchMedia('(max-width:700px)').matches;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 // The source textures are bounded, but the final carton still needs enough framebuffer
 // density to stay crisp on a retina phone. Two device pixels is a safe middle ground.
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xf3f0e9,1);
 const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);
 camera.position.z=15;
 const root=new THREE.Group();scene.add(root);
 const hemi=new THREE.HemisphereLight(0xfff5e8,0x67513d,2.1);scene.add(hemi);
 const light=new THREE.DirectionalLight(0xfff6e9,2.4);light.position.set(-3,5,12);light.castShadow=true;
 light.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});light.shadow.bias=-.0002;light.shadow.normalBias=.006;light.shadow.radius=4;scene.add(light);
 const fill=new THREE.DirectionalLight(0xffffff,.35);fill.position.set(5,0,5);scene.add(fill);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.07}));shadow.position.z=-.9;shadow.receiveShadow=true;scene.add(shadow);
 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;
 const cc=contactCanvas.getContext('2d'),gradient=cc.createRadialGradient(64,64,4,64,64,62);
 gradient.addColorStop(0,'rgba(47,31,17,.5)');gradient.addColorStop(.4,'rgba(47,31,17,.23)');gradient.addColorStop(1,'rgba(47,31,17,0)');cc.fillStyle=gradient;cc.fillRect(0,0,128,128);
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false}));contact.position.z=-2;scene.add(contact);
 const loader=new THREE.TextureLoader();
 const load=async url=>{const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t};
 const [kraft,tapeTex,exterior,wordmark]=await Promise.all([load('assets/box/kraft-texture.webp'),load('assets/tape/clear.webp'),load('assets/box/carton-panel.webp'),load('assets/box/memory-box-wordmark.png')]);
 const photoMaps=await Promise.all(tiles.map(t=>load(t.src)));
 const bump=kraft.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
 const byId=Object.fromEntries(faces.map(f=>[f.id,{...f}]));
 const boardMat=new THREE.MeshStandardMaterial({map:kraft,bumpMap:bump,bumpScale:.006,roughness:.96,color:0xcab796});
 const edgeMat=new THREE.MeshStandardMaterial({color:0x8c6b42,roughness:1});
 function printMap(){
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.drawImage(exterior.image,0,0,1024,1024);
  ctx.globalCompositeOperation='multiply';
  // The artist's wordmark (tools-paper/wordmark.py): Arial, tracked tight, two lines, big.
  const logoW=760,logoH=logoW*wordmark.image.height/wordmark.image.width;
  ctx.drawImage(wordmark.image,(1024-logoW)/2,210,logoW,logoH);
  ctx.fillStyle='#33291e';ctx.textBaseline='top';ctx.font='34px monospace';ctx.fillText('contents: six songs',100,622);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
 }
 const printedBoard=printMap();
 for(const f of Object.values(byId)){
  const group=new THREE.Group();group.matrixAutoUpdate=false;root.add(group);f.group=group;
  // Four edge materials, inward face, outward face. Each is actual board thickness.
  const inner=boardMat.clone(),outer=boardMat.clone();
  const uv=exterior.clone();uv.center.set(.5,.5);uv.rotation=((f.c+f.r)%2)*Math.PI;uv.needsUpdate=true;
  inner.map=uv;outer.map=uv;inner.color.set(0xd6c5ad);outer.color.set(0xd6c5ad);
  inner.color.multiplyScalar(1+Math.sin(f.c*5+f.r*9)*.035);
  if(f.c===0&&f.r===0){inner.map=printedBoard;inner.color.set(0xd6c5ad)}
  if(f.id==='front')outer.map=printedBoard;
  const geo=new RoundedBoxGeometry(.998,.998,.008,10,.003);
  // The free edges are battered; the scored hinges stay continuous.
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),seed=f.c*3.71+f.r*8.3;
   const freeTop=f.r===0&&y>.42,freeBottom=f.r===2&&y<-.42;
   const freeSide=f.r!==1&&Math.abs(x)>.42;
   const wear=(Math.sin(x*87+y*51+seed)*.004+Math.sin(x*193+y*117+seed)*.0017);
   if(freeTop||freeBottom)pos.setY(i,y+wear);
   if(freeSide)pos.setX(i,x+wear*.72);
   const lip=Math.pow(Math.max(0,(Math.abs(y)-.3)/.2),2)*.008*Math.sin(seed+1);
   if(f.r!==1)pos.setZ(i,pos.getZ(i)+lip+wear*.18);
  }
  geo.computeVertexNormals();
  const board=new THREE.Mesh(geo,[edgeMat,edgeMat,edgeMat,edgeMat,inner,outer]);board.position.set(.5,-.5,0);board.castShadow=true;board.receiveShadow=true;group.add(board);
  // Fine corrugated flute ends along exposed flap edges.
  if(f.r!==1){
   const ribGeo=new THREE.BufferGeometry(),pts=[];
   for(let i=0;i<100;i++){let x=(i+.5)/100;pts.push(x,-.999,-.004,x+.003,-.999,.004)}
   ribGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));group.add(new THREE.LineSegments(ribGeo,new THREE.LineBasicMaterial({color:0x574125,transparent:true,opacity:.45})));
  }
  const tile=tiles.find(t=>t.c===f.c&&t.r===f.r);
  if(tile){
   const tex=photoMaps[tiles.indexOf(tile)];const a=tex.image.width/tex.image.height;
   const [px,py]=tile.pos;
   if(a>1){tex.repeat.x=1/a;tex.offset.x=(1-1/a)*px}else{tex.repeat.y=a;tex.offset.y=(1-a)*(1-py)}
   const placement=tile.placement,unit=182/220;
   const mount=new THREE.Group();mount.position.set(.5+placement.x*unit,-.5-placement.y*unit,0);
   mount.rotation.z=-placement.r*Math.PI/180;mount.scale.setScalar(placement.s);group.add(mount);
   const photoGeo=new THREE.PlaneGeometry(unit,unit,18,18),vp=photoGeo.attributes.position;
   const colours=[];
   for(let i=0;i<vp.count;i++){
    const x=vp.getX(i)/unit+.5,y=.5-vp.getY(i)/unit;
    const curl=placement.bend*Math.pow(y,4)*(0.25+.75*Math.pow(f.c%2?x:1-x,2));
    vp.setZ(i,curl);
    // scissor-cut edges: border vertices wander a hair inside the print, never outside it
    const cutN=Math.abs(Math.sin(i*12.9898+f.c*78.233+f.r*37.719)*43758.5453)%1*.011*unit;
    if(x<.001)vp.setX(i,vp.getX(i)+cutN);else if(x>.999)vp.setX(i,vp.getX(i)-cutN);
    if(y<.001)vp.setY(i,vp.getY(i)-cutN);else if(y>.999)vp.setY(i,vp.getY(i)+cutN);
    const shade=1-.09*Math.pow(y,7)*Math.pow(f.c%2?x:1-x,2);colours.push(shade,shade,shade);
   }
   photoGeo.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));photoGeo.computeVertexNormals();
   const pic=new THREE.Mesh(photoGeo,new THREE.MeshBasicMaterial({map:tex,toneMapped:false,vertexColors:true}));
   pic.position.z=.014;pic.castShadow=true;mount.add(pic);f.photo=pic;
   // A thin paper edge and the lifted corner cast a small, real shadow onto the board.
   const backing=new THREE.Mesh(photoGeo,new THREE.MeshStandardMaterial({color:0xe9e1d0,roughness:1,side:THREE.BackSide}));backing.position.z=.0135;backing.castShadow=true;mount.add(backing);
   for(const tape of tile.tapes){
    const material=new THREE.MeshBasicMaterial({map:tapeTex,transparent:true,opacity:.77+(f.c%3)*.045,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(tape.w*unit,tape.w*unit*20/62,8,2),material);
    mesh.position.set((tape.x-.5)*unit,(.5-tape.y)*unit,.019);
    mesh.rotation.z=-tape.r*Math.PI/180;mesh.scale.set(tape.sx,tape.sy,1);mount.add(mesh);
   }
  }
 }
 // The seal is a deforming ribbon, not a scaling rectangle. The free end curls
 // backwards over the travelling peel front while the unpeeled section stays fixed.
 const N=100,verts=new Float32Array((N+1)*2*3),uvs=[],indices=[];
 for(let i=0;i<=N;i++){uvs.push(i/N,0,i/N,1);if(i<N){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}}
 const tapeGeo=new THREE.BufferGeometry();tapeGeo.setAttribute('position',new THREE.BufferAttribute(verts,3));tapeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));tapeGeo.setIndex(indices);
 const sealMat=new THREE.MeshPhysicalMaterial({map:tapeTex,transparent:true,opacity:.85,roughness:.19,metalness:0,clearcoat:1,clearcoatRoughness:.12,side:THREE.DoubleSide,depthWrite:false,color:0xf5e1b5});
 const seal=new THREE.Mesh(tapeGeo,sealMat);seal.castShadow=true;byId.tb.group.add(seal);
 const tab=new THREE.Mesh(new THREE.PlaneGeometry(.15,.13),sealMat);tab.position.set(.03,-.5,-.026);tab.rotation.y=Math.PI;byId.tb.group.add(tab);
 let size={w:0,h:0},lastP=0;
 function resize(){const r=canvas.getBoundingClientRect();if(r.width===size.w&&r.height===size.h)return;size={w:r.width,h:r.height};renderer.setSize(r.width,r.height,false)}
 function render(p,finalRect){
  lastP=p;resize();if(!size.w||!size.h)return;
  const mobile=innerWidth<=700;
  const cameraT=seg(p,.37,.94), peel=seg(p,.035,.285);
  const M={};
  for(const f of Object.values(byId)){
   let m=new THREE.Matrix4(),fold=0;
   if(f.p){
    const par=byId[f.p],axis=['left','right'].includes(f.dir)?'y':'x';
    const sign=['up','right'].includes(f.dir)?-1:1;
    fold=1-seg(p,...f.span);
    const ex=axis==='y'?(f.dir==='left'?par.c:par.c+1):0;
    const ey=axis==='x'?(f.dir==='up'?par.r:par.r+1):0;
    m=mul(M[f.p],tr(ex,ey,0),rot(axis,sign*TAU*fold),tr(-ex,-ey,0));
   }
   M[f.id]=m;
   f.group.matrix.copy(mul(F,m,tr(f.c,f.r,-(f.layer||0)*.009*fold),F));
  }
  const cx=1.5+(2-1.5)*cameraT,cy=1.5,cz=.5*(1-cameraT);
  const rx=(16*(1-cameraT))*Math.PI/180,ry=(-30*(1-cameraT))*Math.PI/180;
  root.matrixAutoUpdate=false;root.matrix.copy(mul(rot('x',rx),rot('y',ry),tr(-cx,cy,-cz)));
  // One camera ends on the DOM's exact 4x3 net bounds.
  const endScale=finalRect?finalRect.width/4:Math.min((size.w-40)/4,(size.h-160)/3);
  const startScale=Math.min(size.w*.5,size.h*.41)*(1+Math.sin(Math.PI*seg(p,0,.4))*.06);
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const targetScale=THREE.MathUtils.lerp(startScale,endScale,cameraT);
  const safeScale=Math.min(targetScale,(size.w-(mobile?30:100))/extent.x,(size.h-190)/extent.y);
  const scale=THREE.MathUtils.lerp(safeScale,endScale,seg(p,.87,.96));
  camera.position.x=center.x*(1-seg(p,.87,.96));
  contact.position.set(center.x+.06,bounds.min.y-.025,-2);contact.scale.set(extent.x*1.18,.28,1);contact.material.opacity=1-cameraT;shadow.visible=p>.88;
  camera.left=-size.w/(2*scale);camera.right=-camera.left;camera.top=size.h/(2*scale);camera.bottom=-camera.top;
  const endY=finalRect?size.h/2-(finalRect.top+finalRect.height/2):0;
  camera.position.y=center.y*(1-seg(p,.87,.96))-THREE.MathUtils.lerp(-12,endY,cameraT)/scale;camera.updateProjectionMatrix();
  shadow.position.z=-.94+.9*cameraT;shadow.material.opacity=.075-.035*cameraT;
  const front=peel*.98;
  for(let i=0;i<=N;i++){
   const s=i/N,d=Math.max(0,front-s),rad=.075,theta=Math.min(Math.PI,d/rad);
   let x=s,z=-.024;
   if(d>0){x=front-rad*Math.sin(theta)+Math.max(0,d-Math.PI*rad)*.92;z-=rad*(1-Math.cos(theta))+Math.max(0,d-Math.PI*rad)*.3}
   const flutter=Math.sin(s*48+peel*9)*.002*Math.sin(Math.PI*peel);
   for(let side=0;side<2;side++){const j=(i*2+side)*3;verts[j]=x;verts[j+1]=-.5+(side-.5)*.13;verts[j+2]=z+flutter}
  }
  tapeGeo.attributes.position.needsUpdate=true;tapeGeo.computeVertexNormals();
  seal.visible=true;sealMat.opacity=.85;tab.visible=p<.065;tab.rotation.x=seg(p,0,.065)*.4;
  renderer.render(scene,camera);
 }
 function photoBounds(){return Object.values(byId).filter(f=>f.photo).map(f=>{
  const points=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>f.photo.localToWorld(new THREE.Vector3(x*91/220,y*91/220,0)).project(camera));
  const xs=points.map(a=>(a.x+1)*size.w/2),ys=points.map(a=>(1-a.y)*size.h/2);
  return {c:f.c,r:f.r,left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
 })}

 return {render,resize,photoBounds,get progress(){return lastP},dispose(){renderer.dispose()},canvas};
}
