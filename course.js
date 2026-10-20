'use strict';
const Course = (() => {
 function pool(units,cards,unitId,cumulative){
  const selected=units.find(u=>u.id===unitId);if(!selected)return [];
  const allowed=new Set((cumulative?units.filter(u=>u.order<=selected.order):[selected]).map(u=>u.id));
  return cards.filter(c=>allowed.has(c.unit));
 }
 function sessionSize(value,productionCount){
  const requested=value==='all'?productionCount:Number(value);
  return Math.min(productionCount,Math.max(0,Number.isFinite(requested)?Math.floor(requested):20));
 }
 return {pool,sessionSize};
})();
