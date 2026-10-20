#!/bin/bash
# Combined tabbed build. Each manual is still built/used on its own; this only wraps the built files.
set -e
cd "$(dirname "$0")"
../hapax/build.sh
../blackbox/build.sh
../keystep/build.sh
TABS=(  "squid|Toraiz SQUID|../squid/squid-interactive-manual.html"
        "blackbox|1010music Blackbox|../blackbox/blackbox-interactive-manual.html"
        "hapax|Squarp Hapax|../hapax/hapax-interactive-manual.html"
        "keystep|Arturia KeyStep Pro|../keystep/keystep-interactive-manual.html" )
OUT=playable-gear-manuals.html
{
  cat head.html
  for t in "${TABS[@]}"; do IFS='|' read -r id name _ <<<"$t"
    echo "<button role=\"tab\" id=\"t-$id\" aria-controls=\"f-$id\" aria-selected=\"false\">$name</button>"
    [ "$id" = blackbox ] && echo '<label title="Show the features of the community blackbox-mod 3.1.n firmware (github.com/j3threejay/blackbox-mod)"><input type="checkbox" id="bbmod">+ blackbox-mod 3.1.n</label>'; done
  echo "</nav>"
  for t in "${TABS[@]}"; do IFS='|' read -r id name f <<<"$t"
    # ponytail: whole page escaped into a data attribute, loaded on first open (keeps the 3 apps from booting at once)
    printf '<iframe id="f-%s" role="tabpanel" title="%s" allow="midi" hidden data-doc="' "$id" "$name"
    sed -e 's/&/\&amp;/g' -e 's/"/\&quot;/g' "$f"
    echo '"></iframe>'; done
  cat <<'JS'
<script>
"use strict";
// how each manual stops its own transport when its tab is hidden
const STOP={squid:w=>{w.press("stop");w.release("stop")},blackbox:w=>w.transportStop(),hapax:w=>w.stop(),keystep:w=>w.stop()};
const tabs=[...document.querySelectorAll('[role=tab]')];
function show(id){
  if(!document.getElementById("f-"+id))id=tabs[0].id.slice(2);
  for(const b of tabs){const k=b.id.slice(2),f=document.getElementById("f-"+k),on=k===id;
    if(!on&&!f.hidden&&f.contentWindow){try{STOP[k](f.contentWindow)}catch(e){}}
    b.setAttribute("aria-selected",on);b.tabIndex=on?0:-1;f.hidden=!on;
    if(on&&f.dataset.doc){f.srcdoc=f.dataset.doc;delete f.dataset.doc}}
  document.title=tabs.find(b=>b.id==="t-"+id).textContent+" · Playable Gear Manuals";
  try{localStorage.setItem("im.tab",id)}catch(e){}
  if(location.hash!=="#"+id)history.replaceState(null,"","#"+id);
}
tabs.forEach((b,i)=>{b.onclick=()=>{show(b.id.slice(2));document.getElementById("f-"+b.id.slice(2)).focus()};
  b.onkeydown=e=>{const d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;if(!d)return;const n=tabs[(i+d+tabs.length)%tabs.length];n.focus();show(n.id.slice(2))}});
// blackbox-mod checkbox mirrors the Blackbox manual's own "blackbox-mod layer" toolbar button
const mod=document.getElementById("bbmod"),bf=document.getElementById("f-blackbox");
const modBtn=()=>bf.contentDocument&&bf.contentDocument.getElementById("modBtn");
function syncMod(){const b=modBtn();if(b&&(b.getAttribute("aria-pressed")==="true")!==mod.checked)b.click()}
bf.addEventListener("load",()=>{syncMod();const b=modBtn();if(b)new MutationObserver(()=>{mod.checked=b.getAttribute("aria-pressed")==="true";try{localStorage.setItem("im.bbmod",mod.checked?"1":"")}catch(e){}}).observe(b,{attributes:true,attributeFilter:["aria-pressed"]})});
mod.onchange=()=>{try{localStorage.setItem("im.bbmod",mod.checked?"1":"")}catch(e){}if(bf.hidden)show("blackbox");syncMod()};
try{mod.checked=!!localStorage.getItem("im.bbmod")}catch(e){}
addEventListener("hashchange",()=>show(location.hash.slice(1)));
let last="";try{last=localStorage.getItem("im.tab")||""}catch(e){}
show(location.hash.slice(1)||last);
</script>
</body>
</html>
JS
} >"$OUT"
ls -l "$OUT"
