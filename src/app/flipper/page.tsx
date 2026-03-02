'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const COINS = [
  { name:'PEPE',   sym:'🐸', base:0.0000089, tier:'🔥',  vol:'840K'  },
  { name:'BONK',   sym:'🔨', base:0.0000234, tier:'⚡',  vol:'320K'  },
  { name:'WIF',    sym:'🎩', base:0.0234,    tier:'💎',  vol:'45M'   },
  { name:'POPCAT', sym:'🐱', base:0.041,     tier:'🔥',  vol:'78M'   },
  { name:'MICHI',  sym:'🐈', base:0.00034,   tier:'⚡',  vol:'12M'   },
  { name:'PNUT',   sym:'🥜', base:0.0089,    tier:'💎',  vol:'23M'   },
  { name:'BRETT',  sym:'🧑', base:0.067,     tier:'🔥',  vol:'110M'  },
  { name:'MOODENG',sym:'🦛', base:0.0023,    tier:'⚡',  vol:'56M'   },
  { name:'GOAT',   sym:'🐐', base:0.11,      tier:'💎',  vol:'210M'  },
  { name:'SPX6900',sym:'📈', base:0.94,      tier:'🔥',  vol:'340M'  },
]

function rnd(min:number,max:number){ return Math.random()*(max-min)+min }
function mkCoin(){
  const c = COINS[Math.floor(Math.random()*COINS.length)]
  const change = parseFloat(rnd(-85,950).toFixed(1))
  const x = parseFloat(rnd(0.1, change>0 ? Math.min(change/10+1,80) : 0.5).toFixed(1))
  const mcap  = (rnd(0.5,500)).toFixed(1)+'M'
  return {...c, change, x, mcap}
}

type Coin = ReturnType<typeof mkCoin>
type Phase = 'decide'|'result'

const TIMER_MS = 5000

