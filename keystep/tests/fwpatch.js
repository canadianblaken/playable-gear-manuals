/* firmware patcher: needs Arturia's stock 2.5.20 .kspf, passed in as STOCK_B64 by tools/test_web_patch.py (not in this repo) */
const R={};const ok=(name,c,info)=>{R[name]=c?"ok":"FAIL "+JSON.stringify(info)};
if(typeof STOCK_B64==="undefined")return {"skipped (no stock file)":"ok"};
const stock=Uint8Array.from(atob(STOCK_B64),c=>c.charCodeAt(0));const b64=b=>{let s="";for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(s)};
const r=await fwPatchMake(stock);ok("stock 2.5.20 file gives the tested build byte for byte",r.identical&&r.bytes.length>stock.length,r.bytes.length);
const err=async b=>{try{await fwPatchMake(b);return "no error"}catch(e){return e.message}};
ok("a KSCON file is refused",/already KSCON firmware/.test(await err(r.bytes)),await err(r.bytes));
const bad=stock.slice();bad[stock.length>>1]^=1;ok("a changed stock file is refused",/not Arturia's KeyStep Pro 2\.5\.20/.test(await err(bad)),await err(bad));
ok("something that is not a .kspf is refused",/not a \.kspf/.test(await err(new Uint8Array(1000))),await err(new Uint8Array(1000)));
/* the installer page: pick the file, get a download link named after the build (the page is loaded by test_web_patch.py) */
const inp=$("#stock"),dt=new DataTransfer();dt.items.add(new File([stock],"keystep-pro_Firmware_Update_2.5.20.0.kspf"));inp.files=dt.files;inp.dispatchEvent(new Event("change"));
for(let i=0;i<50&&$("#dl").hidden&&!/bad/.test($("#msg").className);i++)await new Promise(q=>setTimeout(q,100));
ok("installer offers the download",!$("#dl").hidden&&$("#dl").download===FW_PATCH.file&&/byte for byte/.test($("#msg").textContent),$("#msg").textContent);
const bad2=new File([bad],"x.kspf"),dt2=new DataTransfer();dt2.items.add(bad2);inp.files=dt2.files;inp.dispatchEvent(new Event("change"));
for(let i=0;i<50&&!/bad/.test($("#msg").className);i++)await new Promise(q=>setTimeout(q,100));
ok("installer refuses a changed file and hides the download",$("#dl").hidden&&/not Arturia's/.test($("#msg").textContent),$("#msg").textContent);
R.outSha=await sha256(r.bytes);return R;
