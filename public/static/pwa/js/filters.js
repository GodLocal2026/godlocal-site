// SMERTCH Filters - Filter panel logic


// ── FILTERS ─────────────────────────────────────────────────────────────────
function toggleFilters(){
  const p=document.getElementById('fltPanel'), c=document.getElementById('fltChip');
  const open=p.classList.toggle('open');
  c.classList.toggle('on',open);
}
function setF(key,val,el){
  flt[key]=val;
  el.closest('.flt-row').querySelectorAll('.flt-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  const active=flt.mcap||flt.liq||flt.age||flt.sig!=='all';
  document.getElementById('fltChip').classList.toggle('active-flt',active);
}
function resetFilters(){
  flt={mcap:0,liq:0,age:0,sig:'all'};
  document.querySelectorAll('.flt-row .flt-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.flt-row .flt-btn:first-of-type').forEach(b=>b.classList.add('on'));
  document.getElementById('fltChip').classList.remove('active-flt');
}
function applyFilters(pairs){
  return pairs.filter(p=>{
    const mcap=p.fdv||p.marketCap||0;
    const liq=p.liquidity?.usd||0;
    const age=p.pairCreatedAt?Math.floor((Date.now()-p.pairCreatedAt)/60000):9999;
    const sig=sigType(score(p));
    if(flt.mcap>0 && mcap>flt.mcap) return false;
    if(flt.liq>0 && liq<flt.liq) return false;
    if(flt.age>0 && age>flt.age) return false;
    if(flt.sig==='buy' && sig!=='buy') return false;
    return true;
  });
}
