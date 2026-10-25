/* Session feedback counts unique sentences, separately from spaced review scheduling. */
const SessionResults=(()=>{
 let entries=new Map();
 return {
 reset(){entries=new Map()},
 visit(card,slot){if(!entries.has(slot))entries.set(slot,{id:card.id,model:card.type==='model',first:null,helped:false,matched:false,accepted:false})},
 help(slot){const e=entries.get(slot);if(e)e.helped=true},
 check(slot,match){const e=entries.get(slot);if(!e)return;if(e.first===null){e.firstHelped=e.helped;e.first=match&&!e.helped?'correct':match?'assisted':'miss'}if(match)e.matched=true},
 accept(slot){const e=entries.get(slot);if(!e)return;e.first=e.firstHelped?'assisted':'correct';e.matched=true;e.accepted=true},
 totals(){const cards=new Map(),models=new Set();for(const e of entries.values()){if(e.model){models.add(e.id);continue}if(!cards.has(e.id))cards.set(e.id,[]);cards.get(e.id).push(e)}let first=0,repeated=0,accepted=0;for(const attempts of cards.values()){if(attempts[0].first==='correct')first++;else if(attempts.some(e=>e.matched))repeated++;if(attempts.some(e=>e.accepted))accepted++}return {total:cards.size,first,repeated,pending:cards.size-first-repeated,models:models.size,accepted}}
 };
})();
