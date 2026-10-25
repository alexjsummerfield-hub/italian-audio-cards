'use strict';
const $=id=>document.getElementById(id);
let guideReady=false,bank=[],session=[],index=0,history={},token=0,answerTimer=null,voicePreference='auto',phase='ready',running=false,finished=false;
let learningState={sessionNumber:0,records:{}},currentSession=0,currentAttempt=null,answerSeen=false,lastMismatch=false,retryIds=new Set(),weakPatterns=new Set(),learningSaved=true;
try{
 const stored=JSON.parse(localStorage.getItem('parliamo-learning-v1')||'null');
 if(stored&&Number.isInteger(stored.sessionNumber)&&stored.records&&typeof stored.records==='object'&&!Array.isArray(stored.records))learningState=stored;
}catch{learningSaved=false}
let allCards=[],catalog=[],guideRequest=0;
const synth=window.speechSynthesis;
try{voicePreference=localStorage.getItem('parliamo-voice-v1')||'auto'}catch{}
try{history=JSON.parse(localStorage.getItem('parliamo-history-v1')||'{}')}catch{history={}}
function save(){try{localStorage.setItem('parliamo-history-v1',JSON.stringify(history))}catch{}}
function recentWeight(card){const h=history[card.id]||{};const age=Date.now()-(h.lastPresented||0);return (age<86400000?.2:age<604800000?.55:1)/(1+(h.recentExposureCount||0)*.1)}
function learningWeight(card){const r=learningState.records[card.id];return (r && !Learning.isDue(r,Date.now()) ? .15 : 1)*(weakPatterns.has(Learning.patternKey(card))?2:1)}
function sample(pool,n){return pool.map(c=>({c,k:-Math.log(Math.max(Math.random(),.000001))/(recentWeight(c)*learningWeight(c))})).sort((a,b)=>a.k-b.k).slice(0,n).map(x=>x.c)}
function buildSession(){
 const productionCount=bank.filter(c=>c.type!=='model').length;
 if(!productionCount)return bank.filter(c=>c.type==='model');
 const n=Course.sessionSize($('length').value,productionCount),first=$('mode').value==='first',now=Date.now();
 const due=Learning.dueCards(bank,learningState.records,now);
 weakPatterns=new Set(due.filter(c=>learningState.records[c.id].needsReview).map(Learning.patternKey));
 const counts=first?{core:.35,variation:.45,integration:.1,review:.1}:{core:.15,variation:.6,integration:.15,review:.1};
 const selected=due.slice(0,n),ids=new Set(selected.map(c=>c.id));
 const available=()=>bank.filter(c=>c.type!=='model'&&!ids.has(c.id));
 for(const [type,ratio] of Object.entries(counts)){
  const wanted=Math.max(0,Math.round(n*ratio)-selected.filter(c=>c.type===type).length);
  const picks=sample(available().filter(c=>c.type===type),Math.min(wanted,n-selected.length));
  for(const c of picks){selected.push(c);ids.add(c.id)}
 }
 selected.push(...sample(available(),n-selected.length));
 for(let i=selected.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]]}
 return first?[...bank.filter(c=>c.type==='model'),...selected]:selected;
}
function saveLearning(){
 try{localStorage.setItem('parliamo-learning-v1',JSON.stringify(learningState));learningSaved=true}catch{learningSaved=false}
 updateLearningSummary();
}
function updateLearningSummary(){
 const due=Learning.dueCards(bank,learningState.records,Date.now()).length;
 $('learningSummary').textContent=(due?due+' due for review. ':'')+(learningSaved?'Reviews stay on this device.':'Review history stays in this tab; browser storage is unavailable.');
}
function recordResult(outcome,override=false){
 const c=session[index];if(!c||c.type==='model')return;
 if(!currentAttempt)currentAttempt={original:learningState.records[c.id]?{...learningState.records[c.id]}:null,result:null};
 // Retyping after the model is visible is practice, not a second independent success.
 if(!override&&currentAttempt.result)outcome=currentAttempt.result;
 currentAttempt.result=outcome;
 learningState.records[c.id]=Learning.rate(currentAttempt.original,outcome,Date.now(),currentSession);
 $('reviewHint').textContent=['miss','assisted'].includes(outcome)?'Review again soon.':'';
 saveLearning();
}
function acceptCurrentAnswer(){
 if(!currentAttempt||currentAttempt.result!=='miss'||!lastMismatch)return;
 recordResult('accepted',true);SessionResults.accept(index);lastMismatch=false;
 $('feedback').hidden=false;$('feedback').dataset.result='match';
 $('feedback').textContent='Accepted for this review.';$('acceptAnswer').hidden=true;
}
function markAssisted(){
 SessionResults.help(index);
 if(session[index]?.type!=='model'&&!currentAttempt)recordResult('assisted');
}
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
 $('voiceAvailability').textContent=vs.length+' Italian voice'+(vs.length===1?'':'s')+' available to this browser.';
 updateVoiceDetails();
}
function updateVoiceDetails(){
 const v=selectedItalianVoice();
 $('voiceDetails').textContent=voicePreference==='device'?'Uses your device’s Italian default.':v?v.name+' · '+(voiceQuality(v)||'quality not reported')+' · '+v.voiceURI:'Waiting for Italian voices.';
}
function previewItalianVoice(){
 stop();
 if(!synth){$('voiceTestStatus').textContent='Speech is unavailable in this browser.';return}
 const voice=selectedItalianVoice();
 $('voiceTestStatus').textContent='Playing '+(voice?voice.name:'the device default')+'…';
 running=true;setPhase('voice-test','Testing Italian voice');
 const t=token;
 speak('Buongiorno. Ho una sorella e due fratelli.','it-IT',()=>{
  running=false;setPhase('ready','Voice sample finished');
  $('voiceTestStatus').textContent='Sample finished: '+(voice?voice.name:'device default')+'.';
 },t,()=>{$('voiceTestStatus').textContent='The voice sample could not play. Try another voice.'});
}
function speak(text,lang,done,t,onFailure=()=>{}){if(t!==token)return;if(!synth){done();return}const u=new SpeechSynthesisUtterance(text);u.lang=lang;const vs=synth.getVoices();u.voice=lang==='it-IT'?selectedItalianVoice():vs.find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)))||null;u.rate=lang==='it-IT'?Number($('rate').value):1;u.onend=()=>{if(t===token)done()};u.onerror=()=>{if(t!==token)return;stop();setPhase('ready','Audio unavailable');$('notice').textContent='Audio could not play. Try Play again, or use Reveal and Next for text practice.';onFailure()};synth.speak(u)}
function revealText(){answerSeen=true;const c=session[index];$('answer').hidden=false;$('target').textContent=c.target;$('alternatives').textContent=c.accepted_answers.length?'Also valid: '+c.accepted_answers.join(' / '):(c.type!=='model'&&/^(Non )?(Ho|Hai|Ha|Abbiamo|Avete|Hanno|Sono|Siamo|Lui|Lei)\b/i.test(c.target)?'Subject pronouns may be included or omitted.':'')}
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
 if(!text){$('feedback').dataset.result='empty';$('feedback').hidden=false;$('feedback').textContent='Dictate or type your Italian answer first.';return}
 stop();
 const match=matchesAnswer(text,session[index]);
 SessionResults.check(index,match);
 recordResult(match?(answerSeen?'assisted':'correct'):'miss');
 lastMismatch=!match;$('acceptAnswer').hidden=match||currentAttempt.result!=='miss';
 $('feedback').hidden=false;
 $('feedback').dataset.result=match?'match':'compare';
 $('feedback').textContent=match?'Matches an accepted answer.':'Different from the stored answers. Compare with the model below.';
 $('response').focus({preventScroll:true});
 // Let keyboard dictation release its audio session before speaking.
 const t=token;
 revealText();running=true;$('pause').disabled=false;
 setPhase('settling','Preparing Italian audio');
 answerTimer=setTimeout(()=>{answerTimer=null;if(t===token)answer(t)},Number($('audioDelay').value));

}
function show(){SessionResults.visit(session[index],index);$('cardBody').hidden=false;$('practiceControls').hidden=false;$('sessionComplete').hidden=true;currentAttempt=null;answerSeen=false;lastMismatch=false;$('acceptAnswer').hidden=true;$('reviewHint').textContent='';const c=session[index];document.body.classList.add('practising');$('back').hidden=false;updatePracticeViewport();finished=false;$('progress').textContent=`Card ${index+1} of ${session.length}`;$('bar').max=session.length;$('bar').value=index;$('prompt').textContent=c.prompt;$('promptNote').textContent=c.prompt_note?'('+c.prompt_note+')':'';$('promptNote').hidden=!c.prompt_note;$('instruction').textContent=c.type==='model'?'LISTEN & REPEAT':'SAY IT IN ITALIAN';$('next').textContent=index+1===session.length?'Finish ✓':'Next →';$('answer').hidden=true;$('responseForm').hidden=c.type==='model';$('response').value='';$('response').disabled=false;$('feedback').hidden=true;$('feedback').textContent='';setPhase('ready',c.type==='model'?'Tap Play when ready':'Return to check your answer');$('metadata').textContent=JSON.stringify(c,null,2);$('metadata').hidden=!$('debug').checked;for(const id of ['play','reveal','repeat','next'])$(id).disabled=false;const h=history[c.id]||{};const fresh=Date.now()-(h.lastPresented||0)>604800000;history[c.id]={lastPresented:Date.now(),recentExposureCount:(fresh?0:h.recentExposureCount||0)+1};save();if(c.type!=='model')$('response').focus({preventScroll:true})}
function next(){stop();if(currentAttempt&&['miss','assisted'].includes(currentAttempt.result))Learning.queueRetry(session,index,retryIds);if(index+1>=session.length){completeSession();return}index++;show();play();}
function startSession(){stop();SessionResults.reset();currentSession=++learningState.sessionNumber;retryIds=new Set();saveLearning();session=buildSession();index=0;show();$('notice').textContent='';play()}
$('start').onclick=startSession;
$('again').onclick=startSession;
function completeSession(){
 finished=true;$('response').blur();$('response').disabled=true;$('bar').value=session.length;setPhase('done','Session complete');
 const result=SessionResults.totals();
 $('progress').textContent='Session complete';$('cardBody').hidden=true;$('practiceControls').hidden=true;$('sessionComplete').hidden=false;
 $('completionTotal').textContent=(result.total?result.total+' sentence cards completed':'')+(result.models?(result.total?' · ':'')+result.models+' pronunciation models completed':'')+'.';
 for(const [id,value] of [['firstCount',result.first],['repeatCount',result.repeated],['pendingCount',result.pending]])$(id).textContent=String(value);
 $('completionNote').textContent=(result.pending?'Not yet correct includes cards without a submitted match. ':'')+(result.accepted?result.accepted+' self-accepted answer'+(result.accepted===1?'':'s')+' included.':'');
 $('sessionComplete').focus({preventScroll:true});
}
$('openSettings').onclick=()=>{stop();$('response').blur();$('settingsPanel').showModal()};
$('closeSettings').onclick=()=>$('settingsPanel').close();
$('settingsPanel').onclose=()=>{if(document.body.classList.contains('practising')&&!finished&&session[index]?.type!=='model')$('response').focus({preventScroll:true})};
// Prevent the navigation tap from transferring focus away from the answer field.
$('next').onpointerdown=event=>{if(document.activeElement===$('response'))event.preventDefault()};
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
$('refreshVoices').onclick=()=>{voices();$('voiceTestStatus').textContent='Voice list refreshed.'};
$('previewVoice').onclick=previewItalianVoice;
$('voice').onchange=()=>{$('voiceTestStatus').textContent='';voicePreference=$('voice').value;try{localStorage.setItem('parliamo-voice-v1',voicePreference)}catch{}updateVoiceDetails()};
$('play').onclick=play;
$('pause').onclick=()=>{stop();setPhase('ready','Paused · Play restarts this card')};
$('reveal').onclick=()=>{stop();markAssisted();revealText();setPhase('ready','Compare your answer')};
$('repeat').onclick=()=>{stop();markAssisted();running=true;$('pause').disabled=false;const t=token;answer(t)};
$('next').onclick=()=>next();
$('responseForm').onsubmit=checkAnswer;
$('response').onkeydown=event=>{
 if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){
  event.preventDefault();
  if(!event.repeat)checkAnswer(event);
 }
};
$('response').oninput=()=>{$('feedback').hidden=true;$('acceptAnswer').hidden=true;lastMismatch=false};
$('acceptAnswer').onclick=acceptCurrentAnswer;
$('debug').onchange=()=>{$('metadata').hidden=!$('debug').checked};
$('clear').onclick=()=>{history={};save();learningState.records={};currentAttempt=null;retryIds.clear();if(session.length)session.splice(index+1,session.length,...session.slice(index+1).filter(c=>!c._retry));$('acceptAnswer').hidden=true;$('reviewHint').textContent='';saveLearning();$('notice').textContent='Local practice and review history cleared.'};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();setPhase('ready','Paused · return and tap Play')}});
if(synth){synth.onvoiceschanged=voices;voices()}else $('notice').textContent='Speech is unavailable in this browser. Use Reveal and Next to practise with text.';
$('start').disabled=true;
function updateUnitOptions(preferred){
 const units=catalog.filter(u=>u.level===$('level').value);
 $('unit').replaceChildren(...units.map(u=>new Option(u.id+' · '+u.title,u.id)));
 $('unit').value=units.some(u=>u.id===preferred)?preferred:units[0].id;
}
async function applyCourseSelection(){
 stop();$('cardBody').hidden=false;$('practiceControls').hidden=false;$('sessionComplete').hidden=true;guideReady=false;$('start').disabled=true;session=[];currentAttempt=null;
 document.body.classList.remove('practising');$('back').hidden=true;
 $('responseForm').hidden=true;$('answer').hidden=true;
 for(const id of ['play','pause','reveal','repeat','next'])$(id).disabled=true;
 const unit=catalog.find(u=>u.id===$('unit').value);
 bank=Course.pool(catalog,allCards,unit.id,$('scope').value==='through');
 $('unitCode').textContent=unit.id;$('courseTitle').textContent=unit.title;
 $('levelBadge').textContent='ITALIAN · '+unit.level;
 $('unitInfo').textContent=bank.length+' cards available'+(unit.level==='A2'?' · A2 testing sample':'')+'.';
 $('scopeNote').hidden=$('scope').value!=='through';
 $('practiceMode').hidden=!bank.some(c=>c.type==='model')||unit.model_only&&$('scope').value==='unit';
 $('guideTitle').textContent='Preparation · '+unit.title;
 $('instruction').textContent='PREPARE, THEN PRACTISE';$('prompt').textContent='Ready for '+unit.title.toLowerCase()+'.';
 $('promptNote').hidden=true;$('progress').textContent='Ready when you are';$('bar').value=0;
 setPhase('ready','Read the preparation first');$('notice').textContent='';
 updateLearningSummary();
 try{localStorage.setItem('parliamo-course-v1',JSON.stringify({unit:unit.id,scope:$('scope').value}))}catch{}
 const request=++guideRequest;$('guideContent').textContent='Loading preparation…';
 try{
  const response=await fetch(unit.guide+'?v=20261020-course');
  if(!response.ok)throw Error('Preparation unavailable');
  const text=await response.text();if(request!==guideRequest)return;
  renderGuide(text);guideReady=true;$('start').disabled=false;
 }catch{
  if(request!==guideRequest)return;
  $('guideContent').textContent='Preparation could not load. Please reload before starting.';
 }
}
$('level').onchange=()=>{updateUnitOptions();applyCourseSelection()};
$('unit').onchange=applyCourseSelection;
$('scope').onchange=applyCourseSelection;
async function loadCourse(){
 try{
  const response=await fetch('catalog.json?v=20261020-course');if(!response.ok)throw Error();
  catalog=await response.json();
  const files=[...new Set(catalog.flatMap(u=>u.files))];
  const groups=await Promise.all(files.map(async file=>{const r=await fetch(file+'?v=20261020-course');if(!r.ok)throw Error();return r.json()}));
  allCards=groups.flat();
  let preference={unit:'A1-M2-U2',scope:'unit'};
  try{const saved=JSON.parse(localStorage.getItem('parliamo-course-v1')||'null');if(saved&&catalog.some(u=>u.id===saved.unit))preference=saved}catch{}
  const selected=catalog.find(u=>u.id===preference.unit);
  $('level').value=selected.level;$('scope').value=preference.scope==='through'?'through':'unit';
  updateUnitOptions(selected.id);await applyCourseSelection();
 }catch{$('notice').textContent='The course could not load. Reload the page to try again.';$('start').disabled=true}
}
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
loadCourse();
