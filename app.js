'use strict';
const $=id=>document.getElementById(id);
let bank=[],session=[],index=0,history={},token=0,timer=null,phase='ready',running=false,finished=false;
const synth=window.speechSynthesis;
try{history=JSON.parse(localStorage.getItem('parliamo-history-v1')||'{}')}catch{history={}}
function save(){try{localStorage.setItem('parliamo-history-v1',JSON.stringify(history))}catch{}}
function recentWeight(card){const h=history[card.id]||{};const age=Date.now()-(h.lastPresented||0);return (age<86400000?.2:age<604800000?.55:1)/(1+(h.recentExposureCount||0)*.1)}
function sample(pool,n){return pool.map(c=>({c,k:-Math.log(Math.max(Math.random(),.000001))/recentWeight(c)})).sort((a,b)=>a.k-b.k).slice(0,n).map(x=>x.c)}
function buildSession(){const n=Number($('length').value),first=$('mode').value==='first';const counts=first?{core:.35,variation:.35,transformation:.1,integration:.1,review:.1}:{core:.1,variation:.45,transformation:.2,integration:.15,review:.1};let selected=[];for(const [type,ratio] of Object.entries(counts))selected.push(...sample(bank.filter(c=>c.type===type),Math.round(n*ratio)));if(selected.length>n)selected=selected.slice(0,n);const ids=new Set(selected.map(c=>c.id));selected.push(...sample(bank.filter(c=>c.type!=='model'&&!ids.has(c.id)),n-selected.length));// Fisher–Yates shuffle.
 for(let i=selected.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]]}
 return first?[...bank.filter(c=>c.type==='model'),...selected]:selected}
function stop(){token++;clearTimeout(timer);timer=null;running=false;synth?.cancel();$('play').textContent='▶ Play';$('pause').disabled=true}
function setPhase(p,text){phase=p;$('stage').textContent=text}
function voices(){if(!synth)return;const current=$('voice').value;$('voice').replaceChildren(new Option('Device default',''));for(const v of synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith('it')))$('voice').add(new Option(v.name,v.voiceURI));$('voice').value=current;if(!synth.getVoices().some(v=>v.lang.toLowerCase().startsWith('it')))$('notice').textContent='An Italian voice may need to be enabled in your device speech settings. Text practice is always available.'}
function speak(text,lang,done,t){if(t!==token)return;if(!synth){done();return}const u=new SpeechSynthesisUtterance(text);u.lang=lang;const vs=synth.getVoices();u.voice=vs.find(v=>lang==='it-IT'&&v.voiceURI===$('voice').value)||vs.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))||null;u.rate=lang==='it-IT'?Number($('rate').value):1;u.onend=()=>{if(t===token)done()};u.onerror=()=>{if(t!==token)return;stop();setPhase('ready','Audio unavailable');$('notice').textContent='Audio could not play. Try Play again, or use Reveal and Next for text practice.'};synth.speak(u)}
function wait(seconds,done,t){timer=setTimeout(()=>{if(t===token)done()},seconds*1000)}
function revealText(){const c=session[index];$('answer').hidden=false;$('target').textContent=c.target;$('alternatives').textContent=c.accepted_answers.length?'Also valid: '+c.accepted_answers.join(' / '):'Subject pronouns may be included or omitted.'}
function play(){if(!session.length||finished)return;stop();running=true;$('pause').disabled=false;$('play').textContent='▶ Restart card';const t=token,c=session[index];$('answer').hidden=true;setPhase('prompt',c.type==='model'?'Listen and repeat':'Listen to the prompt');speak(c.prompt,'en-GB',()=>{if(c.type==='model'){answer(t);return}setPhase('thinking','Your turn · say it aloud');wait(Number($('delay').value)+(c.difficulty===3?3:0),()=>answer(t),t)},t)}
function answer(t,allowAuto=true){revealText();setPhase('answer','Listen to the Italian');speak(session[index].target,'it-IT',()=>{setPhase('repeat','Repeat aloud');wait(4,()=>{running=false;$('pause').disabled=true;$('play').textContent='▶ Play';setPhase('ready','Ready for the next card');if(allowAuto&&$('auto').checked)next(true)},t)},t)}
function show(){const c=session[index];finished=false;$('progress').textContent=`Card ${index+1} of ${session.length}`;$('bar').max=session.length;$('bar').value=index;$('prompt').textContent=c.prompt;$('instruction').textContent=c.type==='model'?'LISTEN & REPEAT':'SAY IT IN ITALIAN';$('answer').hidden=true;setPhase('ready','Tap Play when ready');$('metadata').textContent=JSON.stringify(c,null,2);$('metadata').hidden=!$('debug').checked;for(const id of ['play','reveal','repeat','next'])$(id).disabled=false;const h=history[c.id]||{};const fresh=Date.now()-(h.lastPresented||0)>604800000;history[c.id]={lastPresented:Date.now(),recentExposureCount:(fresh?0:h.recentExposureCount||0)+1};save()}
function next(autoplay=false){stop();if(index+1>=session.length){finished=true;$('bar').value=session.length;setPhase('done','Session complete');$('progress').textContent=`${session.length} cards practised`;$('notice').textContent='Well done. Start a new session for different combinations.';for(const id of ['play','pause','reveal','repeat','next'])$(id).disabled=true;return}index++;show();if(autoplay)play()}
$('start').onclick=()=>{stop();session=buildSession();index=0;show();$('notice').textContent='Say your answer aloud before the Italian model. First-practice models are extra cards.';$('prompt').scrollIntoView({behavior:'smooth',block:'center'})};
$('play').onclick=play;
$('pause').onclick=()=>{stop();setPhase('ready','Paused · Play restarts this card')};
$('reveal').onclick=()=>{stop();revealText();setPhase('ready','Compare your answer')};
$('repeat').onclick=()=>{stop();running=true;$('pause').disabled=false;const t=token;answer(t,false)};
$('next').onclick=()=>next(false);
$('debug').onchange=()=>{$('metadata').hidden=!$('debug').checked};
$('clear').onclick=()=>{history={};save();$('notice').textContent='Local practice history cleared.'};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();setPhase('ready','Paused · return and tap Play')}});
if(synth){synth.onvoiceschanged=voices;voices()}else $('notice').textContent='Speech is unavailable in this browser. Use Reveal and Next to practise with text.';
fetch('cards.json').then(r=>{if(!r.ok)throw Error('Bank unavailable');return r.json()}).then(cards=>{bank=cards;$('start').disabled=false}).catch(()=>{$('start').disabled=true;$('notice').textContent='The card bank could not load. Refresh the page to try again.'});
$('start').disabled=true;
fetch('docs/preparation.md').then(r=>{if(!r.ok)throw Error();return r.text()}).then(text=>{$('guideContent').textContent=text.replace(/^#+ /gm,'')}).catch(()=>{$('guideContent').textContent='Preparation guide could not load. Please refresh before starting.';$('start').disabled=true});
