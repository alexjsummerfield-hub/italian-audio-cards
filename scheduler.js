'use strict';
// Small, deterministic review rules. No dictated or typed answer text is stored.
const Learning = (() => {
 const DAY=86400000, intervals=[1,3,7,14,30];
 function isDue(record,now){return !!record&&(record.needsReview||record.dueAt<=now)}
 function rate(previous,outcome,now,sessionId){
  const p=previous||{},r={...p,attempts:(p.attempts||0)+1,lastSession:sessionId,lastReviewed:now,lastOutcome:outcome};
  if(outcome==='miss'||outcome==='assisted'){
   r[outcome==='miss'?'misses':'assisted']=(p[outcome==='miss'?'misses':'assisted']||0)+1;
   return {...r,streak:0,needsReview:true,dueAt:now,lastMissSession:sessionId};
  }
  r.correct=(p.correct||0)+1;
  // A same-session repair is useful, but needs a fresh retrieval next session.
  if(p.lastMissSession===sessionId)return {...r,streak:0,needsReview:true,dueAt:now};
  // Extra practice before a review is due does not inflate the interval.
  if(p.lastSession===sessionId||(p.dueAt||0)>now)return {...r,needsReview:!!p.needsReview};
  const streak=Math.min((p.streak||0)+1,intervals.length);
  return {...r,streak,needsReview:false,dueAt:now+intervals[streak-1]*DAY};
 }
 function patternKey(card){
  const structure=card.grammar.filter(g=>['negation','yes-no-question','noun-plural','adjective-agreement'].includes(g)).sort();
  return [...card.targets].sort().join(',')+'|'+structure.join(',');
 }
 function dueCards(cards,records,now){
  return cards.filter(c=>c.type!=='model'&&isDue(records[c.id],now)).sort((a,b)=>{
   const x=records[a.id],y=records[b.id];
   return Number(!!y.needsReview)-Number(!!x.needsReview)||(x.dueAt-y.dueAt)||a.id.localeCompare(b.id);
  });
 }
 function queueRetry(cards,index,alreadyQueued,maxRetries=6){
  const current=cards[index];
  if(current._retry||alreadyQueued.has(current.id)||alreadyQueued.size>=maxRetries)return false;
  // Never force an immediate repetition at the end of a session.
  if(cards.length-index-1<3)return false;
  const key=patternKey(current);
  const sibling=cards.findIndex((c,i)=>i>index+1&&c.id!==current.id&&!c._retry&&patternKey(c)===key);
  if(sibling>=0){const [card]=cards.splice(sibling,1);cards.splice(index+2,0,card)}
  cards.splice(index+4,0,{...current,_retry:true});alreadyQueued.add(current.id);return true;
 }
 return {DAY,intervals,isDue,rate,patternKey,dueCards,queueRetry};
})();