export default function FlipperPage(){
  const [coin,   setCoin]   = useState<Coin>(mkCoin)
  const [phase,  setPhase]  = useState<Phase>('decide')
  const [result, setResult] = useState<{win:boolean,x:number,change:number}|null>(null)
  const [stats,  setStats]  = useState({flips:0,wins:0,bestX:0,totalMs:0})
  const [tLeft,  setTLeft]  = useState(TIMER_MS)
  const [streak, setStreak] = useState(0)
  const [combo,  setCombo]  = useState(0)        // consecutive wins
  const [history,setHistory]= useState<{win:boolean,x:number}[]>([])
  const startT = useRef(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval>>()

  const next = useCallback(()=>{
    setCoin(mkCoin())
    setPhase('decide')
    setResult(null)
    setTLeft(TIMER_MS)
    startT.current = Date.now()
  },[])

  useEffect(()=>{
    if(phase!=='decide') return
    tickRef.current = setInterval(()=>{
      setTLeft(t=>{
        if(t<=100){ decide('skip'); return 0 }
        return t-100
      })
    },100)
    return ()=>clearInterval(tickRef.current)
  },[phase])  // eslint-disable-line

  const decide = useCallback((dec:'flip'|'skip')=>{
    clearInterval(tickRef.current)
    const ms = Date.now()-startT.current
    const isGood = coin.change > 20          // coins pumped 20%+ = actually good
    const win = dec==='flip' ? isGood : !isGood
    const xVal = win ? coin.x : 0

    setResult({win, x:coin.x, change:coin.change})
    setPhase('result')
    setStats(s=>({
      flips  : s.flips+1,
      wins   : win ? s.wins+1 : s.wins,
      bestX  : win&&coin.x>s.bestX ? coin.x : s.bestX,
      totalMs: s.totalMs+ms,
    }))
    setCombo(c=> win ? c+1 : 0)
    setStreak(c=> win ? c+1 : 0)
    setHistory(h=>[...h.slice(-9),{win, x:xVal}])
    setTimeout(next, 1800)
  },[coin,next])

  const acc    = stats.flips>0 ? Math.round(stats.wins/stats.flips*100) : 0
  const avgSpd = stats.flips>0 ? (stats.totalMs/stats.flips/1000).toFixed(1) : '—'
  const pct    = tLeft/TIMER_MS
  const barClr = pct>0.5?'#30D158':pct>0.25?'#FF9F0A':'#FF3B30'
  const priceStr = coin.base<0.001
    ? coin.base.toFixed(7)
    : coin.base<1 ? coin.base.toFixed(4) : coin.base.toFixed(2)

  return (
    <div style={{
      minHeight:'100dvh', background:'#05060D',
      fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif',
      overflow:'hidden', position:'relative',
      display:'flex', flexDirection:'column', alignItems:'center',
      paddingTop:'env(safe-area-inset-top,16px)',
      paddingBottom:'env(safe-area-inset-bottom,16px)',
    }}>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes bgShift{0%,100%{opacity:1}50%{opacity:0.75}}
        @keyframes cardIn{from{transform:scale(0.92) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes resultIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(255,45,85,0.4)}70%{box-shadow:0 0 0 10px rgba(255,45,85,0)}}
        @keyframes streak{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}
      `}}/>

      {/* ─── Background layers ─── */}
      <div style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',animation:'bgShift 6s ease-in-out infinite'}}>
        {/* neon brain glow top-right */}
        <div style={{position:'absolute',top:'-10%',right:'-10%',width:'60vw',height:'60vw',borderRadius:'50%',
          background:'radial-gradient(circle,rgba(255,0,180,0.22) 0%,transparent 70%)'}} />
        {/* cyan glow bottom-left */}
        <div style={{position:'absolute',bottom:'-5%',left:'-5%',width:'50vw',height:'50vw',borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,200,255,0.18) 0%,transparent 70%)'}} />
        {/* center deep glow */}
        <div style={{position:'absolute',top:'35%',left:'50%',transform:'translateX(-50%)',width:'80vw',height:'40vw',borderRadius:'50%',
          background:'radial-gradient(ellipse,rgba(120,0,255,0.1) 0%,transparent 70%)'}} />
        {/* grid overlay */}
        <div style={{position:'absolute',inset:0,
          backgroundImage:'linear-gradient(rgba(0,200,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,0.04) 1px,transparent 1px)',
          backgroundSize:'40px 40px'}} />
      </div>

      {/* ─── Header ─── */}
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:480,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'12px 20px 4px'}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:-0.5,
            background:'linear-gradient(135deg,#FF2D80,#00CFFF)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            ⚡ Флипер мемов
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>
            {stats.flips} флипов • серия {streak}
          </div>
        </div>
        {/* History dots */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          {[...Array(10)].map((_,i)=>{
            const h = history[history.length-10+i]
            return <div key={i} style={{
              width:8,height:8,borderRadius:'50%',
              background: h ? (h.win?'#30D158':'#FF3B30') : 'rgba(255,255,255,0.12)',
              transition:'background 0.3s'
            }}/>
          })}
        </div>
      </div>

      {/* ─── Stats row ─── */}
      <div style={{position:'relative',zIndex:1,display:'flex',gap:8,padding:'10px 20px 8px',width:'100%',maxWidth:480}}>
        {[
          {label:'⚡ Скорость', val: avgSpd==='—' ? '—' : `${avgSpd}с`, clr:'#FF9F0A'},
          {label:'🎯 Меткость', val:`${acc}%`,    clr:'#30D158'},
          {label:`✕ Макс`,    val: stats.bestX>0 ? `${stats.bestX}x` : '—', clr:'#FF2D80'},
        ].map(s=>(
          <div key={s.label} style={{
            flex:1,borderRadius:14,padding:'8px 10px',textAlign:'center',
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)',
            backdropFilter:'blur(12px)',
          }}>
            <div style={{fontSize:17,fontWeight:700,color:s.clr,letterSpacing:-0.5}}>{s.val}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Coin card ─── */}
      <div key={coin.name+coin.change} style={{
        position:'relative',zIndex:1,width:'100%',maxWidth:480,padding:'0 16px',
        animation:'cardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <div style={{
          borderRadius:24,overflow:'hidden',
          background:'rgba(12,14,24,0.75)',
          border:`1px solid rgba(255,255,255,${phase==='result'&&result ? (result.win?'0.25':'0.15') : '0.1'})`,
          backdropFilter:'blur(24px)',
          boxShadow: phase==='result'&&result
            ? result.win
              ? '0 0 40px rgba(48,209,88,0.3),0 12px 40px rgba(0,0,0,0.5)'
              : '0 0 40px rgba(255,59,48,0.25),0 12px 40px rgba(0,0,0,0.5)'
            : '0 12px 40px rgba(0,0,0,0.4)',
          transition:'box-shadow 0.4s ease,border-color 0.4s ease',
        }}>

          {/* Coin header */}
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 20px 12px'}}>
            <div style={{
              width:52,height:52,borderRadius:16,
              background:'linear-gradient(135deg,rgba(255,0,180,0.3),rgba(0,200,255,0.3))',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,
              border:'1px solid rgba(255,255,255,0.1)',
              flexShrink:0,
            }}>{coin.sym}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:20,fontWeight:700,letterSpacing:-0.5,color:'#fff'}}>{coin.name}</span>
                <span style={{fontSize:13,background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'2px 7px',color:'rgba(255,255,255,0.5)'}}>{coin.tier}</span>
              </div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:2}}>
                MCap {coin.mcap} · Vol {coin.vol}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:17,fontWeight:600,color:'#fff',letterSpacing:-0.5}}>${priceStr}</div>
              <div style={{fontSize:13,fontWeight:600,color: coin.change>0?'#30D158':'#FF3B30',marginTop:2}}>
                {coin.change>0?'+':''}{coin.change}%
              </div>
            </div>
          </div>

          {/* X badge */}
          <div style={{display:'flex',justifyContent:'center',padding:'4px 20px 12px'}}>
            <div style={{
              background:'linear-gradient(135deg,rgba(255,0,180,0.15),rgba(120,0,255,0.15))',
              border:'1px solid rgba(255,0,180,0.25)',
              borderRadius:12,padding:'6px 20px',display:'flex',alignItems:'center',gap:12,
            }}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>потенциал</span>
              <span style={{fontSize:20,fontWeight:800,
                background:'linear-gradient(135deg,#FF2D80,#FF9F0A)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:-1}}>
                ×{coin.x}
              </span>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>если угадал</span>
            </div>
          </div>

          {/* Timer bar */}
          {phase==='decide' && (
            <div style={{padding:'0 20px 16px'}}>
              <div style={{height:4,borderRadius:2,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
                <div style={{
                  height:'100%',background:barClr,borderRadius:2,
                  width:`${pct*100}%`,transition:'width 0.1s linear,background 0.3s ease',
                }}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>решай быстро</span>
                <span style={{fontSize:11,color:barClr,fontWeight:600}}>{(tLeft/1000).toFixed(1)}с</span>
              </div>
            </div>
          )}

          {/* Result overlay */}
          {phase==='result' && result && (
            <div style={{
              padding:'10px 20px 18px',textAlign:'center',
              animation:'resultIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              <div style={{fontSize:32,marginBottom:4}}>
                {result.win ? '🔥' : '💀'}
              </div>
              <div style={{fontSize:19,fontWeight:700,color:result.win?'#30D158':'#FF3B30',letterSpacing:-0.5}}>
                {result.win
                  ? combo>1 ? `×${result.x} — КОМБО ${combo}!` : `×${result.x} — ПРИБЫЛЬ`
                  : 'СЛИЛ'}
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                {result.change>0 ? `монета выросла на +${result.change}%` : `монета упала на ${result.change}%`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Action buttons ─── */}
      {phase==='decide' && (
        <div style={{
          position:'relative',zIndex:1,display:'flex',gap:12,
          padding:'14px 16px 0',width:'100%',maxWidth:480,
        }}>
          {/* FLIP */}
          <button onClick={()=>decide('flip')} style={{
            flex:2,borderRadius:18,border:'none',cursor:'pointer',
            padding:'17px 0',fontSize:16,fontWeight:700,letterSpacing:0.2,
            background:'linear-gradient(135deg,#30D158,#34C759)',
            color:'#fff',
            boxShadow:'0 4px 20px rgba(48,209,88,0.4)',
            transform:'translateZ(0)',transition:'transform 0.12s,box-shadow 0.12s',
          }}
          onTouchStart={e=>(e.currentTarget.style.transform='scale(0.96)')}
          onTouchEnd={e=>(e.currentTarget.style.transform='scale(1)')}>
            ⚡ ФЛИПНУТЬ
          </button>
          {/* PASS */}
          <button onClick={()=>decide('skip')} style={{
            flex:1,borderRadius:18,border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',
            padding:'17px 0',fontSize:16,fontWeight:600,
            background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.55)',
            backdropFilter:'blur(12px)',
            transition:'transform 0.12s',
          }}
          onTouchStart={e=>(e.currentTarget.style.transform='scale(0.96)')}
          onTouchEnd={e=>(e.currentTarget.style.transform='scale(1)')}>
            ПАСС
          </button>
        </div>
      )}

      {/* ─── Combo flash ─── */}
      {phase==='result' && combo>=3 && (
        <div style={{
          position:'relative',zIndex:1,textAlign:'center',marginTop:8,
          fontSize:13,fontWeight:700,
          color:'#FF9F0A',animation:'streak 0.6s ease',
          letterSpacing:1,
        }}>
          🔥 СЕРИЯ {combo} · МАШИНА ПО ДЕНЬГАМ
        </div>
      )}

      {/* ─── Hint ─── */}
      {stats.flips===0 && phase==='decide' && (
        <div style={{
          position:'relative',zIndex:1,marginTop:12,
          fontSize:12,color:'rgba(255,255,255,0.25)',textAlign:'center',
          padding:'0 24px',lineHeight:1.5,
        }}>
          Нажми ФЛИПНУТЬ если монета вырастет,<br/>ПАСС — если упадёт
        </div>
      )}
    </div>
  )
}
