/* KSCON from the user's stock 2.5.20 .kspf: a stored (uncompressed) zip. Every entry must match the stock SHA-256; the changed
   runs from FW_PATCH are applied and every result must match the tested build, so only that exact build can come out. */
const sha256=async b=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",b))].map(x=>x.toString(16).padStart(2,"0")).join("");
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
async function fwPatchMake(zip){const NOT="This is not Arturia's KeyStep Pro 2.5.20 update file";
 const v=new DataView(zip.buffer,zip.byteOffset,zip.byteLength);let e=zip.length-22;while(e>=0&&v.getUint32(e,true)!==0x06054b50)e--;
 if(e<0)throw new Error(NOT+" (not a .kspf).");
 const count=v.getUint16(e+10,true),cdOff=v.getUint32(e+16,true),items=[];let p=cdOff;
 for(let i=0;i<count;i++){if(v.getUint32(p,true)!==0x02014b50)throw new Error(NOT+" (damaged zip).");
  const nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),name=new TextDecoder().decode(zip.subarray(p+46,p+46+nl));
  const lo=v.getUint32(p+42,true),lnl=v.getUint16(lo+26,true),lxl=v.getUint16(lo+28,true),size=v.getUint32(p+20,true);
  if(v.getUint16(p+10,true)!==0||v.getUint32(lo,true)!==0x04034b50)throw new Error(NOT+" (unexpected zip layout).");
  items.push({name,cen:zip.slice(p,p+46+nl+xl+cl),loc:zip.slice(lo,lo+30+lnl+lxl),data:zip.subarray(lo+30+lnl+lxl,lo+30+lnl+lxl+size)});p+=46+nl+xl+cl}
 const want=FW_PATCH.entries;if(items.length!==want.length||items.some((it,i)=>it.name!==want[i].name))throw new Error(NOT+" (different files inside).");
 const blob=new Uint8Array(await new Response(new Blob([Uint8Array.from(atob(FW_PATCH.blob),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
 let bp=0;const parts=[],cens=[];let off=0;
 for(let i=0;i<items.length;i++){const it=items[i],w=want[i];
  if(await sha256(it.data)!==w.inSha)throw new Error(w.runs.length&&await sha256(it.data)===w.outSha?"This file is already KSCON firmware; choose Arturia's original 2.5.20 file.":NOT+` (${it.name} differs).`);
  const out=new Uint8Array(w.len);out.set(it.data.subarray(0,Math.min(it.data.length,w.len)));
  for(const [o,n] of w.runs){out.set(blob.subarray(bp,bp+n),o);bp+=n}
  if(await sha256(out)!==w.outSha)throw new Error(`Patching ${it.name} did not give the tested result; nothing was made.`);
  const crc=crc32(out),loc=it.loc.slice(),cen=it.cen.slice(),lv=new DataView(loc.buffer),cv=new DataView(cen.buffer);
  lv.setUint32(14,crc,true);lv.setUint32(18,out.length,true);lv.setUint32(22,out.length,true);
  cv.setUint32(16,crc,true);cv.setUint32(20,out.length,true);cv.setUint32(24,out.length,true);cv.setUint32(42,off,true);
  parts.push(loc,out);cens.push(cen);off+=loc.length+out.length}
 const cdSize=cens.reduce((s,c)=>s+c.length,0),end=zip.slice(e),ev=new DataView(end.buffer);ev.setUint32(12,cdSize,true);ev.setUint32(16,off,true);
 const bytes=new Uint8Array(await new Blob([...parts,...cens,end]).arrayBuffer());
 return {bytes,identical:await sha256(bytes)===FW_PATCH.outZipSha}}
