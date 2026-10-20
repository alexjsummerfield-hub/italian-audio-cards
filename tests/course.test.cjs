const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),units=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'))),files=[...new Set(units.flatMap(u=>u.files))],cards=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,f))));
const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'course.js'),'utf8'),context);const C=vm.runInContext('Course',context);
assert.equal(units.length,28);assert.equal(cards.length,384);assert.equal(new Set(cards.map(c=>c.id)).size,384);
const totals=Object.fromEntries(['A0','A1','A2'].map(level=>[level,units.filter(u=>u.level===level).reduce((sum,u)=>sum+u.cards,0)]));assert.deepEqual(totals,{A0:24,A1:264,A2:96});
for(const unit of units){
 const own=C.pool(units,cards,unit.id,false);assert.equal(own.length,unit.cards);assert(own.every(c=>c.unit===unit.id));
 const through=C.pool(units,cards,unit.id,true),allowed=new Set(units.filter(u=>u.order<=unit.order).map(u=>u.id));assert(through.every(c=>allowed.has(c.unit)));assert(!through.some(c=>units.find(u=>u.id===c.unit).order>unit.order));
 const guide=fs.readFileSync(path.join(root,unit.guide),'utf8');assert(guide.length>400);assert(!guide.includes('<a id='));
 assert.equal(unit.model_only,own.every(c=>c.type==='model'));
 for(const card of own){assert(card.prompt&&card.target&&card.id);assert(Array.isArray(card.accepted_answers));assert(card.targets.length&&card.grammar.length&&card.requires.length);assert(!/Now (say|make|ask)|Listen and repeat| — /i.test(card.prompt));assert([1,2,3].includes(card.difficulty));}
 const count=own.filter(c=>c.type!=='model').length;assert.equal(C.sessionSize('20',count),Math.min(20,count));assert.equal(C.sessionSize('all',count),count);
}
assert.equal(C.pool(units,cards,'unknown',true).length,0);
for(let i=1;i<=48;i++){const id='IT-A1-M2-U2-S'+String(i).padStart(3,'0');assert(cards.some(c=>c.id===id))}
assert(cards.find(c=>c.prompt==='I am thirty years old.').accepted_answers.includes('Ho 30 anni.'));
assert(cards.find(c=>c.prompt==='Marco had to go home.').accepted_answers.includes('Marco ha dovuto andare a casa.'));
assert(cards.filter(c=>c.unit==='A0-M1-U1').every(c=>c.type==='model'));
console.log('PASS: 384 unique stable cards, 28 guides, level totals, legacy IDs, unit/cumulative boundaries, short/all sessions, direct prompts and key accepted alternatives.');
