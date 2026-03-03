'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE  = API_BASE.replace('https://','wss://').replace('http://','ws://')

interface Agent { id:string; name:string; color:string; icon:string }
interface Msg   { id:string; role:'user'|'agent'|'chip'; agentId?:string; agentName?:string; content:string; streaming?:boolean; ts:number; files?:Att[] }
interface Att   { name:string; url:string; type:string; size:number; base64?:string }
interface Memory{ id:string; content:string; type:string; agent_id?:string; ts:number }

const AGENTS:Agent[] = [
  {id:'godlocal', name:'GodLocal',  color:'#00FF9D', icon:'⚡'},
  {id:'architect',name:'Architect', color:'#6C5CE7', icon:'🏛'},
  {id:'builder',  name:'Builder',   color:'#00B4D8', icon:'🔨'},
  {id:'grok',     name:'Grok',      color:'#FD79A8', icon:'🧠'},
  {id:'lucas',    name:'Lucas',     color:'#FDCB6E', icon:'💡'},
  {id:'harper',   name:'Harper',    color:'#E17055', icon:'🔬'},
  {id:'benjamin', name:'Benjamin',  color:'#55EFC4', icon:'📚'},
  {id:'strategist',name:'Strategist',color:'#FF6B6B', icon:'♟'},
]

const QUICK = [
  'Что с Bitcoin сейчас?',
  'Стратегия запуска продукта',
  'Последние AI новости 2026',
  'Что такое GodLocal?',
]

