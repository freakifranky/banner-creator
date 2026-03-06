import { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */
function hexToRgb(hex){const h=(hex||"#000000").replace("#","");return{r:parseInt(h.slice(0,2),16)||0,g:parseInt(h.slice(2,4),16)||0,b:parseInt(h.slice(4,6),16)||0};}
function darken(hex,amt=30){const{r,g,b}=hexToRgb(hex);return`rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;}
function luminance(hex){if(!hex||hex.length<7)return 0;const{r,g,b}=hexToRgb(hex);return 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function roundRectPath(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

const COLOR_PRESETS=[{hex:"#D0021B"},{hex:"#1A8C2E"},{hex:"#7B1FA2"},{hex:"#1B2D6B"},{hex:"#E05C00"},{hex:"#9C27B0"},{hex:"#00796B"},{hex:"#F57F17"}];
const DOT_BG={backgroundColor:"#e8e8e8",backgroundImage:"radial-gradient(circle,#bbb 1px,transparent 1px)",backgroundSize:"20px 20px"};
const SIDEBAR_W=288;

/* ═══════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Toggle({checked,onChange}){return <div onClick={()=>onChange(!checked)} style={{width:44,height:24,borderRadius:12,cursor:"pointer",transition:"background .2s",background:checked?"#D0021B":"#ccc",position:"relative",flexShrink:0}}><div style={{position:"absolute",top:2,left:checked?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/></div>;}
function ColorSwatches({value,onChange,accent="#D0021B"}){return <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>{COLOR_PRESETS.map(c=><div key={c.hex} onClick={()=>onChange(c.hex)} style={{width:28,height:28,borderRadius:"50%",background:c.hex,cursor:"pointer",border:value===c.hex?`3px solid #111`:"3px solid transparent",boxShadow:value===c.hex?"0 0 0 1px "+c.hex:"0 1px 3px rgba(0,0,0,.15)"}}/>)}</div>;}
function HexInput({value,onChange}){return <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:32,height:32,borderRadius:6,background:value,border:"1px solid #ddd",flexShrink:0}}/><div style={{display:"flex",alignItems:"center",border:"1px solid #ddd",borderRadius:8,padding:"6px 10px",background:"#fff",flex:1}}><span style={{color:"#bbb",fontSize:13,marginRight:2}}>#</span><input value={(value||"").replace("#","")} onChange={e=>{const v="#"+e.target.value;if(/^#[0-9a-fA-F]{0,6}$/.test(v))onChange(v);}} style={{border:"none",outline:"none",fontSize:13,fontFamily:"monospace",color:"#111",width:"100%",background:"transparent"}} maxLength={6}/></div><input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{width:32,height:32,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/></div>;}
function ContrastWarning({color}){const wc=1.05/(luminance(color)+0.05);if(wc>=4.5)return null;return <div style={{fontSize:12,color:"#E05C00",marginTop:6}}>⚠ {wc>=3?"Moderate":"Low"} contrast — verify on mobile</div>;}
function Divider({margin="16px 0"}){return <div style={{height:1,background:"#f0f0f0",margin}}/>;}
function SLabel({children,sub}){return <div style={{marginBottom:4}}><div style={{fontSize:14,fontWeight:600,color:"#111"}}>{children}</div>{sub&&<div style={{fontSize:11,color:"#aaa",marginTop:1}}>{sub}</div>}</div>;}
function OutlineBtn({children,onClick,icon,fullWidth,accent}){return <button onClick={onClick} style={{width:fullWidth?"100%":"auto",padding:"9px 14px",background:"#fff",color:"#111",border:"1.5px solid #ddd",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{icon&&<span style={{color:accent||"#D0021B",fontWeight:700}}>{icon}</span>}{children}</button>;}
function StyleBtn({active,onClick,children,accent}){const c=accent||"#D0021B";return <button onClick={onClick} style={{flex:1,padding:"9px 0",border:"2px solid",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,borderColor:active?c:"#e0e0e0",background:active?"#fff5f5":"#fff",color:active?c:"#666",transition:"all .15s"}}>{children}</button>;}
function FontColorRow({color,onChange,label="Font color"}){const[open,setOpen]=useState(false);return <div style={{marginBottom:open?0:4}}><div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginBottom:open?8:0}} onClick={()=>setOpen(o=>!o)}><div style={{width:16,height:16,borderRadius:3,background:color,border:"1px solid #ddd",flexShrink:0}}/><span style={{fontSize:11,color:"#aaa"}}>{label}</span><span style={{fontSize:10,color:"#ccc",marginLeft:"auto"}}>{open?"▲":"▼"}</span></div>{open&&<div style={{padding:"10px",background:"#fafafa",borderRadius:10,border:"1px solid #f0f0f0",marginBottom:10}}><ColorSwatches value={color} onChange={onChange}/><HexInput value={color} onChange={onChange}/></div>}</div>;}
function XYInputs({xVal,yVal,onX,onY}){return <div style={{display:"flex",gap:8,marginBottom:8}}><div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>X</div><input type="number" value={xVal} onChange={e=>onX(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/></div><div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Y</div><input type="number" value={yVal} onChange={e=>onY(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/></div></div>;}
function TopBar({onBack,name,size}){return <div style={{height:52,background:"#fff",borderBottom:"1px solid #e8e8e8",display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0,zIndex:10}}><button onClick={onBack} style={{width:32,height:32,border:"1px solid #e0e0e0",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:16,color:"#555",display:"flex",alignItems:"center",justifyContent:"center"}}>←</button><span style={{fontSize:14,fontWeight:600,color:"#111"}}>{name}</span><span style={{fontSize:12,color:"#888",background:"#f5f5f5",border:"1px solid #e0e0e0",borderRadius:6,padding:"2px 8px"}}>{size}</span></div>;}
function StatusBar({label}){return <div style={{height:36,background:"#fff",borderTop:"1px solid #e8e8e8",display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexShrink:0}}><div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e"}}/><span style={{fontSize:12,color:"#888"}}>{label}</span></div>;}
function SidebarTabBar({activeTab,setActiveTab}){return <div style={{display:"flex",borderBottom:"1px solid #e8e8e8",flexShrink:0}}>{[{id:"content",icon:"T"},{id:"visuals",icon:"🖼"}].map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,height:48,border:"none",cursor:"pointer",fontSize:t.id==="content"?18:15,background:"transparent",color:activeTab===t.id?"#D0021B":"#bbb",borderBottom:activeTab===t.id?"2px solid #D0021B":"2px solid transparent",transition:"all .15s"}}>{t.icon}</button>)}</div>;}
function PrimaryBtn({children,onClick,icon,disabled,color}){const bg=color||(disabled?"#f0f0f0":"#D0021B");return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"13px 0",background:bg,color:disabled?"#bbb":"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:disabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:disabled?"none":`0 2px 8px ${bg}55`}}>{icon&&<span>{icon}</span>}{children}</button>;}
function NumInput({label,value,onChange,min,max,step=1}){return <div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>{label}</div><input type="number" value={value} min={min} max={max} step={step} onChange={e=>onChange(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",color:"#111"}}/></div>;}
function SliderRow({label,value,onChange,min,max,step=0.01,display}){return <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#aaa"}}>{label}</span><span style={{fontSize:11,color:"#555",fontWeight:600}}>{display||value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{width:"100%",accentColor:"#6366f1"}}/></div>;}

const MAISON_NEUE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
/* Maison Neue mapped to Inter for preview; export uses canvas font rendering */
`;

/* ═══════════════════════════════════════════════════════════════
   EXPORT — SMALL BANNER
═══════════════════════════════════════════════════════════════ */
async function exportSmallBanner({title,subtitle,subtitleMode,discountValue,discountLang,showSubtitle,productImages,bgColor,bgImage,bgMode,bannerStyle,titleColor,subtitleColor,textOffsetX,textOffsetY,exportScale=1}){
  const PILL_W=361,PILL_H=90,R=16;
  const isFloating=bannerStyle==="floating";

  if(!isFloating){
    // Blocked: exactly 361×90 * exportScale
    const S=exportScale;
    const canvas=document.createElement("canvas");
    canvas.width=PILL_W*S;canvas.height=PILL_H*S;
    const ctx=canvas.getContext("2d");ctx.scale(S,S);
    ctx.save();roundRectPath(ctx,0,0,PILL_W,PILL_H,R);ctx.clip();
    if(bgMode==="image"&&bgImage){try{const bi=await loadImg(bgImage);ctx.drawImage(bi,0,0,PILL_W,PILL_H);}catch{ctx.fillStyle=bgColor;ctx.fillRect(0,0,PILL_W,PILL_H);}}
    else{const g=ctx.createLinearGradient(0,0,PILL_W,PILL_H);g.addColorStop(0,bgColor);g.addColorStop(1,darken(bgColor,30));ctx.fillStyle=g;ctx.fillRect(0,0,PILL_W,PILL_H);}
    const sh=ctx.createLinearGradient(0,0,0,PILL_H*.5);sh.addColorStop(0,"rgba(255,255,255,.11)");sh.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=sh;ctx.fillRect(0,0,PILL_W,PILL_H*.5);
    ctx.restore();
    const textX=16+(textOffsetX||0),textY=PILL_H/2+(textOffsetY||0);
    ctx.save();ctx.fillStyle=titleColor||"#fff";ctx.font=`800 15px 'MaisonNeueExt',sans-serif`;ctx.textBaseline="middle";
    const lines=(title||"Judul banner kamu").split("\n");const lh=15*1.1;let ty=textY-(showSubtitle?8:0)-lines.length*lh/2+lh/2;
    lines.forEach(l=>{ctx.fillText(l,textX,ty,PILL_W*.55);ty+=lh;});
    if(showSubtitle){ctx.fillStyle=subtitleColor||"#fff";if(subtitleMode==="discount"){ctx.font=`700 10px 'MaisonNeueExt',sans-serif`;ctx.globalAlpha=.9;const label=discountLang==="id"?"Diskon s.d. ":"Discount up to ";const labelW=ctx.measureText(label).width;ctx.fillText(label,textX,ty+2);ctx.globalAlpha=1;ctx.font=`800 14px 'MaisonNeueExt',sans-serif`;ctx.fillText(discountValue+"%",textX+labelW,ty+2);}else{ctx.font=`700 10px 'MaisonNeueExt',sans-serif`;ctx.globalAlpha=.88;ctx.fillText(subtitle,textX,ty+2,PILL_W*.55);ctx.globalAlpha=1;}}
    ctx.restore();
    const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="small-banner.png";a.click();URL.revokeObjectURL(url);
    return;
  }

  // FLOATING MODE:
  // Step 1: Pre-load all images and compute their rotated bounding boxes
  // so we know exactly how much to expand the canvas in each direction.
  const loaded=[];
  for(const pi of(productImages||[])){
    try{
      const img=await loadImg(pi.src);
      const iw=(pi.natW||img.naturalWidth)*pi.scale;
      const ih=(pi.natH||img.naturalHeight)*pi.scale;
      // Compute axis-aligned bounding box of the rotated image centered at (pi.x, PILL_TOP+pi.y)
      // We'll compute PILL_TOP later after we know expansion, so use pi.y for now (pill-relative)
      const rad=(pi.rotation||0)*Math.PI/180;
      const cos=Math.abs(Math.cos(rad)),sin=Math.abs(Math.sin(rad));
      const bw=iw*cos+ih*sin; // rotated bounding width
      const bh=iw*sin+ih*cos; // rotated bounding height
      loaded.push({pi,img,iw,ih,bw,bh});
    }catch{}
  }

  // Step 2: Compute how much extra space is needed beyond the pill in each direction.
  // pi.y is pill-relative: negative = above, >PILL_H = below, pi.x can be <0 or >PILL_W
  let extraTop=0,extraBottom=0,extraLeft=0,extraRight=0;
  for(const {pi,bw,bh} of loaded){
    const cx=pi.x;           // center x, pill-relative horizontally
    const cy=pi.y;           // center y, pill-relative vertically (0=pill top)
    const top=cy-bh/2;       // top edge of image, pill-relative
    const bottom=cy+bh/2;    // bottom edge
    const left=cx-bw/2;      // left edge
    const right=cx+bw/2;     // right edge
    if(top<0)         extraTop   =Math.max(extraTop,   Math.ceil(-top));
    if(bottom>PILL_H) extraBottom=Math.max(extraBottom,Math.ceil(bottom-PILL_H));
    if(left<0)        extraLeft  =Math.max(extraLeft,  Math.ceil(-left));
    if(right>PILL_W)  extraRight =Math.max(extraRight, Math.ceil(right-PILL_W));
  }

  // Pill origin in canvas coords
  const PILL_X=extraLeft;
  const PILL_TOP=extraTop;
  const CW=PILL_W+extraLeft+extraRight;
  const CH=PILL_H+extraTop+extraBottom;

  const S=exportScale;
  const canvas=document.createElement("canvas");
  canvas.width=CW*S;canvas.height=CH*S;
  const ctx=canvas.getContext("2d");ctx.scale(S,S);

  // Step 3: Draw pill at (PILL_X, PILL_TOP)
  ctx.save();
  roundRectPath(ctx,PILL_X,PILL_TOP,PILL_W,PILL_H,R);ctx.clip();
  if(bgMode==="image"&&bgImage){
    try{const bi=await loadImg(bgImage);ctx.drawImage(bi,PILL_X,PILL_TOP,PILL_W,PILL_H);}
    catch{ctx.fillStyle=bgColor;ctx.fillRect(PILL_X,PILL_TOP,PILL_W,PILL_H);}
  } else {
    const g=ctx.createLinearGradient(PILL_X,PILL_TOP,PILL_X+PILL_W,PILL_TOP+PILL_H);
    g.addColorStop(0,bgColor);g.addColorStop(1,darken(bgColor,30));
    ctx.fillStyle=g;ctx.fillRect(PILL_X,PILL_TOP,PILL_W,PILL_H);
  }
  const sh=ctx.createLinearGradient(0,PILL_TOP,0,PILL_TOP+PILL_H*.5);
  sh.addColorStop(0,"rgba(255,255,255,.11)");sh.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=sh;ctx.fillRect(PILL_X,PILL_TOP,PILL_W,PILL_H*.5);
  ctx.restore();

  // Step 4: Draw text inside pill
  const textX=PILL_X+16+(textOffsetX||0);
  const textY=PILL_TOP+PILL_H/2+(textOffsetY||0);
  ctx.save();ctx.fillStyle=titleColor||"#fff";ctx.font=`800 15px 'MaisonNeueExt',sans-serif`;ctx.textBaseline="middle";
  const lines=(title||"Judul banner kamu").split("\n");const lh=15*1.1;
  let ty=textY-(showSubtitle?8:0)-lines.length*lh/2+lh/2;
  lines.forEach(l=>{ctx.fillText(l,textX,ty,PILL_W*.55);ty+=lh;});
  if(showSubtitle){
    ctx.fillStyle=subtitleColor||"#fff";
    if(subtitleMode==="discount"){
      ctx.font=`700 10px 'MaisonNeueExt',sans-serif`;ctx.globalAlpha=.9;
      const label=discountLang==="id"?"Diskon s.d. ":"Discount up to ";
      const labelW=ctx.measureText(label).width;
      ctx.fillText(label,textX,ty+2);
      ctx.globalAlpha=1;ctx.font=`800 14px 'MaisonNeueExt',sans-serif`;
      ctx.fillText(discountValue+"%",textX+labelW,ty+2);
    } else {
      ctx.font=`700 10px 'MaisonNeueExt',sans-serif`;ctx.globalAlpha=.88;
      ctx.fillText(subtitle,textX,ty+2,PILL_W*.55);ctx.globalAlpha=1;
    }
  }
  ctx.restore();

  // Step 5: Draw product images at their canvas coords (PILL_X+pi.x, PILL_TOP+pi.y)
  for(const {pi,img,iw,ih} of loaded){
    ctx.save();
    ctx.translate(PILL_X+pi.x, PILL_TOP+pi.y);
    ctx.rotate((pi.rotation||0)*Math.PI/180);
    ctx.drawImage(img,-iw/2,-ih/2,iw,ih);
    ctx.restore();
  }

  const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;
  a.download="small-banner.png";
  a.click();URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT — BIG BANNER
═══════════════════════════════════════════════════════════════ */
async function exportBigBanner({title,titleColor,subtitle,subtitleColor,showSubtitle,logo,logoScale,logoX,logoY,heroImages,bgColor,bgImage,bgMode,textAlign,textOffsetX,textOffsetY,exportScale=1}){
  const W=360,H=250,R=16,S=exportScale;
  const canvas=document.createElement("canvas");canvas.width=W*S;canvas.height=H*S;
  const ctx=canvas.getContext("2d");ctx.scale(S,S);
  ctx.save();roundRectPath(ctx,0,0,W,H,R);ctx.clip();
  if(bgMode==="image"&&bgImage){try{const bi=await loadImg(bgImage);ctx.drawImage(bi,0,0,W,H);}catch{ctx.fillStyle=bgColor;ctx.fillRect(0,0,W,H);}}
  else{const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,bgColor);g.addColorStop(1,darken(bgColor,35));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  const sh=ctx.createLinearGradient(0,0,0,H*.4);sh.addColorStop(0,"rgba(255,255,255,.09)");sh.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=sh;ctx.fillRect(0,0,W,H*.4);
  for(const h of(heroImages||[])){try{const img=await loadImg(h.src);const iw=h.scale*140;const ih=iw*(img.naturalHeight/img.naturalWidth);ctx.drawImage(img,h.x,h.y,iw,ih);}catch{}}
  if(logo){try{const li=await loadImg(logo);const lh=26*logoScale;const lw=lh*(li.naturalWidth/li.naturalHeight);ctx.drawImage(li,logoX,logoY,lw,lh);}catch{}}
  ctx.restore();
  ctx.save();ctx.fillStyle=titleColor||"#fff";ctx.font=`800 13.5px 'MaisonNeueExt',sans-serif`;ctx.textBaseline="alphabetic";
  const ta=textAlign==="center"?"center":textAlign==="right"?"right":"left";const tox2=textOffsetX||0,toy2=textOffsetY||0;const tx=ta==="right"?W-20+tox2:ta==="center"?W/2+tox2:20+tox2;
  ctx.textAlign=ta;
  const ls=(title||"").split("\n").filter(Boolean);const lh2=13.5*1.2;let ty2=H-20-toy2-(ls.length-1)*lh2-(showSubtitle&&subtitle?18:0);
  ls.forEach(l=>{ctx.fillText(l,tx,ty2,W*.58);ty2+=lh2;});
  if(showSubtitle&&subtitle){ctx.fillStyle=subtitleColor||"rgba(255,255,255,.88)";ctx.font=`600 12px 'MaisonNeueExt',sans-serif`;ctx.fillText(subtitle,tx,ty2+4,W*.58);}
  ctx.restore();
  const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="big-banner.png";a.click();URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT — CUSTOM BANNER
═══════════════════════════════════════════════════════════════ */
async function exportCustomBanner({canvasW,canvasH,bgMode,bgColor,bgColor2,bgImage,cornerRadius,elements,exportScale=1}){
  const W=canvasW,H=canvasH,R=parseInt(cornerRadius)||0,S=exportScale;
  const canvas=document.createElement("canvas");canvas.width=W*S;canvas.height=H*S;
  const ctx=canvas.getContext("2d");ctx.scale(S,S);
  ctx.save();if(R>0){roundRectPath(ctx,0,0,W,H,R);ctx.clip();}
  if(bgMode==="image"&&bgImage){try{const bi=await loadImg(bgImage);ctx.drawImage(bi,0,0,W,H);}catch{ctx.fillStyle=bgColor||"#fff";ctx.fillRect(0,0,W,H);}}
  else if(bgMode==="gradient"){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,bgColor||"#6366f1");g.addColorStop(1,bgColor2||"#ec4899");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  else{ctx.fillStyle=bgColor||"#ffffff";ctx.fillRect(0,0,W,H);}
  ctx.restore();
  for(const el of elements){
    ctx.save();ctx.translate(el.x,el.y);ctx.rotate((el.rotation||0)*Math.PI/180);ctx.globalAlpha=el.opacity??1;
    if(el.type==="image"){try{const img=await loadImg(el.src);const iw=el.natW*el.scale,ih=el.natH*el.scale;ctx.drawImage(img,-iw/2,-ih/2,iw,ih);}catch{}}
    else if(el.type==="text"){
      const fs=el.fontSize||24;
      const tw=el.textW||300;
      ctx.font=`${el.fontWeight||700} ${fs}px ${(el.fontFamily||"'MaisonNeue',sans-serif").replace(/'/g,'"')}`;
      ctx.fillStyle=el.color||"#111";
      ctx.textAlign=el.align||"left";
      ctx.textBaseline="top";
      const xOff=el.align==="center"?tw/2:el.align==="right"?tw:0;
      // Word-wrap each line to fit within textW
      let row=0;
      (el.text||"Text").split("\n").forEach(line=>{
        const words=line.split(" ");
        let cur="";
        words.forEach(w=>{
          const test=cur?cur+" "+w:w;
          if(ctx.measureText(test).width>tw&&cur){
            ctx.fillText(cur,xOff,row*fs*1.2);row++;cur=w;
          } else cur=test;
        });
        ctx.fillText(cur,xOff,row*fs*1.2);row++;
      });
    }
    ctx.globalAlpha=1;ctx.restore();
  }
  const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`custom-banner-${W}x${H}.png`;a.click();URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   SMALL BANNER PREVIEW
═══════════════════════════════════════════════════════════════ */
const SBW=361,SBH=90,SBR=16,SB_SCALE=2;

function SmallBannerPreview({title,subtitle,subtitleMode,discountValue,discountLang,showSubtitle,productImages,bgColor,bgImage,bgMode,bannerStyle,titleColor,subtitleColor,onMouseDownItem,textAlign,textOffsetX,textOffsetY}){
  const useBg=bgMode==="image"&&bgImage;
  const gradient=useBg?"none":`linear-gradient(108deg,${bgColor} 0%,${darken(bgColor,30)} 100%)`;
  const isFloating=bannerStyle==="floating";

  // Compute dynamic expansion from product images (same logic as export)
  let extraTop=0,extraBottom=0,extraLeft=0,extraRight=0;
  if(isFloating){
    for(const pi of(productImages||[])){
      const iw=(pi.natW||100)*pi.scale,ih=(pi.natH||100)*pi.scale;
      const rad=(pi.rotation||0)*Math.PI/180;
      const cos=Math.abs(Math.cos(rad)),sin=Math.abs(Math.sin(rad));
      const bw=iw*cos+ih*sin,bh=iw*sin+ih*cos;
      const top=pi.y-bh/2,bottom=pi.y+bh/2,left=pi.x-bw/2,right=pi.x+bw/2;
      if(top<0)         extraTop   =Math.max(extraTop,   Math.ceil(-top));
      if(bottom>SBH)    extraBottom=Math.max(extraBottom,Math.ceil(bottom-SBH));
      if(left<0)        extraLeft  =Math.max(extraLeft,  Math.ceil(-left));
      if(right>SBW)     extraRight =Math.max(extraRight, Math.ceil(right-SBW));
    }
  }

  const pillOffsetX=extraLeft*SB_SCALE;
  const pillOffsetY=extraTop*SB_SCALE;
  const totalW=(SBW+extraLeft+extraRight)*SB_SCALE;
  const totalH=(SBH+extraTop+extraBottom)*SB_SCALE;

  return(
    <div style={{width:totalW,height:totalH,position:"relative",flexShrink:0}}>
      {/* Pill positioned at (pillOffsetX, pillOffsetY) */}
      <div style={{position:"absolute",left:pillOffsetX,top:pillOffsetY,width:SBW*SB_SCALE,height:SBH*SB_SCALE,borderRadius:SBR*SB_SCALE,overflow:"hidden",background:gradient,boxShadow:"0 4px 20px rgba(0,0,0,.18)"}}>
        {useBg&&<img src={bgImage} alt="bg" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0}}/>}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,.11) 0%,transparent 100%)",zIndex:1,borderRadius:`${SBR*SB_SCALE}px ${SBR*SB_SCALE}px 0 0`}}/>
        {(()=>{
          const aln=textAlign||"left";
          const tox=(textOffsetX||0)*SB_SCALE;
          const toy=(textOffsetY||0)*SB_SCALE;
          const posStyle=aln==="center"
            ?{left:"50%",transform:`translate(-50%,calc(-50% + ${toy}px))`,textAlign:"center",width:SBW*SB_SCALE*.55}
            :aln==="right"
            ?{right:16*SB_SCALE-tox,transform:`translateY(calc(-50% + ${toy}px))`,textAlign:"right",maxWidth:SBW*SB_SCALE*.6}
            :{left:16*SB_SCALE+tox,transform:`translateY(calc(-50% + ${toy}px))`,textAlign:"left",maxWidth:SBW*SB_SCALE*.55};
          return(
            <div style={{position:"absolute",top:"50%",zIndex:4,...posStyle}}>
              <div style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:800,fontSize:15*SB_SCALE,lineHeight:1.05,color:titleColor||"#fff",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{title||"Judul banner kamu"}</div>
              {showSubtitle&&<div style={{marginTop:2*SB_SCALE}}>
                {subtitleMode==="discount"
                  ?<div style={{display:"flex",alignItems:"baseline",gap:3*SB_SCALE,justifyContent:aln==="center"?"center":aln==="right"?"flex-end":"flex-start"}}>
                    <span style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:700,fontSize:10*SB_SCALE,lineHeight:1,color:subtitleColor||"#fff",opacity:.9}}>{discountLang==="id"?"Diskon s.d.":"Discount up to"}</span>
                    <span style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:800,fontSize:14*SB_SCALE,lineHeight:1,color:subtitleColor||"#fff"}}>{discountValue}%</span>
                  </div>
                  :<div style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:700,fontSize:10*SB_SCALE,lineHeight:1,color:subtitleColor||"#fff",opacity:.88}}>{subtitle}</div>
                }
              </div>}
            </div>
          );
        })()}
      </div>
      {/* Product images — coords are pill-relative, offset by pill position in container */}
      {(productImages||[]).map((pi,i)=>(
        <img key={i} src={pi.src} alt=""
          onMouseDown={e=>onMouseDownItem&&onMouseDownItem(e,`product-${i}`)}
          style={{
            position:"absolute",
            left:(extraLeft+pi.x)*SB_SCALE,
            top:(extraTop+pi.y)*SB_SCALE,
            width:(pi.natW||100)*pi.scale*SB_SCALE,
            height:"auto",
            objectFit:"contain",
            zIndex:5+i,
            filter:"drop-shadow(0 4px 14px rgba(0,0,0,.35))",
            userSelect:"none",
            cursor:"grab",
            transform:`translate(-50%,-50%) rotate(${pi.rotation||0}deg)`,
            transformOrigin:"center center",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BIG BANNER PREVIEW
═══════════════════════════════════════════════════════════════ */
const BBW=360,BBH=250,BBR=16,BB_SCALE=1.6;

function BigBannerPreview({title,titleColor,subtitle,subtitleColor,showSubtitle,logo,logoScale,logoX,logoY,heroImages,bgColor,bgImage,bgMode,textAlign,textOffsetX,textOffsetY,onMouseDownItem}){
  const useBg=bgMode==="image"&&bgImage;
  const gradient=useBg?"none":`linear-gradient(135deg,${bgColor} 0%,${darken(bgColor,35)} 100%)`;
  const tox=(textOffsetX||0)*BB_SCALE,toy=(textOffsetY||0)*BB_SCALE;
  const textPos=textAlign==="left"?{left:20*BB_SCALE+tox,textAlign:"left",maxWidth:BBW*.58*BB_SCALE}:textAlign==="right"?{right:20*BB_SCALE-tox,textAlign:"right",maxWidth:BBW*.58*BB_SCALE}:{left:`calc(50% + ${tox}px)`,transform:"translateX(-50%)",textAlign:"center",width:BBW*.7*BB_SCALE};
  return(
    <div style={{width:BBW*BB_SCALE,height:BBH*BB_SCALE,position:"relative",borderRadius:BBR*BB_SCALE,overflow:"hidden",background:gradient,boxShadow:"0 6px 32px rgba(0,0,0,.22)",flexShrink:0}}>
      {useBg&&<img src={bgImage} alt="bg" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0}}/>}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,.09) 0%,transparent 100%)",zIndex:1}}/>
      {(heroImages||[]).map((h,i)=>(
        <img key={i} src={h.src} alt="" onMouseDown={e=>onMouseDownItem&&onMouseDownItem(e,`hero-${i}`)}
          style={{position:"absolute",left:h.x*BB_SCALE,top:h.y*BB_SCALE,width:h.scale*BB_SCALE*140,height:"auto",objectFit:"contain",zIndex:2+i,filter:"drop-shadow(0 6px 22px rgba(0,0,0,.4))",userSelect:"none",cursor:"grab"}}/>
      ))}
      {logo&&<img src={logo} alt="logo" onMouseDown={e=>onMouseDownItem&&onMouseDownItem(e,"logo")}
        style={{position:"absolute",left:logoX*BB_SCALE,top:logoY*BB_SCALE,height:26*logoScale*BB_SCALE,width:"auto",objectFit:"contain",zIndex:10,userSelect:"none",cursor:"grab"}}/>}
      <div style={{position:"absolute",bottom:20*BB_SCALE-toy,zIndex:5,...textPos}}>
        <div style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:800,fontSize:13.5*BB_SCALE,lineHeight:1.15,color:titleColor||"#fff",whiteSpace:"pre-wrap",wordBreak:"break-word",textShadow:"0 2px 6px rgba(0,0,0,.25)"}}>{title||"Judul big banner kamu"}</div>
        {showSubtitle&&subtitle&&<div style={{fontFamily:"'MaisonNeueExt',sans-serif",fontWeight:600,fontSize:12*BB_SCALE,lineHeight:1.2,color:subtitleColor||"rgba(255,255,255,.88)",marginTop:5*BB_SCALE,textShadow:"0 1px 4px rgba(0,0,0,.2)"}}>{subtitle}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SMALL BANNER EDITOR
═══════════════════════════════════════════════════════════════ */
function SmallBannerEditor({onBack}){
  const [tab,setTab]=useState("content");
  const [title,setTitle]=useState("");const [subtitle,setSubtitle]=useState("");const [showSubtitle,setShowSubtitle]=useState(false);
  const [subtitleMode,setSubtitleMode]=useState("text");const [discountValue,setDiscountValue]=useState("25");const [discountLang,setDiscountLang]=useState("id");
  const [titleColor,setTitleColor]=useState("#ffffff");const [subtitleColor,setSubtitleColor]=useState("#ffffff");
  const [bannerStyle,setBannerStyle]=useState("floating");
  const [exportScale,setExportScale]=useState(2);
  const [textAlign,setTextAlign]=useState("left");
  const [textOffsetX,setTextOffsetX]=useState(0);
  const [textOffsetY,setTextOffsetY]=useState(0);
  const [productImages,setProductImages]=useState([]);
  const [bgMode,setBgMode]=useState("color");const [bgColor,setBgColor]=useState("#D0021B");const [bgImage,setBgImage]=useState(null);
  const [urlInput,setUrlInput]=useState("");const [exporting,setExporting]=useState(false);
  const fileRef=useRef(),bgRef=useRef();
  const dragTarget=useRef(null),dragStart=useRef({});

  const HEADROOM=bannerStyle==="floating"?60:0;
  const addFiles=e=>{Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>{const img=new Image();img.onload=()=>{
    const MAX=800;const scale=Math.min(1,MAX/Math.max(img.naturalWidth,img.naturalHeight));
    const nw=Math.round(img.naturalWidth*scale),nh=Math.round(img.naturalHeight*scale);
    let src=ev.target.result;
    if(scale<1){const c=document.createElement("canvas");c.width=nw;c.height=nh;c.getContext("2d").drawImage(img,0,0,nw,nh);src=c.toDataURL("image/png");}
    setProductImages(p=>[...p,{src,name:f.name,x:SBW*.72,y:SBH*.2,scale:.6,rotation:0,natW:nw,natH:nh}]);
  };img.src=ev.target.result;};r.readAsDataURL(f);});e.target.value="";};
  const addBg=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const img=new Image();img.onload=()=>{
    const MAX=1440;const scale=Math.min(1,MAX/Math.max(img.naturalWidth,img.naturalHeight));
    if(scale<1){const c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);setBgImage(c.toDataURL("image/jpeg",.9));}
    else setBgImage(ev.target.result);
  };img.src=ev.target.result;};r.readAsDataURL(f);e.target.value="";};
  const addUrl=()=>{if(!urlInput.trim())return;const img=new Image();img.crossOrigin="anonymous";img.onload=()=>setProductImages(p=>[...p,{src:urlInput.trim(),name:"URL image",x:SBW*.72,y:SBH*.2,scale:.6,rotation:0,natW:img.naturalWidth,natH:img.naturalHeight}]);img.src=urlInput.trim();setUrlInput("");};
  const updateProd=(i,patch)=>setProductImages(p=>p.map((h,j)=>j===i?{...h,...patch}:h));
  const removeProd=i=>setProductImages(p=>p.filter((_,j)=>j!==i));

  const onMouseDownItem=useCallback((e,target)=>{e.preventDefault();e.stopPropagation();dragTarget.current=target;const idx=parseInt(target.split("-")[1]);const h=productImages[idx];dragStart.current={mx:e.clientX,my:e.clientY,x:h.x,y:h.y,idx};},[productImages]);
  const onMM=useCallback(e=>{if(!dragTarget.current)return;const idx=dragStart.current.idx;const dx=(e.clientX-dragStart.current.mx)/SB_SCALE;const dy=(e.clientY-dragStart.current.my)/SB_SCALE;setProductImages(p=>p.map((h,j)=>j===idx?{...h,x:Math.round(dragStart.current.x+dx),y:Math.round(dragStart.current.y+dy)}:h));},[]);
  const onMU=useCallback(()=>{dragTarget.current=null;},[]);
  useEffect(()=>{window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);return()=>{window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseup",onMU);};},[onMM,onMU]);

  const doExport=async()=>{setExporting(true);try{await exportSmallBanner({title,subtitle,subtitleMode,discountValue,discountLang,showSubtitle,productImages,bgColor,bgImage,bgMode,bannerStyle,titleColor,subtitleColor,textOffsetX,textOffsetY,exportScale});}catch(ex){alert("Export failed: "+ex.message);}setExporting(false);};

  const ImgCard=({pi,i})=>(
    <div style={{background:"#fafafa",border:"1px solid #f0f0f0",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <img src={pi.src} alt="" style={{width:32,height:32,objectFit:"cover",borderRadius:6,border:"1px solid #eee"}}/>
        <span style={{fontSize:11,color:"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pi.name}</span>
        <button onClick={()=>removeProd(i)} style={{fontSize:13,color:"#e55",background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      <SliderRow label="Scale" value={pi.scale} onChange={v=>updateProd(i,{scale:v})} min={0.05} max={3} step={0.01} display={`${pi.scale.toFixed(2)}×`}/>
      <SliderRow label="Rotation" value={pi.rotation||0} onChange={v=>updateProd(i,{rotation:v})} min={-180} max={180} step={1} display={`${Math.round(pi.rotation||0)}°`}/>
      <XYInputs xVal={Math.round(pi.x)} yVal={Math.round(pi.y)} onX={v=>updateProd(i,{x:v})} onY={v=>updateProd(i,{y:v})}/>
    </div>
  );

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f5f5f5"}}>
      <TopBar onBack={onBack} name="Small Banner" size="361 × 90 px"/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,...DOT_BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <SmallBannerPreview title={title} subtitle={subtitle} subtitleMode={subtitleMode} discountValue={discountValue} discountLang={discountLang} showSubtitle={showSubtitle} productImages={productImages} bgColor={bgColor} bgImage={bgImage} bgMode={bgMode} bannerStyle={bannerStyle} titleColor={titleColor} subtitleColor={subtitleColor} onMouseDownItem={onMouseDownItem} textAlign={textAlign} textOffsetX={textOffsetX} textOffsetY={textOffsetY}/>
        </div>
        <div style={{width:SIDEBAR_W,background:"#fff",borderLeft:"1px solid #e8e8e8",display:"flex",flexDirection:"column",flexShrink:0}}>
          <SidebarTabBar activeTab={tab} setActiveTab={setTab}/>
          <div style={{flex:1,overflowY:"auto",padding:"18px 18px 20px"}}>
            {tab==="content"?(
              <>
                <div style={{fontSize:16,fontWeight:700,color:"#111",marginBottom:3}}>Banner creator</div>
                <div style={{fontSize:12,color:"#999",lineHeight:1.45,marginBottom:18}}>Capture attention with a clear and concise text overlay.</div>
                <SLabel sub="MaisonNeuExt ExtraBold · 15px · LH 100%">Title</SLabel>
                <textarea value={title} onChange={e=>setTitle(e.target.value.slice(0,365))} placeholder="e.g. Yang bikin harimu manis" rows={4} style={{width:"100%",padding:"10px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box",lineHeight:1.4,color:"#111",background:"#fff",marginTop:6,marginBottom:4}}/>
                <FontColorRow color={titleColor} onChange={setTitleColor}/>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><span style={{fontSize:11,color:"#ccc"}}>{title.length}/365</span></div>
                <Divider/>
                <SLabel>Text position</SLabel>
                <div style={{display:"flex",gap:6,marginTop:8,marginBottom:10}}>
                  {[{v:"left",l:"← Left"},{v:"center",l:"Center"},{v:"right",l:"Right →"}].map(a=><button key={a.v} onClick={()=>setTextAlign(a.v)} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,borderColor:textAlign===a.v?"#D0021B":"#e0e0e0",background:textAlign===a.v?"#fff5f5":"#fff",color:textAlign===a.v?"#D0021B":"#777"}}>{a.l}</button>)}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Offset X</div><input type="number" value={textOffsetX} onChange={e=>setTextOffsetX(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",color:"#111"}}/></div>
                  <div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Offset Y</div><input type="number" value={textOffsetY} onChange={e=>setTextOffsetY(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",color:"#111"}}/></div>
                </div>
                <Divider/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showSubtitle?12:0}}>
                  <SLabel>Subtitle</SLabel><Toggle checked={showSubtitle} onChange={setShowSubtitle}/>
                </div>
                {showSubtitle&&<>
                  <div style={{display:"flex",background:"#f5f5f5",borderRadius:8,padding:3,gap:2,marginBottom:10}}>
                    {[{v:"text",l:"Free text"},{v:"discount",l:"Discount"}].map(o=><button key={o.v} onClick={()=>setSubtitleMode(o.v)} style={{flex:1,padding:"7px 0",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500,background:subtitleMode===o.v?"#fff":"transparent",color:subtitleMode===o.v?"#111":"#999",boxShadow:subtitleMode===o.v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{o.l}</button>)}
                  </div>
                  {subtitleMode==="text"?<input value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="Subtitle text" style={{width:"100%",padding:"9px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box",color:"#111",background:"#fff",marginBottom:8}}/>:<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><input value={discountValue} onChange={e=>setDiscountValue(e.target.value)} placeholder="25" style={{width:60,padding:"9px 10px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,outline:"none",textAlign:"center",background:"#fff",color:"#111"}}/><span style={{color:"#aaa",fontSize:14}}>%</span><select value={discountLang} onChange={e=>setDiscountLang(e.target.value)} style={{padding:"9px 8px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:12,outline:"none",background:"#fff"}}><option value="id">ID</option><option value="en">EN</option></select></div>}
                  <FontColorRow color={subtitleColor} onChange={setSubtitleColor} label="Subtitle font color"/>
                </>}
              </>
            ):(
              <>
                <div style={{fontSize:16,fontWeight:700,color:"#111",marginBottom:3}}>Visuals and Style</div>
                <div style={{fontSize:12,color:"#999",marginBottom:18}}>Customize the look and feel.</div>
                <SLabel>Banner style</SLabel>
                <div style={{display:"flex",gap:8,marginTop:8,marginBottom:18}}>
                  <StyleBtn active={bannerStyle==="floating"} onClick={()=>setBannerStyle("floating")}>🖼 Floating (PNG)</StyleBtn>
                  <StyleBtn active={bannerStyle==="blocked"} onClick={()=>setBannerStyle("blocked")}>▬ Blocked</StyleBtn>
                </div>
                <Divider/>
                <SLabel sub="Drag on canvas · Scale, rotate and position freely.">Product Images</SLabel>
                <div style={{marginTop:8,marginBottom:8}}>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addFiles}/>
                  <OutlineBtn onClick={()=>fileRef.current.click()} icon="⊕" fullWidth>Add product image</OutlineBtn>
                </div>
                <div style={{fontSize:12,color:"#aaa",marginBottom:5}}>Or paste image URL</div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addUrl()} placeholder="https://..." style={{flex:1,padding:"8px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",background:"#fff",color:"#111"}}/>
                  <button onClick={addUrl} style={{padding:"8px 14px",background:"#D0021B",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Add</button>
                </div>
                {productImages.map((pi,i)=><ImgCard key={i} pi={pi} i={i}/>)}
                <Divider/>
                <SLabel>Background</SLabel>
                <div style={{display:"flex",gap:8,marginTop:8,marginBottom:14}}>
                  <StyleBtn active={bgMode==="color"} onClick={()=>setBgMode("color")}>🎨 Color</StyleBtn>
                  <StyleBtn active={bgMode==="image"} onClick={()=>setBgMode("image")}>🖼 Image</StyleBtn>
                </div>
                {bgMode==="color"?<><ColorSwatches value={bgColor} onChange={setBgColor}/><HexInput value={bgColor} onChange={setBgColor}/><ContrastWarning color={bgColor}/></>:<><input ref={bgRef} type="file" accept="image/*" style={{display:"none"}} onChange={addBg}/><OutlineBtn onClick={()=>bgRef.current.click()} icon="⊕" fullWidth>{bgImage?"Replace BG image":"Upload background image"}</OutlineBtn><div style={{fontSize:11,color:"#aaa",marginTop:5}}>Recommended: 361 × 90 px</div>{bgImage&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={bgImage} alt="bg" style={{width:48,height:24,objectFit:"cover",borderRadius:4,border:"1px solid #eee"}}/><button onClick={()=>setBgImage(null)} style={{fontSize:12,color:"#e55",background:"none",border:"none",cursor:"pointer"}}>Remove</button></div>}</>}
              </>
            )}
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid #f0f0f0",background:"#fff",flexShrink:0}}>
            {/* Export scale selector */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>Export resolution</div>
                  <div style={{display:"flex",gap:6}}>
                    {[1,2,3,4].map(s=><button key={s} onClick={()=>setExportScale(s)} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,borderColor:exportScale===s?"#D0021B":"#e0e0e0",background:exportScale===s?"#fff5f5":"#fff",color:exportScale===s?"#D0021B":"#777"}}>{s}×</button>)}
                  </div>
                  <div style={{fontSize:11,color:"#bbb",marginTop:5}}>{exportScale===1?"361 × 90 px":exportScale===2?"722 × 180 px":exportScale===3?"1083 × 270 px":"1444 × 360 px"}</div>
                </div>
            <PrimaryBtn icon={exporting?"⏳":"⬇"} onClick={doExport} disabled={exporting}>{exporting?"Exporting…":`Export PNG — ${exportScale}×`}</PrimaryBtn>
          </div>
        </div>
      </div>
      <StatusBar label={`True output: 361 × ${bannerStyle==="floating"?"auto (expands to fit images)":"90"} px · Previewed at 2×`}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BIG BANNER EDITOR
═══════════════════════════════════════════════════════════════ */
function BigBannerEditor({onBack}){
  const [tab,setTab]=useState("content");
  const [title,setTitle]=useState("");const [titleColor,setTitleColor]=useState("#ffffff");
  const [subtitle,setSubtitle]=useState("");const [subtitleColor,setSubtitleColor]=useState("#ffffff");
  const [showSubtitle,setShowSubtitle]=useState(false);const [textAlign,setTextAlign]=useState("left");const [textOffsetX,setTextOffsetX]=useState(0);const [textOffsetY,setTextOffsetY]=useState(0);const [exportScale,setExportScale]=useState(2);
  const [logo,setLogo]=useState(null);const [logoScale,setLogoScale]=useState(1);const [logoX,setLogoX]=useState(14);const [logoY,setLogoY]=useState(14);
  const [heroImages,setHeroImages]=useState([]);
  const [bgColor,setBgColor]=useState("#1B2D6B");const [bgImage,setBgImage]=useState(null);const [bgMode,setBgMode]=useState("color");
  const [exporting,setExporting]=useState(false);
  const logoRef=useRef(),heroRef=useRef(),bgRef=useRef();
  const dragTarget=useRef(null),dragStart=useRef({});

  const loadFile=(ref,cb)=>{ref.current.click();ref.current.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>cb(ev.target.result,f.name);r.readAsDataURL(f);e.target.value="";};};
  const addHero=()=>loadFile(heroRef,(src,name)=>{const img=new Image();img.onload=()=>{
    const MAX=800;const scale=Math.min(1,MAX/Math.max(img.naturalWidth,img.naturalHeight));
    const nw=Math.round(img.naturalWidth*scale),nh=Math.round(img.naturalHeight*scale);
    let rsrc=src;
    if(scale<1){const c=document.createElement("canvas");c.width=nw;c.height=nh;c.getContext("2d").drawImage(img,0,0,nw,nh);rsrc=c.toDataURL("image/png");}
    setHeroImages(p=>[...p,{src:rsrc,name:name||"Hero image",x:100,y:20,scale:1,rotation:0,natW:nw,natH:nh}]);
  };img.src=src;});
  const updateHero=(i,patch)=>setHeroImages(p=>p.map((h,j)=>j===i?{...h,...patch}:h));
  const removeHero=i=>setHeroImages(p=>p.filter((_,j)=>j!==i));

  const onMouseDownItem=useCallback((e,target)=>{
    e.preventDefault();e.stopPropagation();dragTarget.current=target;
    if(target==="logo"){dragStart.current={mx:e.clientX,my:e.clientY,x:logoX,y:logoY};}
    else{const idx=parseInt(target.split("-")[1]);const h=heroImages[idx];dragStart.current={mx:e.clientX,my:e.clientY,x:h.x,y:h.y,idx};}
  },[logoX,logoY,heroImages]);
  const onMM=useCallback(e=>{
    if(!dragTarget.current)return;
    const dx=(e.clientX-dragStart.current.mx)/BB_SCALE,dy=(e.clientY-dragStart.current.my)/BB_SCALE;
    if(dragTarget.current==="logo"){setLogoX(Math.round(dragStart.current.x+dx));setLogoY(Math.round(dragStart.current.y+dy));}
    else{const idx=dragStart.current.idx;setHeroImages(p=>p.map((h,j)=>j===idx?{...h,x:Math.round(dragStart.current.x+dx),y:Math.round(dragStart.current.y+dy)}:h));}
  },[]);
  const onMU=useCallback(()=>{dragTarget.current=null;},[]);
  useEffect(()=>{window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);return()=>{window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseup",onMU);};},[onMM,onMU]);

  const doExport=async()=>{setExporting(true);try{await exportBigBanner({title,titleColor,subtitle,subtitleColor,showSubtitle,logo,logoScale,logoX,logoY,heroImages,bgColor,bgImage,bgMode,textAlign,textOffsetX,textOffsetY,exportScale});}catch(ex){alert("Export failed: "+ex.message);}setExporting(false);};

  const HeroCard=({h,i})=>(
    <div style={{background:"#fafafa",border:"1px solid #f0f0f0",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <img src={h.src} alt="" style={{width:32,height:32,objectFit:"cover",borderRadius:6,border:"1px solid #eee"}}/>
        <span style={{fontSize:11,color:"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
        <button onClick={()=>removeHero(i)} style={{fontSize:13,color:"#e55",background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      <SliderRow label="Scale" value={h.scale} onChange={v=>updateHero(i,{scale:v})} min={0.1} max={4} step={0.01} display={`${h.scale.toFixed(2)}×`}/>
      <SliderRow label="Rotation" value={h.rotation||0} onChange={v=>updateHero(i,{rotation:v})} min={-180} max={180} step={1} display={`${Math.round(h.rotation||0)}°`}/>
      <XYInputs xVal={Math.round(h.x)} yVal={Math.round(h.y)} onX={v=>updateHero(i,{x:v})} onY={v=>updateHero(i,{y:v})}/>
    </div>
  );

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f5f5f5"}}>
      <TopBar onBack={onBack} name="Big Banner" size="360 × 250 px"/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,...DOT_BG,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default"}}>
          <BigBannerPreview title={title} titleColor={titleColor} subtitle={subtitle} subtitleColor={subtitleColor} showSubtitle={showSubtitle} logo={logo} logoScale={logoScale} logoX={logoX} logoY={logoY} heroImages={heroImages} bgColor={bgColor} bgImage={bgImage} bgMode={bgMode} textAlign={textAlign} textOffsetX={textOffsetX} textOffsetY={textOffsetY} onMouseDownItem={onMouseDownItem}/>
        </div>
        <div style={{width:SIDEBAR_W,background:"#fff",borderLeft:"1px solid #e8e8e8",display:"flex",flexDirection:"column",flexShrink:0}}>
          <SidebarTabBar activeTab={tab} setActiveTab={setTab}/>
          <div style={{flex:1,overflowY:"auto",padding:"18px 18px 20px"}}>
            {tab==="content"?(
              <>
                <div style={{fontSize:16,fontWeight:700,color:"#111",marginBottom:3}}>Banner creator</div>
                <div style={{fontSize:12,color:"#999",lineHeight:1.45,marginBottom:18}}>Design a rich full-width banner that showcases your brand and offer.</div>
                <SLabel sub="MaisonNeuExt ExtraBold · 13.5px · LH 100%">Title</SLabel>
                <textarea value={title} onChange={e=>setTitle(e.target.value.slice(0,365))} placeholder="e.g. Anywhere. Anytime." rows={3} style={{width:"100%",padding:"10px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box",lineHeight:1.4,color:"#111",background:"#fff",marginTop:6,marginBottom:4}}/>
                <FontColorRow color={titleColor} onChange={setTitleColor}/>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><span style={{fontSize:11,color:"#ccc"}}>{title.length}/365</span></div>
                <Divider/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showSubtitle?12:0}}>
                  <SLabel sub="MaisonNeuExt Demi · 12px">Subtitle</SLabel><Toggle checked={showSubtitle} onChange={setShowSubtitle}/>
                </div>
                {showSubtitle&&<><input value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="Detail text" style={{width:"100%",padding:"9px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box",color:"#111",background:"#fff",marginBottom:8}}/><FontColorRow color={subtitleColor} onChange={setSubtitleColor} label="Subtitle font color"/></>}
                <Divider/>
                <SLabel>Text alignment</SLabel>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  {[{v:"left",l:"← Left"},{v:"center",l:"Center"},{v:"right",l:"Right →"}].map(a=><button key={a.v} onClick={()=>setTextAlign(a.v)} style={{flex:1,padding:"8px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,borderColor:textAlign===a.v?"#D0021B":"#e0e0e0",background:textAlign===a.v?"#fff5f5":"#fff",color:textAlign===a.v?"#D0021B":"#777"}}>{a.l}</button>)}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Offset X</div><input type="number" value={textOffsetX} onChange={e=>setTextOffsetX(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",color:"#111"}}/></div>
                  <div style={{flex:1}}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Offset Y</div><input type="number" value={textOffsetY} onChange={e=>setTextOffsetY(+e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box",background:"#fff",color:"#111"}}/></div>
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:16,fontWeight:700,color:"#111",marginBottom:3}}>Visuals and Style</div>
                <div style={{fontSize:12,color:"#999",marginBottom:18}}>Customize the look and feel.</div>
                <SLabel>Brand Logo</SLabel>
                <div style={{marginTop:8,marginBottom:8}}>
                  <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}}/>
                  <OutlineBtn onClick={()=>loadFile(logoRef,(src)=>setLogo(src))} icon="⊕" fullWidth>{logo?"Replace logo":"Upload logo"}</OutlineBtn>
                </div>
                {logo&&<>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><img src={logo} alt="logo" style={{height:28,width:"auto",objectFit:"contain",maxWidth:90,borderRadius:4,border:"1px solid #f0f0f0"}}/><button onClick={()=>setLogo(null)} style={{fontSize:12,color:"#e55",background:"none",border:"none",cursor:"pointer",marginLeft:"auto"}}>Remove</button></div>
                  <div style={{fontSize:11,color:"#888",background:"#f5f5f5",borderRadius:8,padding:"7px 10px",marginBottom:10}}>💡 Drag logo on canvas to reposition.</div>
                  <SliderRow label="Size" value={logoScale} onChange={setLogoScale} min={0.3} max={4} step={0.05} display={`${logoScale.toFixed(1)}×`}/>
                  <XYInputs xVal={Math.round(logoX)} yVal={Math.round(logoY)} onX={setLogoX} onY={setLogoY}/>
                </>}
                <Divider/>
                <SLabel sub="Drag on canvas · Scale and rotate freely.">Hero Images</SLabel>
                <div style={{marginTop:8,marginBottom:8}}>
                  <input ref={heroRef} type="file" accept="image/*" style={{display:"none"}}/>
                  <OutlineBtn onClick={addHero} icon="⊕" fullWidth>Add hero image</OutlineBtn>
                </div>
                {heroImages.length>0&&<div style={{fontSize:11,color:"#888",background:"#f5f5f5",borderRadius:8,padding:"7px 10px",marginBottom:10}}>💡 Drag any image on canvas to reposition.</div>}
                {heroImages.map((h,i)=><HeroCard key={i} h={h} i={i}/>)}
                <Divider/>
                <SLabel>Background</SLabel>
                <div style={{display:"flex",gap:8,marginTop:8,marginBottom:14}}>
                  <StyleBtn active={bgMode==="color"} onClick={()=>setBgMode("color")}>🎨 Color</StyleBtn>
                  <StyleBtn active={bgMode==="image"} onClick={()=>setBgMode("image")}>🖼 Image</StyleBtn>
                </div>
                {bgMode==="color"?<><ColorSwatches value={bgColor} onChange={setBgColor}/><HexInput value={bgColor} onChange={setBgColor}/><ContrastWarning color={bgColor}/></>:<><input ref={bgRef} type="file" accept="image/*" style={{display:"none"}}/><OutlineBtn onClick={()=>loadFile(bgRef,(src)=>setBgImage(src))} icon="⊕" fullWidth>{bgImage?"Replace BG image":"Upload background image"}</OutlineBtn><div style={{fontSize:11,color:"#aaa",marginTop:5}}>Recommended: 360 × 250 px</div>{bgImage&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={bgImage} alt="bg" style={{width:56,height:32,objectFit:"cover",borderRadius:4,border:"1px solid #eee"}}/><button onClick={()=>setBgImage(null)} style={{fontSize:12,color:"#e55",background:"none",border:"none",cursor:"pointer"}}>Remove</button></div>}</>}
              </>
            )}
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid #f0f0f0",background:"#fff",flexShrink:0}}>
            {/* Export scale selector */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>Export resolution</div>
                  <div style={{display:"flex",gap:6}}>
                    {[1,2,3,4].map(s=><button key={s} onClick={()=>setExportScale(s)} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,borderColor:exportScale===s?"#D0021B":"#e0e0e0",background:exportScale===s?"#fff5f5":"#fff",color:exportScale===s?"#D0021B":"#777"}}>{s}×</button>)}
                  </div>
                  <div style={{fontSize:11,color:"#bbb",marginTop:5}}>{exportScale===1?"360 × 250 px":exportScale===2?"720 × 500 px":exportScale===3?"1080 × 750 px":"1440 × 1000 px"}</div>
                </div>
            <PrimaryBtn icon={exporting?"⏳":"⬇"} onClick={doExport} disabled={exporting}>{exporting?"Exporting…":`Export PNG — ${exportScale}×`}</PrimaryBtn>
          </div>
        </div>
      </div>
      <StatusBar label="True output: 360 × 250 px · Previewed at 1.6×"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM BANNER — TRANSFORM HANDLE OVERLAY
═══════════════════════════════════════════════════════════════ */
function TransformHandles({el,dscale,canvasRef,onDragStart,onScaleStart,onRotateStart}){
  if(!el)return null;
  const W=(el.type==="image"?(el.natW||100)*el.scale:(el.dispW||120))*dscale;
  const H=(el.type==="image"?(el.natH||80)*el.scale:(el.dispH||36))*dscale;
  const cx=el.x*dscale, cy=el.y*dscale;
  const rot=el.rotation||0;
  const HS=10; // handle size px
  const ROTLINE=32; // px above box
  const corners=[
    {key:"nw",cx:-W/2,cy:-H/2,cursor:"nw-resize"},
    {key:"ne",cx: W/2,cy:-H/2,cursor:"ne-resize"},
    {key:"se",cx: W/2,cy: H/2,cursor:"se-resize"},
    {key:"sw",cx:-W/2,cy: H/2,cursor:"sw-resize"},
  ];
  const hw={position:"absolute",width:HS,height:HS,borderRadius:"50%",background:"#fff",border:"2px solid #6366f1",boxShadow:"0 1px 5px rgba(0,0,0,.25)",transform:"translate(-50%,-50%)",zIndex:20,pointerEvents:"all"};
  return(
    <div style={{position:"absolute",left:cx,top:cy,pointerEvents:"none",zIndex:15}}>
      <div style={{position:"absolute",transform:`rotate(${rot}deg)`,transformOrigin:"0 0"}}>
        {/* Bounding box */}
        <div style={{position:"absolute",left:-W/2,top:-H/2,width:W,height:H,border:"2px solid #6366f1",borderRadius:3,boxSizing:"border-box",pointerEvents:"none"}}/>
        {/* Rotation line */}
        <div style={{position:"absolute",left:-1,top:-H/2-ROTLINE,width:2,height:ROTLINE,background:"#6366f1",transform:"translateX(-50%)"}}/>
        {/* Rotation handle */}
        <div onMouseDown={e=>{e.stopPropagation();onRotateStart(e);}}
          style={{...hw,left:0,top:-H/2-ROTLINE,background:"#6366f1",border:"2px solid #fff",cursor:"crosshair"}}/>
        {/* Corner scale handles */}
        {corners.map(c=>(
          <div key={c.key} onMouseDown={e=>{e.stopPropagation();onScaleStart(e,c.key);}}
            style={{...hw,left:c.cx,top:c.cy,cursor:c.cursor}}/>
        ))}
        {/* Center move handle */}
        <div onMouseDown={e=>{e.stopPropagation();onDragStart(e);}}
          style={{position:"absolute",left:-W/2,top:-H/2,width:W,height:H,cursor:"move",zIndex:18,pointerEvents:"all"}}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM BANNER — ELEMENT PANEL (must be outside CustomBannerEditor
   so React never remounts it on re-render, preserving textarea focus)
═══════════════════════════════════════════════════════════════ */
function ElPanel({selected,updateEl,removeEl,bringFwd,sendBk}){
  if(!selected)return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"80%",color:"#ccc",gap:10,textAlign:"center",padding:24}}>
      <div style={{fontSize:36}}>✦</div>
      <div style={{fontSize:13,fontWeight:600,color:"#aaa"}}>No element selected</div>
      <div style={{fontSize:12,color:"#ccc",lineHeight:1.5}}>Click an element on the canvas to edit it, or use the buttons above to add new elements.</div>
    </div>
  );
  return(
    <>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"10px 12px",background:"#f5f3ff",borderRadius:10,border:"1.5px solid #e0e7ff"}}>
        <span style={{fontSize:16}}>{selected.type==="image"?"🖼":"T"}</span>
        <span style={{fontSize:12,fontWeight:600,color:"#6366f1",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.type==="text"?(selected.text||"Text").slice(0,24):selected.name}</span>
        <button onClick={()=>bringFwd(selected.id)} title="Move forward" style={{fontSize:11,padding:"3px 6px",border:"1px solid #e0e0e0",borderRadius:5,cursor:"pointer",background:"#fff",color:"#666"}}>↑</button>
        <button onClick={()=>sendBk(selected.id)} title="Move backward" style={{fontSize:11,padding:"3px 6px",border:"1px solid #e0e0e0",borderRadius:5,cursor:"pointer",background:"#fff",color:"#666"}}>↓</button>
        <button onClick={()=>removeEl(selected.id)} style={{fontSize:13,color:"#e55",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button>
      </div>
      <SLabel>Transform</SLabel>
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:8}}>
        <NumInput label="X" value={Math.round(selected.x)} onChange={v=>updateEl(selected.id,{x:v})}/>
        <NumInput label="Y" value={Math.round(selected.y)} onChange={v=>updateEl(selected.id,{y:v})}/>
      </div>
      {selected.type==="text"?(<>
        <SliderRow label="Font size" value={selected.fontSize||36} onChange={v=>updateEl(selected.id,{fontSize:Math.max(6,Math.round(v))})} min={6} max={300} step={1} display={`${Math.round(selected.fontSize||36)}px`}/>
        <SliderRow label="Text width" value={selected.textW||300} onChange={v=>updateEl(selected.id,{textW:Math.max(40,Math.round(v)),dispW:Math.max(40,Math.round(v))})} min={40} max={2000} step={1} display={`${Math.round(selected.textW||300)}px`}/>
      </>):(<SliderRow label="Scale" value={selected.scale||1} onChange={v=>updateEl(selected.id,{scale:v,dispW:(selected.natW||selected.dispW||120)*v,dispH:(selected.natH||selected.dispH||36)*v})} min={0.02} max={5} step={0.01} display={`${(selected.scale||1).toFixed(2)}×`}/>)}
      <SliderRow label="Rotation" value={selected.rotation||0} onChange={v=>updateEl(selected.id,{rotation:v})} min={-180} max={180} step={1} display={`${Math.round(selected.rotation||0)}°`}/>
      <SliderRow label="Opacity" value={selected.opacity??1} onChange={v=>updateEl(selected.id,{opacity:v})} min={0} max={1} step={0.01} display={`${Math.round((selected.opacity??1)*100)}%`}/>
      {selected.type==="text"&&<>
        <Divider/>
        <SLabel>Text Content</SLabel>
        <textarea value={selected.text} onChange={e=>updateEl(selected.id,{text:e.target.value})} rows={3}
          style={{width:"100%",padding:"9px 12px",border:"1px solid #e0e0e0",borderRadius:10,fontSize:13,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box",color:"#111",background:"#fff",marginTop:6,marginBottom:10}}/>
        <SLabel>Typography</SLabel>
        <div style={{display:"flex",gap:8,marginTop:6,marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Weight</div>
            <select value={selected.fontWeight||700} onChange={e=>updateEl(selected.id,{fontWeight:+e.target.value})}
              style={{width:"100%",padding:"7px 8px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",background:"#fff",color:"#111"}}>
              {[300,400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"#aaa",marginBottom:5}}>Font family</div>
          <select value={selected.fontFamily||"'MaisonNeue',sans-serif"} onChange={e=>{
            const opt=[
              {v:"'MaisonNeueExt',sans-serif",w:800},
              {v:"'MaisonNeueExt',sans-serif",w:700},
              {v:"'MaisonNeue',sans-serif",w:400},
              {v:"'MaisonNeue',sans-serif",w:300},
              {v:"'MaisonNeueMono',monospace",w:400},
            ].find(o=>o.v===e.target.value);
            updateEl(selected.id,{fontFamily:e.target.value,...(opt?.w?{fontWeight:opt.w}:{})});
          }}
            style={{width:"100%",padding:"7px 8px",border:"1px solid #e0e0e0",borderRadius:8,fontSize:12,outline:"none",background:"#fff",color:"#111"}}>
            {[
              {v:"'MaisonNeueExt',sans-serif",l:"Maison Neue Ext ExtraBold"},
              {v:"'MaisonNeueExt',sans-serif",l:"Maison Neue Ext Bold"},
              {v:"'MaisonNeue',sans-serif",l:"Maison Neue Book"},
              {v:"'MaisonNeue',sans-serif",l:"Maison Neue Light"},
              {v:"'MaisonNeueMono',monospace",l:"Maison Neue Mono"},
              {v:"serif",l:"Serif"},
              {v:"monospace",l:"Monospace"},
            ].map(f=><option key={f.l} value={f.v}>{f.l}</option>)}
          </select>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"#aaa",marginBottom:5}}>Alignment</div>
          <div style={{display:"flex",gap:4}}>
            {["left","center","right"].map(a=><button key={a} onClick={()=>updateEl(selected.id,{align:a})} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:13,borderColor:selected.align===a?"#6366f1":"#e0e0e0",background:selected.align===a?"#f5f3ff":"#fff",color:selected.align===a?"#6366f1":"#888"}}>{a==="left"?"⬅":a==="center"?"↔":"➡"}</button>)}
          </div>
        </div>
        <FontColorRow color={selected.color||"#111111"} onChange={v=>updateEl(selected.id,{color:v})} label="Text color"/>
      </>}
      {selected.type==="image"&&<>
        <Divider/>
        <div style={{textAlign:"center"}}><img src={selected.src} alt="" style={{maxWidth:"100%",maxHeight:72,objectFit:"contain",borderRadius:6,border:"1px solid #eee"}}/></div>
      </>}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM BANNER EDITOR
═══════════════════════════════════════════════════════════════ */
let _eid=100;
const newId=()=>String(++_eid);

function CustomBannerEditor({onBack}){
  const [canvasW,setCanvasW]=useState(800);
  const [canvasH,setCanvasH]=useState(400);
  const [cornerRadius,setCornerRadius]=useState(0);
  const [bgMode,setBgMode]=useState("color");
  const [bgColor,setBgColor]=useState("#ffffff");
  const [bgColor2,setBgColor2]=useState("#6366f1");
  const [bgImage,setBgImage]=useState(null);
  const [elements,setElements]=useState([]);
  const [selectedId,setSelectedId]=useState(null);
  const [sideTab,setSideTab]=useState("canvas");
  const [exporting,setExporting]=useState(false);

  const canvasAreaRef=useRef();
  const imgRef=useRef(),bgRef=useRef();
  const op=useRef({type:null,id:null,data:{}}); // active drag operation

  // Display scale — fit banner into canvas area
  const [areaSize,setAreaSize]=useState({w:800,h:500});
  useEffect(()=>{
    const measure=()=>{
      const el=canvasAreaRef.current;
      if(el)setAreaSize({w:el.offsetWidth,h:el.offsetHeight});
    };
    measure();window.addEventListener("resize",measure);return()=>window.removeEventListener("resize",measure);
  },[]);
  const DSCALE=Math.min((areaSize.w-64)/canvasW,(areaSize.h-64)/canvasH,2);

  const selected=elements.find(e=>e.id===selectedId)||null;
  const updateEl=(id,patch)=>setElements(p=>p.map(e=>e.id===id?{...e,...patch}:e));
  const removeEl=id=>{
    setElements(p=>p.filter(e=>e.id!==id));
    if(selectedId===id)setSelectedId(null);
    delete textElRefs.current[id];
    delete lastMeasured.current[id];
  };
  const bringFwd=id=>setElements(p=>{const i=p.findIndex(e=>e.id===id);if(i>=p.length-1)return p;const a=[...p];[a[i],a[i+1]]=[a[i+1],a[i]];return a;});
  const sendBk=id=>setElements(p=>{const i=p.findIndex(e=>e.id===id);if(i<=0)return p;const a=[...p];[a[i],a[i-1]]=[a[i-1],a[i]];return a;});

  const addText=()=>{
    const id=newId();
    setElements(p=>[...p,{id,type:"text",text:"Your text here",x:canvasW/2,y:canvasH/2,scale:1,rotation:0,opacity:1,fontSize:36,fontWeight:700,fontFamily:"'MaisonNeue',sans-serif",color:"#111111",align:"center",textW:Math.round(canvasW*0.4),dispW:Math.round(canvasW*0.4),dispH:44}]);
    setSelectedId(id);setSideTab("element");
  };

  const addImage=()=>{
    imgRef.current.click();
    imgRef.current.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        const img=new Image();
        img.onload=()=>{
          const id=newId();
          const maxW=canvasW*.5,sc=img.naturalWidth>maxW?maxW/img.naturalWidth:1;
          setElements(p=>[...p,{id,type:"image",src:ev.target.result,name:f.name,x:canvasW/2,y:canvasH/2,scale:sc,rotation:0,opacity:1,natW:img.naturalWidth,natH:img.naturalHeight}]);
          setSelectedId(id);setSideTab("element");
        };img.src=ev.target.result;
      };reader.readAsDataURL(f);e.target.value="";
    };
  };

  const addBgImg=()=>{
    bgRef.current.click();
    bgRef.current.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setBgImage(ev.target.result);r.readAsDataURL(f);e.target.value="";};
  };

  /* ── DRAG / SCALE / ROTATE ── */
  const startDrag=useCallback((e,id)=>{
    e.preventDefault();e.stopPropagation();
    const el=elements.find(x=>x.id===id);if(!el)return;
    op.current={type:"drag",id,data:{mx:e.clientX,my:e.clientY,x:el.x,y:el.y}};
    setSelectedId(id);setSideTab("element");
  },[elements]);

  const startScale=useCallback((e,id,corner)=>{
    e.preventDefault();e.stopPropagation();
    const el=elements.find(x=>x.id===id);if(!el)return;
    const canvasRect=canvasAreaRef.current.getBoundingClientRect();
    const canvasLeft=canvasRect.left+(canvasRect.width-canvasW*DSCALE)/2;
    const canvasTop=canvasRect.top+(canvasRect.height-canvasH*DSCALE)/2;
    const screenCX=canvasLeft+el.x*DSCALE;
    const screenCY=canvasTop+el.y*DSCALE;
    const dx=e.clientX-screenCX, dy=e.clientY-screenCY;
    const startDist=Math.sqrt(dx*dx+dy*dy)||1;
    op.current={type:"scale",id,data:{startDist,startScale:el.scale,startFontSize:el.fontSize||36,startTextW:el.textW||300,corner,screenCX,screenCY}};
  },[elements,canvasW,canvasH,DSCALE]);

  const startRotate=useCallback((e,id)=>{
    e.preventDefault();
    const el=elements.find(x=>x.id===id);if(!el)return;
    const canvasRect=canvasAreaRef.current.getBoundingClientRect();
    // Canvas center of element in screen space
    const canvasLeft=canvasRect.left+(canvasRect.width-canvasW*DSCALE)/2;
    const canvasTop=canvasRect.top+(canvasRect.height-canvasH*DSCALE)/2;
    const screenX=canvasLeft+el.x*DSCALE;
    const screenY=canvasTop+el.y*DSCALE;
    op.current={type:"rotate",id,data:{cx:screenX,cy:screenY,startRot:el.rotation||0,startAngle:Math.atan2(e.clientY-screenY,e.clientX-screenX)*180/Math.PI}};
  },[elements,canvasW,canvasH,DSCALE]);

  const selectCanvas=useCallback(e=>{
    if(e.target===e.currentTarget)setSelectedId(null);
  },[]);

  useEffect(()=>{
    const onMM=e=>{
      const o=op.current;if(!o.type)return;
      if(o.type==="drag"){
        const dx=(e.clientX-o.data.mx)/DSCALE,dy=(e.clientY-o.data.my)/DSCALE;
        updateEl(o.id,{x:Math.round(o.data.x+dx),y:Math.round(o.data.y+dy)});
      } else if(o.type==="scale"){
        const dx=e.clientX-o.data.screenCX, dy=e.clientY-o.data.screenCY;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const ratio=dist/o.data.startDist;
        setElements(p=>p.map(el=>{
          if(el.id!==o.id)return el;
          if(el.type==="text"){
            // Text: horizontal corners resize textW, vertical corners resize fontSize
            const c=o.data.corner;
            const isHoriz=c==="ne"||c==="se"||c==="nw"||c==="sw";
            const newTextW=Math.max(40,Math.round(o.data.startTextW*ratio));
            const newFs=Math.max(6,Math.round(o.data.startFontSize*ratio));
            // nw/ne = width only, se/sw = both, but simplest: all corners scale width, shift+corner scales font
            return{...el,textW:newTextW,dispW:newTextW};
          } else {
            // Image: scale the scale prop
            const newScale=Math.max(0.02,+(o.data.startScale*ratio).toFixed(3));
            return{...el,scale:newScale,dispW:(el.natW||el.dispW||120)*newScale,dispH:(el.natH||el.dispH||36)*newScale};
          }
        }));
      } else if(o.type==="rotate"){
        const angle=Math.atan2(e.clientY-o.data.cy,e.clientX-o.data.cx)*180/Math.PI;
        const delta=angle-o.data.startAngle;
        updateEl(o.id,{rotation:Math.round(o.data.startRot+delta)});
      }
    };
    const onMU=()=>{op.current={type:null,id:null,data:{}};};
    window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);
    return()=>{window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseup",onMU);};
  },[DSCALE]);

  const textElRefs=useRef({}); // id -> DOM node
  const lastMeasured=useRef({}); // id -> {w,h} last measured

  // After paint, measure text elements and sync dispW/dispH only when they actually changed.
  // Using a ref to track last measured so we never trigger a re-render loop.
  useEffect(()=>{
    const patches=[];
    elements.forEach(el=>{
      if(el.type!=="text")return;
      const node=textElRefs.current[el.id];
      if(!node)return;
      const rw=Math.ceil(node.offsetWidth/DSCALE);
      const rh=Math.ceil(node.offsetHeight/DSCALE);
      const last=lastMeasured.current[el.id];
      if(!last||last.w!==rw||last.h!==rh){
        lastMeasured.current[el.id]={w:rw,h:rh};
        patches.push({id:el.id,dispW:rw,dispH:rh});
      }
    });
    if(patches.length>0){
      setElements(p=>p.map(el=>{
        const patch=patches.find(x=>x.id===el.id);
        return patch?{...el,...patch}:el;
      }));
    }
  },[elements,DSCALE]);
  const [exportScale,setExportScale]=useState(1);
  const doExport=async()=>{
    setExporting(true);
    try{await exportCustomBanner({canvasW,canvasH,bgMode,bgColor,bgColor2,bgImage,cornerRadius,elements,exportScale});}
    catch(ex){alert("Export failed: "+ex.message);}
    setExporting(false);
  };

  const canvasBg=bgMode==="gradient"?`linear-gradient(135deg,${bgColor},${bgColor2})`:bgMode==="color"?bgColor:"transparent";

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f0f0"}}>
      <TopBar onBack={onBack} name="Custom Banner" size={`${canvasW} × ${canvasH} px`}/>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── CANVAS AREA ── */}
        <div ref={canvasAreaRef} onClick={selectCanvas}
          style={{flex:1,...DOT_BG,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"relative",width:canvasW*DSCALE,height:canvasH*DSCALE,flexShrink:0}}>
            {/* Background */}
            <div style={{
              position:"absolute",inset:0,
              background:bgMode==="image"&&bgImage?`url(${bgImage}) center/cover no-repeat`:canvasBg,
              borderRadius:cornerRadius*DSCALE,
              boxShadow:"0 8px 40px rgba(0,0,0,.2)",overflow:"hidden",
            }}/>
            {/* Elements */}
            {elements.map(el=>{
              const isSel=el.id===selectedId;
              const W=(el.type==="image"?(el.natW||100)*el.scale:(el.dispW||120))*DSCALE;
              const H=(el.type==="image"?(el.natH||80)*el.scale:(el.dispH||36))*DSCALE;
              return(
                <div key={el.id}
                  onClick={e=>{e.stopPropagation();setSelectedId(el.id);setSideTab("element");}}
                  style={{position:"absolute",left:el.x*DSCALE,top:el.y*DSCALE,transform:`rotate(${el.rotation||0}deg)`,transformOrigin:"0 0",zIndex:isSel?12:5,userSelect:"none",cursor:isSel?"move":"pointer"}}>
                  {el.type==="image"?(
                    <img src={el.src} alt="" style={{display:"block",width:W,height:H,opacity:el.opacity??1,transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
                  ):(
                    <div ref={node=>{if(node)textElRefs.current[el.id]=node;else delete textElRefs.current[el.id];}}
                      style={{transform:"translate(-50%,-50%)",fontFamily:el.fontFamily||"'MaisonNeue',sans-serif",fontWeight:el.fontWeight||700,fontSize:(el.fontSize||24)*DSCALE,color:el.color||"#111",whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:el.align||"left",opacity:el.opacity??1,lineHeight:1.2,pointerEvents:"none",width:(el.textW||300)*DSCALE}}>
                      {el.text||"Text"}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Transform handles for selected */}
            {selected&&(
              <TransformHandles
                el={selected} dscale={DSCALE} canvasRef={canvasAreaRef}
                onDragStart={e=>startDrag(e,selected.id)}
                onScaleStart={(e,corner)=>startScale(e,selected.id,corner)}
                onRotateStart={e=>startRotate(e,selected.id)}
              />
            )}
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{width:SIDEBAR_W,background:"#fff",borderLeft:"1px solid #e8e8e8",display:"flex",flexDirection:"column",flexShrink:0}}>
          {/* Tab bar */}
          <div style={{display:"flex",borderBottom:"1px solid #e8e8e8",flexShrink:0}}>
            {[{id:"canvas",l:"Canvas"},{id:"element",l:"Element"}].map(t=>(
              <button key={t.id} onClick={()=>setSideTab(t.id)} style={{flex:1,height:44,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",color:sideTab===t.id?"#6366f1":"#aaa",borderBottom:sideTab===t.id?"2px solid #6366f1":"2px solid transparent",transition:"all .15s"}}>{t.l}</button>
            ))}
          </div>
          {/* Add buttons */}
          <div style={{padding:"10px 12px",borderBottom:"1px solid #f0f0f0",display:"flex",gap:6}}>
            <button onClick={addText} style={{flex:1,padding:"8px 0",background:"#f5f3ff",color:"#6366f1",border:"1.5px solid #c4b5fd",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>＋ Text</button>
            <button onClick={addImage} style={{flex:1,padding:"8px 0",background:"#f5f3ff",color:"#6366f1",border:"1.5px solid #c4b5fd",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>＋ Image</button>
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}}/>
            <input ref={bgRef} type="file" accept="image/*" style={{display:"none"}}/>
          </div>
          {/* Panel */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 14px 16px"}}>
            {sideTab==="canvas"?(
              <>
                <SLabel>Canvas Size</SLabel>
                <div style={{display:"flex",gap:8,marginTop:8,marginBottom:10}}>
                  <NumInput label="Width (px)" value={canvasW} onChange={v=>setCanvasW(Math.max(50,v))} min={50} max={4000}/>
                  <NumInput label="Height (px)" value={canvasH} onChange={v=>setCanvasH(Math.max(50,v))} min={50} max={4000}/>
                </div>
                {/* Presets */}
                <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
                  {[{l:"Small",w:361,h:90},{l:"Big",w:360,h:250},{l:"Square",w:800,h:800},{l:"Story",w:360,h:640},{l:"Landscape",w:1200,h:628}].map(p=>(
                    <button key={p.l} onClick={()=>{setCanvasW(p.w);setCanvasH(p.h);}} style={{padding:"5px 10px",fontSize:10,fontWeight:600,border:"1.5px solid #e0e0e0",borderRadius:6,cursor:"pointer",background:"#fafafa",color:"#666"}}>{p.l}<span style={{display:"block",fontSize:9,color:"#bbb",fontWeight:400}}>{p.w}×{p.h}</span></button>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#aaa"}}>Corner radius</span><span style={{fontSize:11,color:"#555",fontWeight:600}}>{cornerRadius}px</span></div>
                  <input type="range" min={0} max={100} value={cornerRadius} onChange={e=>setCornerRadius(+e.target.value)} style={{width:"100%",accentColor:"#6366f1"}}/>
                </div>
                <Divider/>
                <SLabel>Background</SLabel>
                <div style={{display:"flex",gap:6,marginTop:8,marginBottom:12}}>
                  {[{v:"color",l:"Color"},{v:"gradient",l:"Gradient"},{v:"image",l:"Image"}].map(m=>(
                    <button key={m.v} onClick={()=>setBgMode(m.v)} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,borderColor:bgMode===m.v?"#6366f1":"#e0e0e0",background:bgMode===m.v?"#f5f3ff":"#fff",color:bgMode===m.v?"#6366f1":"#888"}}>{m.l}</button>
                  ))}
                </div>
                {bgMode==="color"&&<><ColorSwatches value={bgColor} onChange={setBgColor}/><HexInput value={bgColor} onChange={setBgColor}/></>}
                {bgMode==="gradient"&&<>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>Start color</div>
                  <ColorSwatches value={bgColor} onChange={setBgColor}/><HexInput value={bgColor} onChange={setBgColor}/>
                  <div style={{fontSize:11,color:"#aaa",marginTop:10,marginBottom:6}}>End color</div>
                  <ColorSwatches value={bgColor2} onChange={setBgColor2}/><HexInput value={bgColor2} onChange={setBgColor2}/>
                  <div style={{marginTop:10,height:32,borderRadius:8,background:`linear-gradient(135deg,${bgColor},${bgColor2})`,border:"1px solid #f0f0f0"}}/>
                </>}
                {bgMode==="image"&&<>
                  <OutlineBtn onClick={addBgImg} icon="⊕" fullWidth accent="#6366f1">{bgImage?"Replace background image":"Upload background image"}</OutlineBtn>
                  {bgImage&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={bgImage} alt="bg" style={{width:56,height:32,objectFit:"cover",borderRadius:4,border:"1px solid #eee"}}/><button onClick={()=>setBgImage(null)} style={{fontSize:12,color:"#e55",background:"none",border:"none",cursor:"pointer"}}>Remove</button></div>}
                </>}
                <Divider margin="12px 0"/>
                {/* Layers */}
                <SLabel>Layers</SLabel>
                <div style={{marginTop:8}}>
                  {elements.length===0&&<div style={{fontSize:12,color:"#ccc",textAlign:"center",padding:"20px 0",lineHeight:1.6}}>No elements yet.<br/>Add text or images above.</div>}
                  {[...elements].reverse().map((el)=>(
                    <div key={el.id} onClick={()=>{setSelectedId(el.id);setSideTab("element");}}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",background:selectedId===el.id?"#f5f3ff":"#fafafa",border:selectedId===el.id?"1.5px solid #c4b5fd":"1.5px solid #f0f0f0",transition:"all .12s"}}>
                      <span style={{fontSize:13}}>{el.type==="image"?"🖼":"T"}</span>
                      <span style={{fontSize:11,color:"#555",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{el.type==="text"?(el.text||"Text").slice(0,20):el.name}</span>
                      <button onClick={e=>{e.stopPropagation();removeEl(el.id);}} style={{fontSize:12,color:"#e55",background:"none",border:"none",cursor:"pointer",lineHeight:1}}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            ):<ElPanel selected={selected} updateEl={updateEl} removeEl={removeEl} bringFwd={bringFwd} sendBk={sendBk}/>}
          </div>
          <div style={{padding:"12px 14px",borderTop:"1px solid #f0f0f0",background:"#fff",flexShrink:0}}>
            {/* Export scale selector */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>Export resolution</div>
                <div style={{display:"flex",gap:6}}>
                  {[1,2,3,4].map(s=><button key={s} onClick={()=>setExportScale(s)} style={{flex:1,padding:"7px 0",border:"2px solid",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,borderColor:exportScale===s?"#6366f1":"#e0e0e0",background:exportScale===s?"#f5f3ff":"#fff",color:exportScale===s?"#6366f1":"#777"}}>{s}×</button>)}
                </div>
                <div style={{fontSize:11,color:"#bbb",marginTop:5}}>{canvasW*exportScale} × {canvasH*exportScale} px</div>
              </div>
            <PrimaryBtn icon={exporting?"⏳":"⬇"} onClick={doExport} disabled={exporting} color="#6366f1">
              {exporting?"Exporting…":`Export ${exportScale}× — ${canvasW*exportScale} × ${canvasH*exportScale} px`}
            </PrimaryBtn>
          </div>
        </div>
      </div>
      <StatusBar label={`Canvas: ${canvasW} × ${canvasH} px · Preview ${Math.round(DSCALE*100)}%`}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BANNER SELECT SCREEN
═══════════════════════════════════════════════════════════════ */
function BannerSelect({onSelect}){
  const TYPES=[
    {id:"small",label:"Small Banner",size:"361 × 90 px",desc:"Compact promo strip with text and product images",
      preview:<div style={{width:"85%",height:22,background:"linear-gradient(108deg,#D0021B,#8B0011)",borderRadius:5,margin:"0 auto 14px"}}/>},
    {id:"big",label:"Big Banner",size:"360 × 250 px",desc:"Full-width brand spotlight with rich imagery and logo",
      preview:<div style={{width:"85%",height:58,background:"linear-gradient(135deg,#1B2D6B,#0a1830)",borderRadius:5,margin:"0 auto 14px"}}/>},
    {id:"custom",label:"Custom Banner",size:"Flexible size",desc:"Full creative freedom — any size, layers, text and images",
      preview:<div style={{width:"85%",height:40,background:"linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)",borderRadius:5,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:11,fontWeight:700,letterSpacing:".08em"}}>✦ CUSTOM</span></div>},
  ];
  return(
    <div style={{width:"100%",minHeight:"100vh",background:"#f5f5f5",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",boxSizing:"border-box"}}>
      <div style={{marginBottom:36,textAlign:"center"}}>
        <div style={{fontSize:26,fontWeight:700,color:"#111",letterSpacing:"-.02em"}}>Banner Creator</div>
        <div style={{fontSize:14,color:"#999",marginTop:6}}>Select a banner type to begin</div>
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
        {TYPES.map(bt=>(
          <div key={bt.id} onClick={()=>onSelect(bt.id)}
            style={{width:200,padding:"26px 20px",background:"#fff",borderRadius:16,cursor:"pointer",border:"2px solid #eee",boxShadow:"0 2px 10px rgba(0,0,0,.06)",transition:"all .18s",textAlign:"center"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=bt.id==="custom"?"#6366f1":"#D0021B";e.currentTarget.style.boxShadow=bt.id==="custom"?"0 4px 20px rgba(99,102,241,.15)":"0 4px 20px rgba(208,2,27,.12)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#eee";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.06)";}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:4}}>{bt.label}</div>
            <div style={{fontSize:11,color:"#bbb",marginBottom:12,fontFamily:"monospace"}}>{bt.size}</div>
            {bt.preview}
            <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{bt.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
export default function App(){
  const [screen,setScreen]=useState("select");
  return(
    <div style={{width:"100vw",minHeight:"100vh",overflow:"hidden",boxSizing:"border-box"}}>
      <style>{MAISON_NEUE_CSS}</style>
      {screen==="small"  && <SmallBannerEditor  onBack={()=>setScreen("select")}/>}
      {screen==="big"    && <BigBannerEditor    onBack={()=>setScreen("select")}/>}
      {screen==="custom" && <CustomBannerEditor onBack={()=>setScreen("select")}/>}
      {screen==="select" && <BannerSelect onSelect={setScreen}/>}
    </div>
  );
}
