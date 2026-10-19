'use strict';
const $=id=>document.getElementById(id);
let guideReady=false,bank=[],session=[],index=0,history={},token=0,answerTimer=null,voicePreference='auto',phase='ready',running=false,finished=false;
const synth=window.speechSynthesis;
try{voicePreference=localStorage.getItem('parliamo-voice-v1')||'auto'}catch{}
try{history=JSON.parse(localStorage.getItem('parliamo-history-v1')||'{}')}catch{history={}}
function save(){try{localStorage.setItem('parliamo-history-v1',JSON.stringify(history))}catch{}}
function recentWeight(card){const h=history[card.id]||{};const age=Date.now()-(h.lastPresented||0);return (age<86400000?.2:age<604800000?.55:1)/(1+(h.recentExposureCount||0)*.1)}
function sample(pool,n){return pool.map(c=>({c,k:-Math.log(Math.max(Math.random(),.000001))/recentWeight(c)})).sort((a,b)=>a.k-b.k).slice(0,n).map(x=>x.c)}
function buildSession(){const n=Number($('length').value),first=$('mode').value==='first';const counts=first?{core:.35,variation:.45,integration:.1,review:.1}:{core:.15,variation:.6,integration:.15,review:.1};let selected=[];for(const [type,ratio] of Object.entries(counts))selected.push(...sample(bank.filter(c=>c.type===type),Math.round(n*ratio)));if(selected.length>n)selected=selected.slice(0,n);const ids=new Set(selected.map(c=>c.id));selected.push(...sample(bank.filter(c=>c.type!=='model'&&!ids.has(c.id)),n-selected.length));// Fisher–Yates shuffle.
 for(let i=selected.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]]}
 return first?[...bank.filter(c=>c.type==='model'),...selected]:selected}
