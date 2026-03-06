// SMERTCH Signals - Signal scoring engine


// ── SIGNAL ENGINE ─────────────────────────────────────────────────────────────
function score(p){
  const c5=parseFloat(p.priceChange?.m5||0),c1=parseFloat(p.priceChange?.h1||0);
  const vol=p.volume?.h24||0,mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
  const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
  const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
  let s=50;
  if(c5>5)s+=12;if(c5<-5)s-=18;if(c1>20)s+=18;if(c1<-20)s-=22;
  if(mcap>0){const r=vol/mcap;if(r>0.5)s+=14;if(r<0.05)s-=10;}
  if(liq<5000)s-=24;else if(liq>50000)s+=8;
  if(age&&age<2*3600000&&c5>0)s+=12;
  if(buys>sells*1.5)s+=10;if(sells>buys*2)s-=15;
  if(mcap>0&&mcap<500000)s+=12;if(mcap>5000000)s-=8;
  return Math.max(0,Math.min(100,Math.round(s)));
}
function sigType(s){return s>=68?'buy':s<=32?'sell':'watch';}
