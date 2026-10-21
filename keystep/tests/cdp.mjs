// usage: node cdp.mjs <url> <script.js>   — evaluates script (async body) in page, prints result + console errors
// env: SHOT=file.png screenshot, WIDTH/HEIGHT phone-sized viewport, MIDI=1 real Web MIDI, CHROME=browser path
import {spawn} from "node:child_process";import fs from "node:fs";import os from "node:os";
const [url,scriptFile]=process.argv.slice(2);const port=9333+Math.floor(Math.random()*500);
const ch=spawn(process.env.CHROME||"google-chrome",["--headless=new","--no-sandbox","--disable-gpu",`--remote-debugging-port=${port}`,"--autoplay-policy=no-user-gesture-required","--window-size=1600,1000","--user-data-dir="+os.tmpdir()+"/cdp-"+port,"about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
for(let i=0;i<50;i++){try{const l=await (await fetch(`http://127.0.0.1:${port}/json`)).json();const p=l.find(x=>x.type==="page");if(p){ws=new WebSocket(p.webSocketDebuggerUrl);break}}catch(_){}await sleep(200)}
await new Promise(r=>ws.onopen=r);let id=0;const pend=new Map(),errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 if(m.method==="Runtime.exceptionThrown")errs.push("EXC "+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,400));
 if(m.method==="Runtime.consoleAPICalled"&&["error","warning"].includes(m.params.type))errs.push("CON "+m.params.args.map(a=>a.value??a.description).join(" ").slice(0,300))};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
await send("Runtime.enable");await send("Page.enable");if(process.env.MIDI)await send("Browser.grantPermissions",{permissions:["midi","midiSysex"]});if(process.env.WIDTH)await send("Emulation.setDeviceMetricsOverride",{width:+process.env.WIDTH,height:+(process.env.HEIGHT||900),deviceScaleFactor:1,mobile:true});await send("Page.navigate",{url});await sleep(2500);
const body=fs.readFileSync(scriptFile,"utf8");
const r=await send("Runtime.evaluate",{expression:`(async()=>{${body}})()`,awaitPromise:true,returnByValue:true,timeout:+(process.env.TIMEOUT||120000)});
console.log(JSON.stringify(r.result?.result?.value??r.result,null,1));if(r.result?.exceptionDetails)console.log("EVAL-EXC",r.result.exceptionDetails.exception?.description);
if(process.env.SHOT){const s=await send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(process.env.SHOT,Buffer.from(s.result.data,"base64"))}
console.log("ERRORS:",errs.length?errs.join("\n"):"none");ch.kill();process.exit(0)