function stop(){token++;clearTimeout(answerTimer);answerTimer=null;running=false;synth?.cancel();$('play').textContent='▶ Play';$('pause').disabled=true}
function setPhase(p,text){phase=p;$('stage').textContent=text}
function italianVoices(){
 const seen=new Set();
 return (synth?.getVoices()||[]).filter(v=>v.lang.toLowerCase().startsWith('it')).filter(v=>{
  const key=voiceKey(v);if(seen.has(key))return false;seen.add(key);return true;
 });
}
function voiceKey(v){return JSON.stringify([v.voiceURI,v.lang,v.name,v.localService])}
function voiceQuality(v){
 const id=v.voiceURI.toLowerCase();
 return /premium/.test(id)?'Premium':/enhanced/.test(id)?'Enhanced':/compact/.test(id)?'Compact':'';
}
function preferredItalianVoice(){
 const vs=italianVoices();
 const rank=v=>({Premium:3,Enhanced:2,Compact:0}[voiceQuality(v)]??1);
 const alice=vs.filter(v=>/alice/i.test(v.name)).sort((a,b)=>rank(b)-rank(a));
 return alice[0]||vs.find(v=>v.default)||vs[0]||null;
}
function selectedItalianVoice(){
 if(voicePreference==='device')return null;
 return italianVoices().find(v=>voiceKey(v)===voicePreference)||preferredItalianVoice();
}
function voices(){
 if(!synth)return;
 const vs=italianVoices(),counts=new Map();
 for(const v of vs)counts.set(v.name,(counts.get(v.name)||0)+1);
 const order=new Map();
 $('voice').replaceChildren(new Option('Automatic · prefer Alice','auto'),new Option('Device default','device'));
 for(const v of vs){
  const n=(order.get(v.name)||0)+1;order.set(v.name,n);
  const quality=voiceQuality(v);
  const version=counts.get(v.name)>1?' · '+n:'';
  const label=v.name+version+(quality?' · '+quality:'')+' · '+v.lang;
  $('voice').add(new Option(label,voiceKey(v)));
 }
 $('voice').value=vs.some(v=>voiceKey(v)===voicePreference)||['auto','device'].includes(voicePreference)?voicePreference:'auto';
 if(!vs.length)$('notice').textContent='An Italian voice may need to be enabled in your device speech settings. Text practice is always available.';
 updateVoiceDetails();
}
function updateVoiceDetails(){
 const v=selectedItalianVoice();
 $('voiceDetails').textContent=voicePreference==='device'?'Uses your device’s Italian default.':v?v.name+' · '+(voiceQuality(v)||'quality not reported')+' · '+v.voiceURI:'Waiting for Italian voices.';
}
function speak(text,lang,done,t){if(t!==token)return;if(!synth){done();return}const u=new SpeechSynthesisUtterance(text);u.lang=lang;const vs=synth.getVoices();u.voice=lang==='it-IT'?selectedItalianVoice():vs.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))||null;u.rate=lang==='it-IT'?Number($('rate').value):1;u.onend=()=>{if(t===token)done()};u.onerror=()=>{if(t!==token)return;stop();setPhase('ready','Audio unavailable');$('notice').textContent='Audio could not play. Try Play again, or use Reveal and Next for text practice.'};synth.speak(u)}
function revealText(){const c=session[index];$('answer').hidden=false;$('target').textContent=c.target;$('alternatives').textContent=c.accepted_answers.length?'Also valid: '+c.accepted_answers.join(' / '):(c.type!=='model'&&/^(Non )?(Ho|Hai|Ha|Abbiamo|Avete|Hanno|Sono|Siamo|Lui|Lei)\b/i.test(c.target)?'Subject pronouns may be included or omitted.':'')}
function normalizeAnswer(text){
 return text.normalize('NFC').toLocaleLowerCase('it').replace(/[’‘]/g,"'").replace(/[.,!?;:…“”"¿¡]/g,' ').replace(/\s+/g,' ').trim();
}
function matchesAnswer(text,card){
 const answer=normalizeAnswer(text);
 return !!answer&&[card.target,...card.accepted_answers].some(candidate=>normalizeAnswer(candidate)===answer);
}
function play(){
 if(!session.length||finished)return;
 stop();running=true;$('pause').disabled=false;$('play').textContent='▶ Replay';
 const t=token,c=session[index];
 setPhase('prompt',c.type==='model'?'Listen and repeat':'Listen to the prompt');
 speak(c.prompt,'en-GB',()=>{
  if(c.type==='model'){answer(t);return}
  running=false;$('pause').disabled=true;$('play').textContent='▶ Play';
  setPhase('waiting','Your turn · dictate or type');
 },t);
}
function answer(t){
 revealText();running=true;$('pause').disabled=false;
 setPhase('answer','Listen to the Italian');
 speak(session[index].target,'it-IT',()=>{
  running=false;$('pause').disabled=true;$('play').textContent='▶ Play';
  setPhase('ready','Repeat aloud · Next when ready');
 },t);
}
function checkAnswer(event){
 event.preventDefault();
 if(!session.length||finished||session[index].type==='model')return;
 const text=$('response').value.trim();
 if(!text){$('feedback').hidden=false;$('feedback').textContent='Dictate or type your Italian answer first.';return}
 stop();
 const match=matchesAnswer(text,session[index]);
 $('feedback').hidden=false;
 $('feedback').dataset.result=match?'match':'compare';
 $('feedback').textContent=match?'Matches an accepted answer.':'Different from the stored answers. Compare with the model below.';
 $('response').blur();
 // Let keyboard dictation release its audio session before speaking.
 const t=token;
 revealText();running=true;$('pause').disabled=false;
 setPhase('settling','Preparing Italian audio');
 answerTimer=setTimeout(()=>{answerTimer=null;if(t===token)answer(t)},Number($('audioDelay').value));

}
function show(){const c=session[index];document.body.classList.add('practising');$('back').hidden=false;updatePracticeViewport();finished=false;$('progress').textContent=`Card ${index+1} of ${session.length}`;$('bar').max=session.length;$('bar').value=index;$('prompt').textContent=c.prompt;$('promptNote').textContent=c.prompt_note?'('+c.prompt_note+')':'';$('promptNote').hidden=!c.prompt_note;$('instruction').textContent=c.type==='model'?'LISTEN & REPEAT':'SAY IT IN ITALIAN';$('answer').hidden=true;$('responseForm').hidden=c.type==='model';$('response').value='';$('response').disabled=false;$('feedback').hidden=true;$('feedback').textContent='';setPhase('ready',c.type==='model'?'Tap Play when ready':'Return to check your answer');$('metadata').textContent=JSON.stringify(c,null,2);$('metadata').hidden=!$('debug').checked;for(const id of ['play','reveal','repeat','next'])$(id).disabled=false;const h=history[c.id]||{};const fresh=Date.now()-(h.lastPresented||0)>604800000;history[c.id]={lastPresented:Date.now(),recentExposureCount:(fresh?0:h.recentExposureCount||0)+1};save();if(c.type!=='model')$('response').focus({preventScroll:true})}
function next(){stop();if(index+1>=session.length){finished=true;$('bar').value=session.length;setPhase('done','Session complete');$('progress').textContent=`${session.length} cards practised`;$('notice').textContent='Well done. Start a new session for different combinations.';$('response').disabled=true;for(const id of ['play','pause','reveal','repeat','next'])$(id).disabled=true;return}index++;show();play();}
$('start').onclick=()=>{stop();session=buildSession();index=0;show();$('notice').textContent='';play()};
// Follow the visible area when Safari chrome or the software keyboard moves.
function updatePracticeViewport(){
 if(!document.body.classList.contains('practising'))return;
 const viewport=window.visualViewport;
 document.documentElement.style.setProperty('--practice-top',(viewport?viewport.offsetTop:0)+'px');
 document.documentElement.style.setProperty('--practice-height',(viewport?viewport.height:window.innerHeight)+'px');
}
window.visualViewport?.addEventListener('resize',updatePracticeViewport);
window.visualViewport?.addEventListener('scroll',updatePracticeViewport);
window.addEventListener('resize',updatePracticeViewport);
$('back').onclick=()=>{
 stop();$('response').blur();document.body.classList.remove('practising');
 $('back').hidden=true;$('start').focus({preventScroll:true});
};
$('voice').onchange=()=>{voicePreference=$('voice').value;try{localStorage.setItem('parliamo-voice-v1',voicePreference)}catch{}updateVoiceDetails()};
$('play').onclick=play;
$('pause').onclick=()=>{stop();setPhase('ready','Paused · Play restarts this card')};
$('reveal').onclick=()=>{stop();revealText();setPhase('ready','Compare your answer')};
$('repeat').onclick=()=>{stop();running=true;$('pause').disabled=false;const t=token;answer(t)};
$('next').onclick=()=>next();
$('responseForm').onsubmit=checkAnswer;
$('response').onkeydown=event=>{
 if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){
  event.preventDefault();
  if(!event.repeat)checkAnswer(event);
 }
};
$('response').oninput=()=>{$('feedback').hidden=true};
$('debug').onchange=()=>{$('metadata').hidden=!$('debug').checked};
$('clear').onclick=()=>{history={};save();$('notice').textContent='Local practice history cleared.'};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();setPhase('ready','Paused · return and tap Play')}});
if(synth){synth.onvoiceschanged=voices;voices()}else $('notice').textContent='Speech is unavailable in this browser. Use Reveal and Next to practise with text.';
fetch('cards.json?v=20261015-dictation').then(r=>{if(!r.ok)throw Error('Bank unavailable');return r.json()}).then(cards=>{bank=cards;$('start').disabled=!guideReady}).catch(()=>{$('start').disabled=true;$('notice').textContent='The card bank could not load. Refresh the page to try again.'});
$('start').disabled=true;
function renderGuide(text){
 const container=$('guideContent');container.replaceChildren();
 let list=null,paragraph=[];
 const flush=()=>{if(paragraph.length){const p=document.createElement('p');p.textContent=paragraph.join(' ');container.appendChild(p);paragraph=[]}};
 for(const line of text.split(/\r?\n/)){
  const heading=line.match(/^(#{1,3}) (.+)$/);
  if(heading){flush();list=null;const h=document.createElement('h'+Math.min(heading[1].length+1,4));h.textContent=heading[2];container.appendChild(h)}
  else if(line.startsWith('- ')){flush();if(!list){list=document.createElement('ul');container.appendChild(list)}const li=document.createElement('li');li.textContent=line.slice(2);list.appendChild(li)}
  else if(!line.trim()){flush();list=null}
  else{list=null;paragraph.push(line)}
 }
 flush();
}
fetch('docs/preparation.md?v=20261019-readable').then(r=>{if(!r.ok)throw Error();return r.text()}).then(text=>{renderGuide(text);guideReady=true;$('start').disabled=!bank.length}).catch(()=>{$('guideContent').textContent='Preparation guide could not load. Please refresh before starting.';$('start').disabled=true});
