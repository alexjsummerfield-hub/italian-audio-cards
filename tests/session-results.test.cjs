const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../session-results.js'),'utf8'),c);const S=vm.runInContext('SessionResults',c);
const card=(id,type='core')=>({id,type});
S.visit(card('a'),0);S.check(0,true);
S.visit(card('b'),1);S.check(1,false);S.check(1,true);
S.visit(card('c'),2);S.check(2,false);
S.visit(card('c'),3);S.check(3,true);
S.visit(card('d'),4); // skipped
S.visit(card('e'),5);S.help(5);S.check(5,true);
S.visit(card('f'),6);S.check(6,false);S.accept(6);
S.visit(card('m','model'),7);
assert.deepEqual(JSON.parse(JSON.stringify(S.totals())),{total:6,first:2,repeated:3,pending:1,models:1,accepted:1});
S.reset();assert.equal(S.totals().total,0);
S.visit(card('a'),0);S.help(0);S.check(0,false);S.accept(0);assert.equal(S.totals().first,0);assert.equal(S.totals().repeated,1);
console.log('PASS: unique-card completion totals, retries, revealed answers, manual acceptance, skips, models and reset.');