const h2r=(h:string,a:number)=>{const n=parseInt(h.replace('#',''),16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}


const TOOL_L:Record<string,string> = {
  web_search:'🌐 поиск', fetch_url:'📄 читаю', get_market_data:'📊 рынок',
  post_tweet:'𝕏 пост', send_telegram:'✈️ Telegram', create_github_issue:'🐙 issue',
  remember:'🧠 запоминаю', recall:'🧠 вспоминаю',
}

const SVC = [
  {id:'twitter',  name:'X / Twitter', icon:'𝕏',  color:'#1DA1F2', hint:'Developer Portal → Bearer token', ph:'AAAA...'},
  {id:'telegram', name:'Telegram',    icon:'✈️', color:'#0088cc', hint:'Токен → @BotFather',              ph:'123456:ABC...'},
  {id:'gmail',    name:'Gmail',       icon:'✉️', color:'#EA4335', hint:'Google → Security → App passwords',ph:'xxxx xxxx xxxx xxxx'},
  {id:'github',   name:'GitHub',      icon:'🐙', color:'#a78bfa', hint:'github.com/settings/tokens',       ph:'ghp_...'},
]

const TASKS = [
  {id:'tweet',    icon:'𝕏', label:'Твит',        svc:'twitter',  prompt:'Опубликуй твит: '},
  {id:'tg',       icon:'✈️',label:'Telegram',     svc:'telegram', prompt:'Отправь в Telegram: '},
  {id:'issue',    icon:'🐙',label:'GitHub Issue',  svc:'github',   prompt:'Создай GitHub issue: '},
  {id:'code',     icon:'💻',label:'Код',           svc:null,       prompt:'Напиши код: '},
  {id:'search',   icon:'🌐',label:'Поиск',         svc:null,       prompt:'Найди: '},
  {id:'market',   icon:'📊',label:'Рынок',         svc:null,       prompt:'Данные рынка: '},
  {id:'remember', icon:'🧠',label:'Запомни',       svc:null,       prompt:'Запомни: '},
  {id:'recall',   icon:'🔍',label:'Вспомни',       svc:null,       prompt:'Что знаешь о '},
]

const rnd=()=>Math.random().toString(36).slice(2,10)
const SPRING={type:'spring',damping:34,stiffness:340} as const

function MD({t,cur}:{t:string;cur?:boolean}) {
  type Seg = {k:'code';lang:string;b:string}|{k:'txt';b:string}
  const segs:Seg[]=[],re=/```([\w]*)\n?([\s\S]*?)```/g;let last=0,m:RegExpExecArray|null
  while((m=re.exec(t))){if(m.index>last)segs.push({k:'txt',b:t.slice(last,m.index)});segs.push({k:'code',lang:m[1]||'',b:m[2]});last=m.index+m[0].length}
  if(last<t.length)segs.push({k:'txt',b:t.slice(last)})
  function inl(s:string):React.ReactNode[]{
    const out:React.ReactNode[]=[],ki={n:0};let r=s
    while(r.length){
      let x=r.match(/^(.*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)(.*)$/)
      if(x){if(x[1])out.push(<span key={ki.n++}>{x[1]}</span>);out.push(<a key={ki.n++} href={x[3]} target="_blank" rel="noopener noreferrer" style={{color:'#00FF9D',textDecoration:'underline',wordBreak:'break-all'}}>{x[2]} ↗</a>);r=x[4];continue}
      x=r.match(/^(.*?)\*\*(.*?)\*\*(.*)$/)
      if(x){if(x[1])out.push(<span key={ki.n++}>{x[1]}</span>);out.push(<strong key={ki.n++} style={{color:'#e5e7eb',fontWeight:600}}>{x[2]}</strong>);r=x[3];continue}
      x=r.match(/^(.*?)`([^`]+)`(.*)$/)
      if(x){if(x[1])out.push(<span key={ki.n++}>{x[1]}</span>);out.push(<code key={ki.n++} style={{background:'#0f1a1a',color:'#00FF9D',padding:'1px 5px',borderRadius:4,fontSize:'0.8em',fontFamily:'monospace'}}>{x[2]}</code>);r=x[3];continue}
      x=r.match(/^(.*?)(https?:\/\/[^\s<>]+)(.*)$/)
      if(x){if(x[1])out.push(<span key={ki.n++}>{x[1]}</span>);out.push(<a key={ki.n++} href={x[2]} target="_blank" rel="noopener noreferrer" style={{color:'#00FF9D',textDecoration:'underline',wordBreak:'break-all'}}>{x[2].replace(/^https?:\/\//,'').slice(0,40)} ↗</a>);r=x[3];continue}
      out.push(<span key={ki.n++}>{r}</span>);break
    }
    return out
  }
  function blk(body:string,si:number){
    const lines=body.split('\n'),out:React.ReactNode[]=[]; let i=0
    while(i<lines.length){
      const ln=lines[i]
      if(ln.trim().startsWith('|')){
        const rows:string[]=[]; while(i<lines.length&&lines[i].trim().startsWith('|')){rows.push(lines[i]);i++}
        const fil=rows.filter(r=>!/^\s*\|[-\s:|]+\|\s*$/.test(r))
        const hdr=fil[0]?.split('|').slice(1,-1).map(c=>c.trim())??[]
        out.push(<div key={`t${si}_${i}`} style={{overflowX:'auto',margin:'6px 0',borderRadius:8,border:'1px solid #1a2535'}}><table style={{fontSize:11,width:'100%',borderCollapse:'collapse'}}><thead><tr>{hdr.map((h,hi)=><th key={hi} style={{borderBottom:'1px solid #1a2535',padding:'4px 8px',textAlign:'left',color:'#00FF9D',background:'#0a1220'}}>{h}</th>)}</tr></thead><tbody>{fil.slice(1).map((row,ri)=>{const cs=row.split('|').slice(1,-1).map(c=>c.trim());return<tr key={ri} style={{background:ri%2?'#06090f':'#060b10'}}>{cs.map((c,ci)=><td key={ci} style={{borderTop:'1px solid #0f1820',padding:'4px 8px',color:'#9ca3af'}}>{c}</td>)}</tr>})}</tbody></table></div>);continue
      }
      if(!ln&&i<lines.length-1){out.push(<br key={`br${si}_${i}`}/>);i++;continue}
      if(ln.startsWith('### ')){out.push(<p key={`h3${si}_${i}`} style={{fontWeight:600,color:'#e5e7eb',margin:'6px 0 2px',fontSize:13}}>{inl(ln.slice(4))}</p>);i++;continue}
      if(ln.startsWith('## ')){out.push(<p key={`h2${si}_${i}`} style={{fontWeight:700,color:'#e5e7eb',margin:'8px 0 2px'}}>{inl(ln.slice(3))}</p>);i++;continue}
      if(ln.match(/^[-•] /)){out.push(<div key={`li${si}_${i}`} style={{display:'flex',gap:8,margin:'2px 0',alignItems:'flex-start'}}><span style={{color:'#4b5563',fontSize:10,marginTop:3,flexShrink:0}}>◉</span><span>{inl(ln.replace(/^[-•] /,''))}</span></div>);i++;continue}
      const nm=ln.match(/^(\d+)\. (.*)$/)
      if(nm){out.push(<div key={`ol${si}_${i}`} style={{display:'flex',gap:8,margin:'2px 0'}}><span style={{color:'#6b7280',fontSize:11,minWidth:14,textAlign:'right',flexShrink:0}}>{nm[1]}.</span><span>{inl(nm[2])}</span></div>);i++;continue}
      out.push(<span key={`sp${si}_${i}`}>{inl(ln)}</span>)
      if(i<lines.length-1)out.push(<br key={`spbr${si}_${i}`}/>)
      i++
    }
    return out
  }
  return <span>
    {segs.map((s,si)=>s.k==='code'
      ?<div key={si} style={{margin:'8px 0',borderRadius:8,overflow:'hidden',border:'1px solid #1a2535'}}>
         {s.lang&&<div style={{padding:'4px 10px',background:'#0a1220',color:'#6b7280',fontSize:10,fontFamily:'monospace',borderBottom:'1px solid #1a2535'}}>{s.lang}</div>}
         <pre style={{overflowX:'auto',padding:'10px 12px',background:'#060b10',color:'#00FF9D',fontSize:11,fontFamily:'monospace',margin:0,whiteSpace:'pre'}}>{s.b.trimEnd()}</pre>
       </div>
      :<span key={si}>{blk(s.b,si)}</span>
    )}
    {cur&&<span style={{display:'inline-block',width:6,height:14,background:'currentColor',marginLeft:3,borderRadius:2,opacity:.7,verticalAlign:'middle',animation:'gl-blink 1s step-end infinite'}}/>}
  </span>
}

function SvcCard({s}:{s:typeof SVC[0]}) {
  const [on,setOn]=useState(()=>typeof window!=='undefined'?!!localStorage.getItem(`gl_${s.id}`):false)
  const [edit,setEdit]=useState(false)
  const [val,setVal]=useState('')
  const save=()=>{if(!val.trim())return;localStorage.setItem(`gl_${s.id}`,val.trim());setOn(true);setEdit(false);setVal('')}
  const del=()=>{localStorage.removeItem(`gl_${s.id}`);setOn(false);setEdit(false)}
  return(
    <div style={{borderRadius:16,border:`1px solid ${on?s.color+'30':'#111827'}`,background:'#07090f',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px'}}>
        <div style={{width:38,height:38,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,background:s.color+'15',border:`1px solid ${s.color}25`}}>{s.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:'#e5e7eb'}}>{s.name}</div>
          <div style={{fontSize:12,marginTop:2,color:on?s.color:'#4b5563'}}>{on?'◉ подключён':'○ не подключён'}</div>
        </div>
        <button onClick={()=>on?del():setEdit(e=>!e)} style={{padding:'6px 14px',borderRadius:12,fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0,...(on?{background:'#1a0505',color:'#ef4444',border:'1px solid #ef444425'}:{background:s.color+'18',color:s.color,border:`1px solid ${s.color}35`})}}>
          {on?'Убрать':edit?'Отмена':'Подключить'}
        </button>
      </div>
      {edit&&!on&&(
        <div style={{padding:'0 14px 12px',display:'flex',flexDirection:'column',gap:6}}>
          <div style={{fontSize:11,color:'#4b5563'}}>{s.hint}</div>
          <div style={{display:'flex',gap:8}}>
            <input value={val} onChange={e=>setVal(e.target.value)} placeholder={s.ph} autoComplete="off" style={{flex:1,background:'#0d1520',border:'1px solid #1a2535',borderRadius:10,padding:'8px 12px',fontSize:16,color:'#e5e7eb',outline:'none'}}/>
            <button onClick={save} style={{padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:700,background:s.color,color:'#000',border:'none',cursor:'pointer'}}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OasisPage() {
  const [msgs,setMsgs]       = useState<Msg[]>([])
  const [input,setInput]     = useState('')
  const [agent,setAgent]     = useState<Agent>(AGENTS[0])
  const [conn,setConn]       = useState(false)
  const [conning,setConning] = useState(false)
  const [waiting,setWaiting] = useState(false)
  const [councilLoad,setCLoad] = useState(false)
  const [archs,setArchs]     = useState<string[]>([])
  const [lang,setLang]       = useState<'ru'|'uk'|'en'>(()=>{
    if(typeof window==='undefined')return 'ru'
    return(localStorage.getItem('gl_lang') as any)||'ru'
  })
  const [panel,setPanel]     = useState<null|'agents'|'skills'|'services'|'memory'|'gallery'>(null)
  const [memory,setMemory]   = useState<Memory[]>([])
  const [arts,setArts]       = useState<{id:string;name?:string;content:string;ts:number}[]>(()=>{
    try{return JSON.parse(localStorage.getItem('gl_art')||'[]')}catch{return[]}
  })
  const [atts,setAtts]       = useState<Att[]>([])
  const [listening,setListen]= useState(false)
  const [vvh,setVvh]         = useState<number|null>(null)
  const [xp,setXp]           = useState<Record<string,number>>(()=>Object.fromEntries(AGENTS.map(a=>[a.id,0])))
  const [fb,setFb]           = useState<Record<string,string>>(()=>{try{return JSON.parse(localStorage.getItem('gl_fb')||'{}')}catch{return{}}})
  const [sid]                = useState(()=>rnd()+rnd())

  const wsRef  = useRef<WebSocket|null>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const scRef  = useRef<HTMLDivElement>(null)
  const atBot  = useRef(true)
  const inRef  = useRef<HTMLTextAreaElement>(null)
  const fRef   = useRef<HTMLInputElement>(null)
  const recRef = useRef<any>(null)
  const rtRef  = useRef<any>(null)
  const hmRef  = useRef<(d:any)=>void>(()=>{})

  const tap=(ms=10)=>{try{navigator.vibrate?.(ms)}catch{}}

  const handleMsg=useCallback((d:any)=>{
    const t=d.t||d.type
    if(t==='pong')return
    if(t==='token'){
      setWaiting(false)
      setMsgs(p=>{
        const l=p[p.length-1]
        if(l?.streaming&&l.agentId==='godlocal')return[...p.slice(0,-1),{...l,content:l.content+(d.v||'')}]
        return[...p,{id:rnd(),role:'agent',agentId:'godlocal',agentName:'GodLocal',content:d.v||'',streaming:true,ts:Date.now()}]
      });return
    }
    if(t==='arch_start'){setArchs(p=>Array.from(new Set([...p,d.agent||''])).filter(Boolean));return}
    if(t==='arch_reply'||t==='agent_reply'){
      const aid=(d.agent||'godlocal').toLowerCase()
      const ag=AGENTS.find(a=>a.id===aid)||AGENTS[0]
      setArchs(p=>p.filter(a=>a!==aid))
      const v=(d.v||d.reply||'').trim()
      if(v&&v.toUpperCase()!=='SKIP'&&v.length>=5)
        setMsgs(p=>[...p,{id:rnd(),role:'agent',agentId:aid,agentName:ag.name,content:v,ts:Date.now()}])
      setXp(p=>({...p,[aid]:(p[aid]||0)+1}));return
    }
    if(t==='synthesis'){
      const v=(d.v||'').trim()
      if(v)setMsgs(p=>[...p,{id:rnd(),role:'agent',agentId:'synth',agentName:'🔮 Синтез',content:v,ts:Date.now()}]);return
    }
    if(t==='done'||t==='session_done'){
      setWaiting(false);setArchs([])
      setMsgs(p=>p.map(m=>({...m,streaming:false})));return
    }
    if(t==='tool'){
      const lbl=TOOL_L[d.n]||`🔧 ${d.n}`
      const q=d.q?`: ${String(d.q).slice(0,55)}`:''
      setMsgs(p=>[...p,{id:rnd(),role:'chip',content:lbl+q,ts:Date.now()}]);return
    }
    if(t==='error'){
      setWaiting(false);setArchs([])
      setMsgs(p=>[...p,{id:rnd(),role:'chip',content:`❌ ${d.v||'ошибка'}`,ts:Date.now()}])
    }
  },[])
  useEffect(()=>{hmRef.current=handleMsg},[handleMsg])

  const connectWS=useCallback(()=>{
    if(wsRef.current?.readyState===WebSocket.OPEN)return
    setConning(true)
    const ws=new WebSocket(`${WS_BASE}/ws/oasis?sid=${sid}`)
    wsRef.current=ws
    ws.onopen=()=>{
      setConn(true);setConning(false)
      const pi=setInterval(()=>ws.readyState===WebSocket.OPEN?ws.send(JSON.stringify({t:'ping'})):clearInterval(pi),10000)
    }
    ws.onclose=()=>{setConn(false);setConning(false);if(rtRef.current)clearTimeout(rtRef.current);rtRef.current=setTimeout(()=>connectWS(),4000)}
    ws.onerror=()=>{setConn(false);setConning(false)}
    ws.onmessage=e=>{try{hmRef.current(JSON.parse(e.data))}catch{}}
  },[sid])
  useEffect(()=>{connectWS();return()=>{wsRef.current?.close();if(rtRef.current)clearTimeout(rtRef.current)}},[connectWS])

  useEffect(()=>{
    const vv=(window as any).visualViewport
    if(!vv)return
    const fn=()=>setVvh(vv.height)
    vv.addEventListener('resize',fn);vv.addEventListener('scroll',fn);fn()
    return()=>{vv.removeEventListener('resize',fn);vv.removeEventListener('scroll',fn)}
  },[])

  useEffect(()=>{if(atBot.current)botRef.current?.scrollIntoView({behavior:'smooth'})},[msgs,archs,waiting])

  const send=useCallback(()=>{
    const text=input.trim()
    if(!text&&!atts.length)return
    tap(8)
    setMsgs(p=>[...p,{id:rnd(),role:'user',content:text,ts:Date.now(),files:atts.length?[...atts]:undefined}])
    setInput('');setAtts([])
    if(inRef.current){inRef.current.style.height='auto';inRef.current.blur()}
    const svcs:Record<string,string>={}
    if(typeof window!=='undefined')['twitter','telegram','gmail','github'].forEach(k=>{const v=localStorage.getItem(`gl_${k}`);if(v)svcs[k]=v})
    const payload:any={prompt:text,session_id:sid,agent:agent.id,lang,...(Object.keys(svcs).length?{service_tokens:svcs}:{})}
    if(atts.length){const img=atts.find(a=>a.type.startsWith('image/')&&a.base64);if(img)payload.image_base64=img.base64}
    setWaiting(true);setArchs([])
    const safe=setTimeout(()=>{setWaiting(false);setArchs([])},65000)
    const go=()=>{wsRef.current!.send(JSON.stringify(payload));clearTimeout(safe)}
    if(wsRef.current?.readyState===WebSocket.OPEN){go();return}
    connectWS();let tries=0
    const iv=setInterval(()=>{
      tries++
      if(wsRef.current?.readyState===WebSocket.OPEN){clearInterval(iv);go()}
      else if(tries>20){clearInterval(iv);clearTimeout(safe);setWaiting(false)}
      else connectWS()
    },3000)
    setXp(p=>({...p,[agent.id]:(p[agent.id]||0)+1}))
  },[input,atts,agent,sid,connectWS,lang])

  const onKey=(e:React.KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}

  const voice=()=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if(!SR)return
    if(listening){recRef.current?.stop();setListen(false);return}
    const r=new SR();r.lang='ru-RU';r.continuous=false;r.interimResults=false
    r.onresult=(e:any)=>{setInput(p=>p?p+' '+e.results[0][0].transcript:e.results[0][0].transcript);setListen(false)}
    r.onerror=()=>setListen(false);r.onend=()=>setListen(false)
    recRef.current=r;r.start();setListen(true);tap(15)
  }

  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    Array.from(e.target.files||[]).forEach(f=>{
      const url=URL.createObjectURL(f)
      if(f.type.startsWith('image/')){
        const rd=new FileReader();rd.onload=()=>{
          const img=new Image();img.onload=()=>{
            const MAX=512,sc=Math.min(1,MAX/Math.max(img.width,img.height))
            const cv=document.createElement('canvas');cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc)
            cv.getContext('2d')!.drawImage(img,0,0,cv.width,cv.height)
            setAtts(p=>[...p,{name:f.name,url,type:f.type,size:f.size,base64:cv.toDataURL('image/jpeg',.75)}])
          };img.src=rd.result as string
        };rd.readAsDataURL(f)
      }else setAtts(p=>[...p,{name:f.name,url,type:f.type,size:f.size}])
    });e.target.value=''
  }

  const resize=(el:HTMLTextAreaElement)=>{el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px'}
  const cycLang=()=>{setLang(l=>{const n=l==='ru'?'uk':l==='uk'?'en':'ru';localStorage.setItem('gl_lang',n);return n});tap(6)}
  const openPanel=(p:typeof panel)=>{tap(6);setPanel(prev=>prev===p?null:p);if(p==='memory')fetchMem()}
  const fetchMem=async()=>{try{const r=await fetch(`${API_BASE}/memory?session_id=${sid}`);if(r.ok){const d=await r.json();const raw=Array.isArray(d)?d:(d.memories||[]);setMemory(raw.map((m:any)=>typeof m==='string'?{id:Math.random().toString(36).slice(2),content:m,type:'fact',ts:Date.now()}:m))}}catch{}}
  const delMem=async(id:string)=>{try{await fetch(`${API_BASE}/memory/${sid}/${id}`,{method:'DELETE'});setMemory(p=>p.filter(m=>m.id!==id))}catch{}}
  const saveFb=(id:string,v:string)=>setFb(p=>{const n={...p};if(p[id]===v)delete n[id];else n[id]=v;try{localStorage.setItem('gl_fb',JSON.stringify(n))}catch{};return n})

  const sendCouncil=useCallback(async()=>{
    const msg=input.trim()||'Дай стратегический совет на основе нашего разговора'
    tap()
    if(input.trim()){setMsgs(p=>[...p,{id:rnd(),role:'user',content:input.trim(),ts:Date.now()}]);setInput('')}
    setCLoad(true)
    try{
      const r=await fetch(`${API_BASE}/v2/council`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({user_id:sid,message:msg})
      })
      if(!r.ok)throw new Error('council fail')
      const d=await r.json()
      const council=d.council||{}
      const ORDER=['Architect','Builder','Strategist']
      for(const name of ORDER){
        const reply=(council[name]||''). trim()
        if(!reply)continue
        const aid=name.toLowerCase()
        const ag=AGENTS.find(a=>a.id===aid)||{id:aid,name,color:'#6C5CE7',icon:'♟'}
        setMsgs(p=>[...p,{id:rnd(),role:'agent',agentId:ag.id,agentName:ag.name,content:reply,ts:Date.now()}])
      }
    }catch(e){
      setMsgs(p=>[...p,{id:rnd(),role:'agent',agentId:'godlocal',agentName:'GodLocal',content:'Совет временно недоступен — попробуй снова.',ts:Date.now()}])
    }finally{setCLoad(false)}
  },[input,sid])

  const saveArt=(msg:Msg)=>setArts(p=>{const n=p.some(a=>a.id===msg.id)?p.filter(a=>a.id!==msg.id):[{id:msg.id,name:msg.agentName,content:msg.content,ts:msg.ts},...p].slice(0,50);try{localStorage.setItem('gl_art',JSON.stringify(n))}catch{};return n})

  const ph=lang==='uk'?`Запитай ${agent.name}…`:lang==='en'?`Ask ${agent.name}…`:`Спроси ${agent.name}…`

  return(
    <div style={{display:'flex',flexDirection:'column',overflow:'hidden',color:'#d1d5db',
      height:vvh?`${vvh}px`:'100dvh',
      fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
      WebkitTapHighlightColor:'transparent'}}>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes gl-dp{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes gl-blink{0%,100%{opacity:0}50%{opacity:.7}}
        @keyframes gl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes gl-pulse{0%,100%{opacity:.7}50%{opacity:1}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
        .gl-dp>span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#00FF9D;animation:gl-dp 1.2s ease-in-out infinite}
        .gl-dp>span:nth-child(2){animation-delay:.2s}
        .gl-dp>span:nth-child(3){animation-delay:.4s}
      `}}/>

      <div style={{position:'fixed',inset:0,backgroundImage:'url(/oasis-bg.jpg)',backgroundSize:'cover',backgroundPosition:'center top',filter:'saturate(1.5) brightness(1.1)',zIndex:-2,pointerEvents:'none'}}/>
      <div style={{position:'fixed',inset:0,background:'rgba(3,5,8,.62)',zIndex:-1,pointerEvents:'none'}}/>

      {/* HEADER */}
      <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:`max(env(safe-area-inset-top),12px) 16px 10px`,
        background:'rgba(3,5,8,.84)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
        borderBottom:'1px solid #0d131e'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <a href="/" style={{color:'#4b5563',padding:4,display:'flex',textDecoration:'none'}} onClick={()=>tap()}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </a>
          <svg width="62" height="20" viewBox="0 0 62 20" fill="none">
            <defs><linearGradient id="oglg" x1="0" y1="0" x2="62" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#00FF9D"/><stop offset="60%" stopColor="#00C8FF"/><stop offset="100%" stopColor="#6C5CE7"/></linearGradient></defs>
            <text x="0" y="16" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif" fontSize="16" fontWeight="800" letterSpacing="3" fill="url(#oglg)">OASIS</text>
          </svg>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,transition:'background .3s',
            background:conn?'#00FF9D':conning?'#F59E0B':'#EF4444',
            boxShadow:conn?'0 0 6px #00FF9D88':conning?'0 0 6px #F59E0B88':'none'}}/>
          <button onClick={cycLang} style={{fontSize:12,padding:'4px 8px',borderRadius:20,border:'1px solid #1a2535',color:'#9ca3af',background:'transparent',cursor:'pointer'}}>
            {lang==='ru'?'🇷🇺':lang==='uk'?'🇺🇦':'🇬🇧'}
          </button>
          <button onClick={()=>openPanel(panel==='agents'?null:'agents')} style={{
            display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:12,cursor:'pointer',
            border:`1px solid ${panel==='agents'?h2r(agent.color,.5):h2r(agent.color,.27)}`,
            background:panel==='agents'?h2r(agent.color,.13):h2r(agent.color,.07),color:agent.color,transition:'all .15s'}}>
            <span style={{fontSize:15,lineHeight:1}}>{agent.icon}</span>
            <span style={{fontSize:12,fontWeight:600,maxWidth:60,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{agent.name}</span>
            <svg style={{width:10,height:10,flexShrink:0,opacity:.5,transform:panel==='agents'?'rotate(180deg)':'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {panel==='agents'&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.15}}
            style={{flexShrink:0,overflow:'hidden',borderBottom:'1px solid #0d131e',background:'#030508'}}>
            <div style={{display:'flex',gap:8,overflowX:'auto',padding:'10px 12px'}}>
              {AGENTS.map(a=>{
                const on=agent.id===a.id
                return(
                  <button key={a.id} onClick={()=>{setAgent(a);setPanel(null);tap()}}
                    style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 12px',minWidth:58,
                      borderRadius:14,cursor:'pointer',
                      border:`1px solid ${on?h2r(a.color,.33):'#111827'}`,background:on?h2r(a.color,.083):'transparent'}}>
                    <span style={{fontSize:20}}>{a.icon}</span>
                    <span style={{fontSize:11,fontWeight:600,marginTop:2,color:on?a.color:'#9ca3af'}}>{a.name}</span>
                    <span style={{fontSize:9,color:'#374151',marginTop:1}}>{xp[a.id]||0} xp</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scRef} style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch' as any,overscrollBehavior:'contain',WebkitTransform:'translateZ(0)' as any}}
        onScroll={e=>{const el=e.currentTarget;atBot.current=el.scrollHeight-el.scrollTop-el.clientHeight<80}}>
        <div style={{padding:'12px 16px 4px'}}>

          {msgs.length===0&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'52vh',gap:20,padding:'24px 0'}}>
              <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
                <defs>
                  <radialGradient id="ogrg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#00FF9D" stopOpacity=".18"/><stop offset="100%" stopColor="#6C5CE7" stopOpacity="0"/></radialGradient>
                  <linearGradient id="oglg2" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#00FF9D"/><stop offset="50%" stopColor="#00C8FF"/><stop offset="100%" stopColor="#6C5CE7"/></linearGradient>
                </defs>
                <circle cx="40" cy="40" r="38" fill="url(#ogrg)"/>
                <circle cx="40" cy="40" r="35" stroke="url(#oglg2)" strokeWidth="1.2" strokeOpacity=".45" strokeDasharray="4 3"/>
                <circle cx="40" cy="40" r="26" stroke="url(#oglg2)" strokeWidth="1" strokeOpacity=".3"/>
                <path d="M18 48 Q30 42 40 48 Q50 54 62 48" stroke="url(#oglg2)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <circle cx="40" cy="36" r="8" fill="url(#oglg2)" opacity=".9"/>
              </svg>
              <div style={{fontSize:13,color:'#6b7280',textAlign:'center'}}>7 агентов · живой поиск · память</div>
              <div style={{width:'100%',maxWidth:300,display:'flex',flexDirection:'column',gap:7}}>
                {QUICK.map((q,i)=>(
                  <button key={i} onClick={()=>{setInput(q);tap();setTimeout(()=>inRef.current?.focus(),50)}}
                    style={{textAlign:'left',fontSize:13,padding:'10px 16px',background:'rgba(6,8,14,.85)',border:'1px solid #0f1820',borderRadius:16,color:'#6b7280',cursor:'pointer',width:'100%'}}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map(msg=>{
              if(msg.role==='chip')return(
                <motion.div key={msg.id} initial={{opacity:0}} animate={{opacity:1}} style={{display:'flex',justifyContent:'center',margin:'4px 0'}}>
                  <span style={{fontSize:11,color:'#6b7280',background:'#06080e',border:'1px solid #0f1820',borderRadius:20,padding:'3px 10px'}}>{msg.content}</span>
                </motion.div>
              )
              if(msg.role==='user')return(
                <motion.div key={msg.id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:.14}} style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
                  <div style={{maxWidth:'84%'}}>
                    {msg.files?.length&&(
                      <div style={{display:'flex',flexWrap:'wrap' as any,gap:6,marginBottom:6,justifyContent:'flex-end'}}>
                        {msg.files.map((f,fi)=>f.type.startsWith('image/')?<img key={fi} src={f.url} alt={f.name} style={{width:60,height:60,objectFit:'cover' as any,borderRadius:10,border:'1px solid #1a2535'}}/>:<div key={fi} style={{display:'flex',alignItems:'center',gap:6,background:'#080d14',border:'1px solid #1a2535',borderRadius:10,padding:'5px 10px',fontSize:11,color:'#9ca3af'}}>📄 {f.name.slice(0,12)}</div>)}
                      </div>
                    )}
                    <div style={{background:'rgba(108,92,231,.18)',border:'1px solid rgba(108,92,231,.3)',borderRadius:'18px 18px 5px 18px',padding:'10px 14px',fontSize:14,lineHeight:1.55,color:'#e5e7eb',whiteSpace:'pre-wrap'}}>{msg.content}</div>
                  </div>
                </motion.div>
              )
              const isSynth=msg.agentId==='synth'
              if(!isSynth)return null
              const ag={id:'synth',name:'GodLocal',color:'#00FF9D',icon:'⚡'}
              return(
                <motion.div key={msg.id} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:.15}} style={{display:'flex',gap:10,marginBottom:14,alignItems:'flex-start'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,marginTop:2,
                    background:h2r(ag.color,.07),border:`1.5px solid ${h2r(ag.color,.22)}`,boxShadow:isSynth?`0 0 12px ${h2r(ag.color,.16)}`:'none'}}>{ag.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:3,paddingLeft:2}}>
                      <span style={{fontSize:12,fontWeight:700,color:ag.color}}>{msg.agentName}</span>
                      <span style={{fontSize:10,color:'#4b5563'}}>{new Date(msg.ts).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{borderRadius:'5px 18px 18px 18px',padding:'10px 14px',fontSize:14,lineHeight:1.6,color:'#d1d5db',wordBreak:'break-word' as any,
                      background:isSynth?`linear-gradient(135deg,${h2r(ag.color,.04)},#060b10)`:h2r(ag.color,.043),borderLeft:`2.5px solid ${h2r(ag.color,.31)}`}}>
                      <MD t={msg.content} cur={msg.streaming}/>
                    </div>
                    {!msg.streaming&&msg.content.length>5&&(
                      <div style={{display:'flex',alignItems:'center',gap:10,marginTop:5,paddingLeft:2}}>
                        {[['🎯','exact'],['🤔','partial'],['💀','miss']].map(([ico,val])=>(
                          <button key={val} onClick={()=>saveFb(msg.id,val)}
                            style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:0,
                              opacity:fb[msg.id]===val?1:.2,transform:fb[msg.id]===val?'scale(1.2)':'scale(1)',filter:fb[msg.id]===val?'none':'grayscale(1)'}}>{ico}</button>
                        ))}
                        <button onClick={()=>saveArt(msg)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',padding:0,color:arts.some(a=>a.id===msg.id)?'#FDCB6E':'#374151'}}>
                          {arts.some(a=>a.id===msg.id)?'★':'☆'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {waiting&&(
            <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'flex-start'}}>
              <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,marginTop:2,background:'#00FF9D12',border:'1.5px solid #00FF9D35'}}>⚡</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:'#00FF9D',marginBottom:3,paddingLeft:2}}>GodLocal</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#07090f',border:'1px solid #111827',borderRadius:'5px 18px 18px 18px',padding:'10px 14px'}}>
                  <span className="gl-dp"><span/><span/><span/></span>
                  <span style={{fontSize:12,color:'#6b7280'}}>{lang==='uk'?'думає…':lang==='en'?'thinking…':'думает…'}</span>
                </div>
              </div>
            </div>
          )}

          {archs.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,paddingLeft:42}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,padding:'3px 10px',borderRadius:20,border:'1px solid rgba(0,255,157,.2)',color:'#00FF9D',background:'rgba(0,255,157,.05)'}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#00FF9D',display:'inline-block',animation:'gl-pulse 1s infinite'}}/>
                GodLocal обрабатывает…
              </span>
            </div>
          )}
          <div ref={botRef} style={{height:4}}/>
        </div>
      </div>

      <AnimatePresence>
        {panel==='skills'&&(
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={SPRING}
            style={{flexShrink:0,background:'#060810',borderTop:'1px solid #0f1820',borderRadius:'16px 16px 0 0',overflow:'hidden',maxHeight:'68vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 12px',borderBottom:'1px solid #0f1820',flexShrink:0}}>
              <div><div style={{fontWeight:700,fontSize:14,color:'#00FF9D'}}>⚡ Навыки</div><div style={{fontSize:12,color:'#4b5563',marginTop:2}}>Нажми — задача попадёт в чат</div></div>
              <button onClick={()=>setPanel(null)} style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1820',border:'none',color:'#6b7280',cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {TASKS.map(t=>{
                const ok=!t.svc||(typeof window!=='undefined'&&!!localStorage.getItem(`gl_${t.svc}`))
                return(
                  <button key={t.id} onClick={()=>{setInput(t.prompt);setPanel(null);tap();setTimeout(()=>{inRef.current?.focus();const l=t.prompt.length;inRef.current?.setSelectionRange(l,l)},80)}}
                    style={{textAlign:'left',padding:'10px 12px',borderRadius:14,cursor:'pointer',background:ok?'#07090f':'#060810',border:`1px solid ${ok?'#111827':'#090910'}`,opacity:ok?1:.5}}>
                    <div style={{fontSize:16,marginBottom:4}}>{t.icon}</div>
                    <div style={{fontSize:12,fontWeight:600,color:'#d1d5db',lineHeight:1.2}}>{t.label}</div>
                    {!ok&&<div style={{fontSize:10,color:'#374151',marginTop:2}}>подключи сервис</div>}
                  </button>
                )
              })}
            </div>
            <div style={{height:'max(env(safe-area-inset-bottom),10px)',flexShrink:0}}/>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel==='services'&&(
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={SPRING}
            style={{flexShrink:0,background:'#060810',borderTop:'1px solid #0f1820',borderRadius:'16px 16px 0 0',overflow:'hidden',maxHeight:'72vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 12px',borderBottom:'1px solid #0f1820',flexShrink:0}}>
              <div><div style={{fontWeight:700,fontSize:14,color:'#5856D6'}}>🔗 Сервисы</div><div style={{fontSize:12,color:'#4b5563',marginTop:2}}>Агенты используют при ответе</div></div>
              <button onClick={()=>setPanel(null)} style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1820',border:'none',color:'#6b7280',cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
              {SVC.map(s=><SvcCard key={s.id} s={s}/>)}
            </div>
            <div style={{height:'max(env(safe-area-inset-bottom),10px)',flexShrink:0}}/>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel==='memory'&&(
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={SPRING}
            style={{flexShrink:0,background:'#060810',borderTop:'1px solid #0f1820',borderRadius:'16px 16px 0 0',overflow:'hidden',maxHeight:'62vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 12px',borderBottom:'1px solid #0f1820',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:700,fontSize:14,color:'#007AFF'}}>🧠 Память</span>
                {memory.length>0&&<span style={{fontSize:11,background:'#007AFF22',color:'#007AFF',borderRadius:6,padding:'1px 7px'}}>{memory.length}</span>}
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={fetchMem} title='Обновить' style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1820',border:'none',color:'#6b7280',cursor:'pointer',fontSize:14}}>↻</button>
                <button onClick={()=>setPanel(null)} style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1820',border:'none',color:'#6b7280',cursor:'pointer',fontSize:16}}>✕</button>
              </div>
            </div>
            <div style={{overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:6}}>
              {(()=>{const TC:Record<string,string>={fact:'#34C759',preference:'#5856D6',task:'#FF9F0A',event:'#007AFF'};const TL:Record<string,string>={fact:'факт',preference:'предп.',task:'задача',event:'событие'};return memory.length===0?(<p style={{fontSize:12,color:'#4b5563',fontStyle:'italic',margin:0}}>Память пуста — агенты запомнят важное автоматически</p>):(memory.map((m,i)=>(<div key={m.id||i} style={{background:'#07090f',border:'1px solid #111827',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'flex-start',gap:8}}><div style={{flex:1}}><div style={{display:'flex',gap:4,marginBottom:5,flexWrap:'wrap' as any}}><span style={{fontSize:10,background:TC[m.type]||'#374151',color:'white',borderRadius:4,padding:'1px 6px',fontWeight:600}}>{TL[m.type]||m.type}</span>{m.agent_id&&<span style={{fontSize:10,color:'#4b5563'}}>{m.agent_id}</span>}</div><p style={{fontSize:12,color:'#9ca3af',margin:0,lineHeight:'1.5'}}>{m.content}</p></div><button onClick={()=>delMem(m.id)} style={{flexShrink:0,width:20,height:20,borderRadius:4,background:'none',border:'1px solid #1f2937',color:'#4b5563',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>)))})()}
            </div>
            <div style={{height:'max(env(safe-area-inset-bottom),10px)',flexShrink:0}}/>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel==='gallery'&&(
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={SPRING}
            style={{flexShrink:0,background:'#060810',borderTop:'1px solid #0f1820',borderRadius:'16px 16px 0 0',overflow:'hidden',maxHeight:'60vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 12px',borderBottom:'1px solid #0f1820',flexShrink:0}}>
              <span style={{fontWeight:700,fontSize:14,color:'#FF9F0A'}}>★ Галерея</span>
              <button onClick={()=>setPanel(null)} style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f1820',border:'none',color:'#6b7280',cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
              {arts.length===0?<p style={{fontSize:12,color:'#4b5563',fontStyle:'italic',margin:0}}>Нет сохранённых ответов</p>
                :arts.map(a=>(
                  <div key={a.id} style={{background:'#07090f',border:'1px solid #111827',borderRadius:12,padding:'10px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'#FDCB6E',fontWeight:600}}>{a.name||'GodLocal'}</span>
                      <button onClick={()=>setArts(p=>{const n=p.filter(x=>x.id!==a.id);try{localStorage.setItem('gl_art',JSON.stringify(n))}catch{};return n})} style={{fontSize:12,color:'#374151',background:'none',border:'none',cursor:'pointer'}}>✕</button>
                    </div>
                    <p style={{fontSize:12,color:'#9ca3af',margin:0,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>{a.content.slice(0,220)}{a.content.length>220?'…':''}</p>
                  </div>
                ))}
            </div>
            <div style={{height:'max(env(safe-area-inset-bottom),10px)',flexShrink:0}}/>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {atts.length>0&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            style={{flexShrink:0,display:'flex',gap:8,overflowX:'auto',padding:'8px 16px',background:'rgba(3,5,8,.9)',borderTop:'1px solid #0d131e'}}>
            {atts.map((f,fi)=>(
              <div key={fi} style={{position:'relative',flexShrink:0}}>
                {f.type.startsWith('image/')?<img src={f.url} alt={f.name} style={{width:52,height:52,objectFit:'cover' as any,borderRadius:10,border:'1px solid #1a2535'}}/>
                  :<div style={{width:52,height:52,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#080d14',border:'1px solid #1a2535',borderRadius:10}}><span style={{fontSize:18}}>📄</span><span style={{fontSize:8,color:'#6b7280'}}>{f.name.slice(0,8)}</span></div>}
                <button onClick={()=>setAtts(p=>p.filter((_,i)=>i!==fi))} style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:'#EF4444',border:'none',color:'white',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>×</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT BAR */}
      <div style={{flexShrink:0,padding:`8px 12px max(env(safe-area-inset-bottom),12px)`,
        background:'rgba(3,5,8,.88)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'}}>
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8}}>
          {([{id:'skills' as const,label:'⚡ Навыки',col:'#34C759'},{id:'services' as const,label:'🔗 Сервисы',col:'#5856D6'},{id:'memory' as const,label:`🧠 Память${memory.length>0?' ('+memory.length+')':''}`,col:'#007AFF'},{id:'gallery' as const,label:'★ Галерея',col:'#FF9F0A'}]).map(b=>(
            <button key={b.id} onClick={()=>openPanel(b.id)} style={{flexShrink:0,display:'flex',alignItems:'center',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',
              ...(panel===b.id?{background:b.col,color:'#000',fontWeight:700,border:'none'}:{background:'rgba(255,255,255,.05)',color:'rgba(255,255,255,.35)',border:'1px solid rgba(255,255,255,.07)'})}}>
              {b.label}
            </button>
          ))}
          <button onClick={sendCouncil} disabled={councilLoad} style={{flexShrink:0,display:'flex',alignItems:'center',gap:5,padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:councilLoad?'wait':'pointer',whiteSpace:'nowrap',transition:'all .15s',
            ...(councilLoad?{background:'rgba(255,107,107,.18)',color:'#FF6B6B',border:'1px solid rgba(255,107,107,.35)'}:{background:'rgba(255,107,107,.08)',color:'rgba(255,107,107,.6)',border:'1px solid rgba(255,107,107,.18)'})}}>
            {councilLoad?<span style={{display:'inline-block',animation:'gl-spin .8s linear infinite',fontSize:11}}>&#8635;</span>:'🔮'}
            <span>{councilLoad?'Совет…':'Совет'}</span>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#06080d',border:'1px solid #111827',borderRadius:22,padding:'6px 8px 6px 12px'}}>
          <button onClick={()=>fRef.current?.click()} style={{flexShrink:0,color:'#6b7280',padding:4,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input ref={fRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.csv" style={{display:'none'}} onChange={onFile}/>
          <textarea ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} onInput={e=>resize(e.currentTarget)}
            placeholder={ph} rows={1}
            style={{flex:1,background:'transparent',resize:'none' as any,outline:'none',color:'#e5e7eb',fontSize:16,lineHeight:1.5,padding:'3px 0',border:'none',minWidth:0,maxHeight:120,overflowY:'auto' as any,fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif'}}/>
          {(input.trim()||atts.length>0)
            ?<button onClick={send} style={{flexShrink:0,width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#007AFF',border:'none',cursor:'pointer',boxShadow:'0 2px 12px rgba(0,122,255,.45)'}}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
             </button>
            :<button onClick={voice} style={{flexShrink:0,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,background:'none',border:'none',cursor:'pointer'}}>
               {listening&&<div style={{position:'absolute',inset:0,borderRadius:'50%',background:'conic-gradient(#007AFF,#5856D6,#FF2D55,#FF9F0A,#34C759,#007AFF)',animation:'gl-spin 2.5s linear infinite',filter:'blur(.5px)'}}/>}
               <div style={{position:'relative',zIndex:1,width:listening?26:30,height:listening?26:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                 background:listening?'rgba(0,0,0,.4)':'rgba(255,255,255,.07)',border:listening?'none':'1px solid rgba(255,255,255,.12)'}}>
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={listening?'white':'#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                   <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                   <line x1="12" y1="19" x2="12" y2="23"/>
                   <line x1="8" y1="23" x2="16" y2="23"/>
                 </svg>
               </div>
             </button>
          }
        </div>
      </div>
    </div>
  )
}
