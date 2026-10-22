/* the installer: pick the stock file, make KSCON with fwPatchMake (src/6d-fwmake.js), offer the download */
const $=s=>document.querySelector(s);
$("#fname").textContent=FW_PATCH.file;$("#fwv").textContent=`KSCON ${FW_PATCH.version} b${FW_PATCH.build}`;
$("#stock").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const msg=$("#msg"),dl=$("#dl");
 dl.hidden=true;msg.className="";msg.textContent="Checking…";
 try{const r=await fwPatchMake(new Uint8Array(await f.arrayBuffer()));if(dl.href)URL.revokeObjectURL(dl.href);
  dl.href=URL.createObjectURL(new Blob([r.bytes],{type:"application/octet-stream"}));dl.download=FW_PATCH.file;dl.textContent="Download "+FW_PATCH.file;dl.hidden=false;
  msg.className="ok";msg.textContent=`Checked: this is Arturia's 2.5.20, and the result matches the tested KSCON build ${FW_PATCH.build}${r.identical?" byte for byte":""}. Download it, then go to step 3.`}
 catch(err){msg.className="bad";msg.textContent=err.message}};
