const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),cards=JSON.parse(fs.readFileSync(path.join(root,'cards.json')));
const source=fs.readFileSync(path.join(root,'scheduler.js'),'utf8');const pure=vm.createContext({});vm.runInContext(source,pure);const L=vm.runInContext('Learning',pure),now=1800000000000;
let record=L.rate(null,'correct',now,1);assert.equal(record.dueAt,now+L.DAY);
for(const [session,days] of [[2,3],[3,7],[4,14],[5,30],[6,30]]){const time=record.dueAt;record=L.rate(record,'correct',time,session);assert.equal(record.dueAt,time+days*L.DAY)}
let failed=L.rate(record,'miss',now,10);assert(failed.needsReview);assert.equal(failed.streak,0);
let repaired=L.rate(failed,'correct',now+10000,10);assert(repaired.needsReview);assert.equal(repaired.streak,0);
let reviewed=L.rate(repaired,'correct',now+20000,11);assert.equal(reviewed.streak,1);assert.equal(reviewed.dueAt,now+20000+L.DAY);
assert.equal(L.rate(reviewed,'correct',now+30000,12).dueAt,reviewed.dueAt);
const pool=cards.filter(c=>c.type!=='model');const queue=pool.slice(0,10),original=queue[0].id,retries=new Set();assert(L.queueRetry(queue,0,retries));assert.equal(queue[4].id,original);assert(queue[4]._retry);assert(!L.queueRetry(queue,0,retries));assert(!L.queueRetry(queue,4,retries));assert(!L.queueRetry(queue,queue.length-2,new Set()));assert(!L.queueRetry(queue,0,new Set(['a','b','c','d','e','f'])));
const distinct=pool.find(c=>c.id!==pool[0].id&&L.patternKey(c)===L.patternKey(pool[0]));assert(distinct);
const dueRecords={[pool[0].id]:{needsReview:false,dueAt:now-1000},[pool[1].id]:{needsReview:true,dueAt:now-500},[pool[2].id]:{needsReview:false,dueAt:now+L.DAY}};
assert.equal(L.dueCards(pool,dueRecords,now)[0].id,pool[1].id);assert.equal(L.dueCards(pool,dueRecords,now).length,2);
function boot(saved={}){
 const elements={},spoken=[],timers=new Map(),classes=new Set();let nextTimer=0;
 const node=tag=>({tag,children:[],value:'',textContent:'',hidden:true,disabled:false,dataset:{},appendChild(n){this.children.push(n)},replaceChildren(...n){this.children=n},add(n){this.children.push(n)},focus(){context.document.activeElement=this},blur(){if(context.document.activeElement===this)context.document.activeElement=null},showModal(){this.open=true},close(){this.open=false;this.onclose?.()},scrollIntoView(){}});
 const el=id=>{if(!elements[id]){elements[id]=node('');elements[id].value={mode:'later',length:'10',rate:'1',audioDelay:'1500'}[id]||''}return elements[id]};
 const context=vm.createContext({document:{getElementById:el,createElement:node,addEventListener(){},body:{classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)}}},documentElement:{style:{setProperty(){}}}},window:{addEventListener(){},visualViewport:{height:360,offsetTop:0,addEventListener(){}},speechSynthesis:{cancel(){},getVoices(){return []},speak(u){spoken.push(u)}}},SpeechSynthesisUtterance:function(text){this.text=text},localStorage:{getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v}},fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8')),text:async()=>fs.readFileSync(path.join(root,url.split('?')[0]),'utf8')}),Option:function(){},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},console,Math,Date});
 vm.runInContext(fs.readFileSync(path.join(root,'session-results.js'),'utf8'),context);vm.runInContext(source,context);vm.runInContext(fs.readFileSync(path.join(root,'course.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
 return {run:s=>vm.runInContext(s,context),el,saved,timers,spoken};
}
(async()=>{
 const app=boot();await new Promise(resolve=>setImmediate(resolve));const {run,el}=app;
 run("currentSession=++learningState.sessionNumber;session=bank.filter(c=>c.type!=='model').slice(0,10);index=0;show();");
 el('response').value='Definitely not the answer';el('responseForm').onsubmit({preventDefault(){}});
 assert.equal(run('currentAttempt.result'),'miss');assert.equal(run('document.activeElement===document.getElementById("response")'),false);assert.equal(el('acceptAnswer').hidden,false);assert.equal(run('learningState.records[session[0].id].attempts'),1);
 el('responseForm').onsubmit({preventDefault(){}});assert.equal(run('learningState.records[session[0].id].attempts'),1);
 el('acceptAnswer').onclick();assert.equal(run('currentAttempt.result'),'accepted');assert.equal(run('learningState.records[session[0].id].misses||0'),0);assert.equal(run('learningState.records[session[0].id].correct'),1);assert.equal(el('acceptAnswer').hidden,true);
 el('next').onclick();assert.equal(run('session.length'),10);assert.equal(run('index'),1);assert.equal(run('document.activeElement===document.getElementById("response")'),true);
 el('rate').value='0.7';el('rate').onchange();assert.equal(app.spoken.at(-1).rate,0.7);assert.equal(app.spoken.at(-1).volume,1);assert.equal(app.saved['parliamo-rate-v1'],'0.7');
 el('response').value='Wrong again';el('responseForm').onsubmit({preventDefault(){}});el('next').onclick();assert.equal(run('session.length'),11);assert.equal(run('session[5].id'),run('session[1].id'));assert.equal(run('session[5]._retry'),true);
 run('index=3;show()');el('reveal').onclick();assert.equal(run('currentAttempt.result'),'assisted');el('response').value=run('session[index].target');el('responseForm').onsubmit({preventDefault(){}});assert.equal(run('currentAttempt.result'),'assisted');
 const savedBefore=JSON.parse(app.saved['parliamo-learning-v1']);assert(Object.keys(savedBefore.records).length>=3);assert(!app.saved['parliamo-learning-v1'].includes('Wrong again'));
 const reload=boot({...app.saved});assert.equal(reload.el('rate').value,'0.7');await new Promise(resolve=>setImmediate(resolve));assert.equal(reload.run('Object.keys(learningState.records).length'),Object.keys(savedBefore.records).length);
 const missed=run('session[1].id');reload.run('currentSession=++learningState.sessionNumber');const ids=reload.run('buildSession().map(c=>c.id)');assert(ids.includes(missed));assert.equal(new Set(ids).size,10);
 for(const mode of ['first','later'])for(const n of [10,20,30,41]){reload.el('mode').value=mode;reload.el('length').value=String(n);for(let i=0;i<100;i++){const ids=reload.run('buildSession().map(c=>c.id)');assert.equal(ids.length,n+(mode==='first'?7:0));assert.equal(new Set(ids).size,ids.length)}}
 reload.el('level').value='A0';reload.el('level').onchange();await new Promise(resolve=>setImmediate(resolve));assert.equal(reload.run('bank.length'),12);assert(reload.run("bank.every(c=>c.type==='model')"));assert.equal(reload.run('buildSession().length'),12);reload.el('start').onclick();assert.equal(reload.el('responseForm').hidden,true);
 reload.el('back').onclick();reload.el('level').value='A1';reload.el('level').onchange();await new Promise(resolve=>setImmediate(resolve));assert.equal(reload.run('bank.length'),12);reload.el('length').value='20';assert.equal(reload.run('buildSession().filter(c=>c.type!=="model").length'),12);
 reload.el('unit').value='A1-M7-U3';reload.el('scope').value='through';await reload.run('applyCourseSelection()');assert.equal(reload.run('bank.length'),288);assert(!reload.run("bank.some(c=>c.unit.startsWith('A2'))"));
 reload.el('level').value='A2';reload.el('level').onchange();await new Promise(resolve=>setImmediate(resolve));reload.el('scope').value='unit';reload.el('unit').value='A2-M4-U1';await reload.run('applyCourseSelection()');assert.equal(reload.run('bank.length'),12);assert(reload.run("bank.every(c=>c.unit==='A2-M4-U1')"));
 reload.el('scope').value='through';await reload.run('applyCourseSelection()');assert.equal(reload.run('bank.length'),384);
 reload.el('clear').onclick();assert.equal(reload.run('Object.keys(learningState.records).length'),0);assert.equal(JSON.parse(reload.saved['parliamo-learning-v1']).records.constructor,Object);
 run('index=session.length-1;show();completeSession()');assert.equal(el('sessionComplete').hidden,false);assert.equal(el('cardBody').hidden,true);assert.equal(run('document.activeElement===document.getElementById("response")'),false);el('openSettings').onclick();assert.equal(el('settingsPanel').open,true);el('closeSettings').onclick();assert.equal(el('settingsPanel').open,false);
 console.log('PASS: spaced intervals, same-session protection, due priority, delayed/capped retries, override rollback, assisted answers, first-attempt counting, persistence, reset, privacy and 800 session selections.');
})().catch(error=>{console.error(error);process.exitCode=1});
