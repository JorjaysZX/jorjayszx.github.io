(() => {
const $ = id => document.getElementById(id);
const STORE = "beatTeamsStateV2";
const defaultTeams = [
 {name:"Equipo Azul",color:"#1688ff"},{name:"Equipo Rojo",color:"#ff365b"},
 {name:"Equipo Verde",color:"#19c37d"},{name:"Equipo Dorado",color:"#eab308"},
 {name:"Equipo Violeta",color:"#a855f7"},{name:"Equipo Naranja",color:"#f97316"}
];
let teams=defaultTeams.map(t=>({...t})), duration=50,bestOf=3,teamCount=4;
let remaining=[50,50],active=null,running=false,paused=false,interval=null,lastTick=0;
let soundOn=true,audioCtx=null,roundWins=[0,0],currentMatchId=null,bracket=[],nextMatchId=1;
let deferredInstall=null,wakeLock=null,matchRoundStarted=false;
const winNeeded=()=>Math.ceil(bestOf/2);
function safeName(s){return String(s||"Equipo").trim().slice(0,32)||"Equipo";}
function setStatus(msg,kind=""){$("status").textContent=msg;$("status").className="status "+kind;}
function formatTime(n){return Math.max(0,n).toFixed(1);}
function currentMatch(){return bracket.find(m=>m.id===currentMatchId)||null;}
function teamIndexForSide(side){const m=currentMatch();return m?(side===0?m.a:m.b):side;}
function persist(){
 try{
 const data={teams,duration,bestOf,teamCount,remaining,active,running:false,paused:false,soundOn,roundWins,currentMatchId,bracket,nextMatchId};
 localStorage.setItem(STORE,JSON.stringify(data));
 $("saveStatus").textContent="● Guardado local automático";
 }catch(e){$("saveStatus").textContent="⚠ No se pudo guardar";}
}
function restore(){
 try{
 const raw=localStorage.getItem(STORE);if(!raw)return false;const d=JSON.parse(raw);
 if(Array.isArray(d.teams)&&d.teams.length>=4)teams=d.teams;
 duration=Number(d.duration)||50;bestOf=[1,3,5].includes(+d.bestOf)?+d.bestOf:3;teamCount=[4,6].includes(+d.teamCount)?+d.teamCount:4;
 remaining=Array.isArray(d.remaining)&&d.remaining.length===2?d.remaining.map(Number):[duration,duration];
 active=null;running=false;paused=false;soundOn=d.soundOn!==false;roundWins=Array.isArray(d.roundWins)?d.roundWins:[0,0];
 currentMatchId=d.currentMatchId??null;bracket=Array.isArray(d.bracket)?d.bracket:[];nextMatchId=Number(d.nextMatchId)||1;
 return true;
 }catch(e){return false;}
}
function buzz(){
 if(!soundOn)return;
 try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();
 [660,880,660].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(.001,audioCtx.currentTime+i*.18);g.gain.exponentialRampToValueAtTime(.22,audioCtx.currentTime+i*.18+.02);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+i*.18+.16);o.connect(g);g.connect(audioCtx.destination);o.start(audioCtx.currentTime+i*.18);o.stop(audioCtx.currentTime+i*.18+.17);});}catch(e){}
}
function stopInterval(){if(interval){clearInterval(interval);interval=null;}}
async function keepAwake(){try{if("wakeLock"in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request("screen");}catch(e){}}
function releaseAwake(){try{if(wakeLock){wakeLock.release();wakeLock=null;}}catch(e){}}
function paint(){
 const m=currentMatch(), ia=m?m.a:0,ib=m?m.b:1;
 $("clockA").textContent=formatTime(remaining[0]);$("clockB").textContent=formatTime(remaining[1]);
 $("scoreA").textContent=roundWins[0]||0;$("scoreB").textContent=roundWins[1]||0;
 $("nameA").textContent=teams[ia]?.name||"Por definir";$("nameB").textContent=teams[ib]?.name||"Por definir";
 $("timerA").style.setProperty("--team",teams[ia]?.color||"#1688ff");$("timerB").style.setProperty("--team",teams[ib]?.color||"#ff365b");
 $("timerA").classList.toggle("active-turn",running&&active===0);$("timerB").classList.toggle("active-turn",running&&active===1);
 $("timerA").classList.toggle("expired",remaining[0]<=0);$("timerB").classList.toggle("expired",remaining[1]<=0);
 $("stateA").textContent=remaining[0]<=0?"TIEMPO AGOTADO":running&&active===0?"RELOJ ACTIVO":paused&&active===0?"PAUSADO":"TOCA PARA DAR EL TURNO";
 $("stateB").textContent=remaining[1]<=0?"TIEMPO AGOTADO":running&&active===1?"RELOJ ACTIVO":paused&&active===1?"PAUSADO":"TOCA PARA DAR EL TURNO";
 $("startBtn").disabled=running||remaining.some(x=>x<=0)||!!(m&&m.winner!==null);
 $("pauseBtn").disabled=!running&&!paused;$("pauseBtn").textContent=paused?"▶ Reanudar":"Ⅱ Pausar";
 $("nextRoundBtn").disabled=!(m&&m.winner===null&&roundWins.some(x=>x>=winNeeded()));
 $("roundLabel").textContent=`RONDA ${Math.min(bestOf,roundWins[0]+roundWins[1]+1)} DE ${bestOf}`;
 $("matchTitle").textContent=m?`${teams[m.a]?.name||"?"} vs. ${teams[m.b]?.name||"?"}`:"Partida de prueba";
 $("soundBtn").textContent=soundOn?"🔊 Sonido":"🔇 Silencio";$("soundBtn").setAttribute("aria-pressed",String(soundOn));
}
function startClock(){
 if(remaining.some(x=>x<=0)){setStatus("Un reloj está agotado. Reinicia la ronda para continuar.","warn");return;}
 if(active===null)active=0;running=true;paused=false;lastTick=performance.now();stopInterval();interval=setInterval(tick,50);keepAwake();
 const idx=teamIndexForSide(active);setStatus(`Turno de ${teams[idx]?.name||"equipo"}. Toca el panel del rival solo cuando responda correctamente.`);paint();persist();
}
function tick(){
 if(!running||active===null)return;
 const now=performance.now(),elapsed=(now-lastTick)/1000;lastTick=now;remaining[active]=Math.max(0,remaining[active]-elapsed);
 if(remaining[active]<=0){remaining[active]=0;running=false;paused=false;stopInterval();releaseAwake();buzz();const loser=active;setStatus(`¡Tiempo agotado para ${teams[teamIndexForSide(loser)]?.name||"el equipo"}!`,"warn");const m=currentMatch();if(m&&m.winner===null)finishRound(1-loser);else persist();paint();return;}
 paint();
}
function pause(){
 if(running){tick();if(!running)return;running=false;paused=true;stopInterval();releaseAwake();setStatus("Partida pausada. Pulsa Reanudar para continuar.");}
 else if(paused){startClock();return;}
 paint();persist();
}
function switchTurn(i){
 if(!running){if(paused){setStatus("La partida está pausada. Reanuda antes de cambiar el turno.","warn");return;}if(active===null){active=i;setStatus(`Listo: ${teams[teamIndexForSide(i)]?.name||"equipo"} comenzará al pulsar Iniciar.`);paint();persist();}else setStatus("Pulsa Iniciar para arrancar el reloj.","warn");return;}
 tick();if(!running)return;active=i;lastTick=performance.now();setStatus(`Turno de ${teams[teamIndexForSide(i)]?.name||"equipo"}. Una respuesta incorrecta no cambia el turno.`);paint();persist();
}
function resetRound(confirmIt=false){
 if(confirmIt&&!confirm("¿Reiniciar los relojes de esta ronda?"))return;
 stopInterval();releaseAwake();running=false;paused=false;active=null;remaining=[duration,duration];paint();setStatus("Relojes reiniciados. Pulsa Iniciar y toca el equipo que comienza.");persist();
}
function finishRound(winnerSide){
 stopInterval();releaseAwake();running=false;paused=false;active=null;
 const m=currentMatch();
 if(m&&m.winner===null){
  roundWins[winnerSide]=(roundWins[winnerSide]||0)+1;
  if(roundWins[winnerSide]>=winNeeded()){
   m.winner=winnerSide===0?m.a:m.b;m.played=true;advanceWinner(m);
   setStatus(`¡${teams[m.winner].name} gana el duelo! El resultado se guardó en el cuadro.`,"good");
  }else{
   setStatus(`${teams[teamIndexForSide(winnerSide)].name} gana la ronda. Pulsa “Siguiente ronda”.`,"good");
  }
 }
 paint();persist();renderBracket();
}
function nextRound(){const m=currentMatch();if(!m||m.winner!==null)return;resetRound(false);setStatus("Siguiente ronda lista. Elige quién empieza y pulsa Iniciar.");}
function loadMatch(m){
 if(running||paused){if(!confirm("Hay una partida activa. ¿Abandonarla y cargar otro duelo?"))return;}
 stopInterval();releaseAwake();currentMatchId=m.id;roundWins=[0,0];remaining=[duration,duration];active=null;running=false;paused=false;
 paint();setStatus(`Duelo cargado: ${teams[m.a].name} vs. ${teams[m.b].name}. Pulsa Iniciar.`);persist();switchTab("match");
}
function switchTab(id){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id===id));if(id==="bracket")renderBracket();}
function renderEditors(){
 const box=$("teamEditor");box.innerHTML="";
 for(let i=0;i<teamCount;i++){const row=document.createElement("div");row.className="team-row";const input=document.createElement("input");input.value=teams[i].name;input.maxLength=32;input.dataset.name=i;input.setAttribute("aria-label",`Nombre del equipo ${i+1}`);const color=document.createElement("input");color.type="color";color.value=teams[i].color;color.dataset.color=i;color.setAttribute("aria-label",`Color del equipo ${i+1}`);row.append(input,color);box.append(row);}
}
function saveTeams(){
 document.querySelectorAll("[data-name]").forEach(el=>teams[+el.dataset.name].name=safeName(el.value));
 document.querySelectorAll("[data-color]").forEach(el=>teams[+el.dataset.color].color=el.value);
 paint();renderEditors();renderBracket();persist();setStatus("Nombres y colores guardados en este dispositivo.");
}
function makeMatch(a,b,round,id){return {a,b,round,id,winner:null,played:false};}
function generateBracket(){
 if(bracket.length&&!confirm("Generar otro torneo borrará el cuadro y sus resultados. ¿Continuar?"))return;
 stopInterval();releaseAwake();running=false;paused=false;teamCount=+$("teamCount").value;bestOf=+$("bestOf").value;duration=Math.max(5,Math.min(600,+$("setupTime").value||50));$("duration").value=duration;
 while(teams.length<teamCount)teams.push({...defaultTeams[teams.length%defaultTeams.length]});
 bracket=[];nextMatchId=1;
 if(teamCount===4){
  bracket.push(makeMatch(0,1,"Semifinal",nextMatchId++),makeMatch(2,3,"Semifinal",nextMatchId++),makeMatch(null,null,"Final",nextMatchId++));
 }else{
  bracket.push(makeMatch(2,3,"Cuartos de final",nextMatchId++),makeMatch(4,5,"Cuartos de final",nextMatchId++));
  bracket.push(makeMatch(0,null,"Semifinal",nextMatchId++),makeMatch(1,null,"Semifinal",nextMatchId++),makeMatch(null,null,"Final",nextMatchId++));
 }
 currentMatchId=null;roundWins=[0,0];remaining=[duration,duration];renderEditors();renderBracket();paint();persist();setStatus(`Torneo de ${teamCount} equipos creado. Selecciona un duelo en el cuadro.`,"good");
}
function advanceWinner(m){
 if(teamCount===4){
  if(m.round==="Semifinal"){const semis=bracket.filter(x=>x.round==="Semifinal"),final=bracket.find(x=>x.round==="Final");const idx=semis.indexOf(m);if(idx===0)final.a=m.winner;else final.b=m.winner;}
 }else{
  if(m.round==="Cuartos de final"){const qs=bracket.filter(x=>x.round==="Cuartos de final"),semis=bracket.filter(x=>x.round==="Semifinal"),idx=qs.indexOf(m);if(idx===0)semis[0].b=m.winner;else semis[1].b=m.winner;}
  if(m.round==="Semifinal"){const semis=bracket.filter(x=>x.round==="Semifinal"),final=bracket.find(x=>x.round==="Final"),idx=semis.indexOf(m);if(idx===0)final.a=m.winner;else final.b=m.winner;}
 }
}
function registerWinner(m){
 if(m.winner!==null)return;
 const options=`¿Quién ganó?\n1. ${teams[m.a].name}\n2. ${teams[m.b].name}\nEscribe 1 o 2.`;
 const choice=prompt(options);if(choice!=="1"&&choice!=="2")return;
 m.winner=choice==="1"?m.a:m.b;m.played=true;advanceWinner(m);persist();renderBracket();setStatus(`Resultado registrado: avanza ${teams[m.winner].name}.`,"good");
}
function renderBracket(){
 const root=$("bracketView");root.innerHTML="";
 if(!bracket.length){root.innerHTML='<div class="empty">Todavía no hay torneo. Ve a “Equipos y torneo” y genera el cuadro.</div>';return;}
 const rounds=[...new Set(bracket.map(m=>m.round))];
 rounds.forEach(round=>{
  const col=document.createElement("div");col.className="bracket-column";const h=document.createElement("h3");h.textContent=round;col.append(h);
  bracket.filter(m=>m.round===round).forEach(m=>{
   const card=document.createElement("div");card.className="match-card";const title=document.createElement("strong");title.textContent=`Duelo ${m.id}`;card.append(title);
   [m.a,m.b].forEach(idx=>{const p=document.createElement("div");p.className="pair";if(m.winner===idx&&idx!==null)p.classList.add("winner");const span=document.createElement("span");span.textContent=idx===null?"Por definir":teams[idx]?.name||"Por definir";const small=document.createElement("small");small.textContent=m.winner===idx&&idx!==null?"GANADOR":"";p.append(span,small);card.append(p);});
   const result=document.createElement("small");result.textContent=m.winner===null?"Sin resultado":`Avanza: ${teams[m.winner].name}`;card.append(result);
   const canLoad=m.a!==null&&m.b!==null&&m.winner===null;
   if(canLoad){const btn=document.createElement("button");btn.className="primary";btn.textContent=currentMatchId===m.id?"Duelo seleccionado":"Jugar este duelo";btn.disabled=!!(currentMatch()&&currentMatch().winner===null&&currentMatchId!==m.id&&(running||paused));btn.addEventListener("click",()=>loadMatch(m));card.append(btn);}
   if(m.a!==null&&m.b!==null&&m.winner===null){const wb=document.createElement("button");wb.className="secondary";wb.textContent="Registrar ganador manualmente";wb.addEventListener("click",()=>registerWinner(m));card.append(wb);}
   col.append(card);
  });root.append(col);
 });
}
$("timerA").addEventListener("click",()=>switchTurn(0));$("timerB").addEventListener("click",()=>switchTurn(1));
$("startBtn").addEventListener("click",()=>{if(active===null)active=0;startClock();});
$("pauseBtn").addEventListener("click",pause);
$("resetBtn").addEventListener("click",()=>{if(confirm("¿Reiniciar la partida actual? Se perderá el progreso de la ronda actual.")){roundWins=[0,0];const m=currentMatch();if(m)m.winner=null;resetRound(false);persist();renderBracket();}});
$("nextRoundBtn").addEventListener("click",nextRound);
$("applyTime").addEventListener("click",()=>{if(running||paused){setStatus("Pausa el reloj antes de cambiar el tiempo.","warn");return;}duration=Math.max(5,Math.min(600,+$("duration").value||50));$("duration").value=duration;remaining=[duration,duration];paint();persist();setStatus(`Tiempo inicial establecido en ${duration} segundos.`);});
$("saveSettings").addEventListener("click",()=>{if(running||paused){setStatus("Pausa la partida antes de cambiar la configuración.","warn");return;}bestOf=+$("bestOf").value;duration=Math.max(5,Math.min(600,+$("setupTime").value||50));$("duration").value=duration;remaining=[duration,duration];paint();persist();setStatus("Configuración guardada.");});
$("saveTeams").addEventListener("click",saveTeams);$("generateBracket").addEventListener("click",generateBracket);$("refreshBracket").addEventListener("click",renderBracket);
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
$("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;paint();persist();if(soundOn)buzz();});
$("fullscreenBtn").addEventListener("click",async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();$("fullscreenBtn").textContent="⤢ Salir pantalla completa";}else{await document.exitFullscreen();$("fullscreenBtn").textContent="⛶ Pantalla completa";}}catch(e){setStatus("Pantalla completa no está disponible en este navegador. Prueba el menú de Chrome.","warn");}});
document.addEventListener("fullscreenchange",()=>{$("fullscreenBtn").textContent=document.fullscreenElement?"⤢ Salir pantalla completa":"⛶ Pantalla completa";});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&running)keepAwake();});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").classList.remove("hidden");});
$("installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").classList.add("hidden");});
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
const restored=restore();
$("teamCount").value=String(teamCount);$("bestOf").value=String(bestOf);$("setupTime").value=duration;$("duration").value=duration;
renderEditors();paint();renderBracket();
if(restored){setStatus("Estado anterior recuperado del almacenamiento local. Los relojes se reanudan pausados.");}
else setStatus("Configura los equipos o inicia una partida de prueba.");
persist();
})();