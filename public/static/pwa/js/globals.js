// SMERTCH Globals - State variables and configuration

// Strip raw tool-call artifacts from agent output before rendering
function stripFuncTags(txt) {
  if(!txt) return '';
  // Remove <function=name>{...}</function> blocks (multi-line)
  txt = txt.replace(/<function=[^>]*>[\\s\\S]*?<\\/function>/gi, '');
  // Remove leftover <function=...> open tags (unclosed)
  txt = txt.replace(/<function=[^>]*>/gi, '');
  // Remove </function> close tags
  txt = txt.replace(/<\\/function>/gi, '');
  // Trim leading/trailing whitespace after removal
  return txt.trim();
}

const DEX = 'https://api.dexscreener.com';
const PUMP = '/api/pump';
const SOL_RPC = 'https://api.mainnet-beta.solana.com';
let killed=false, scanCache=[], pumpCache=[], pushed=new Set(JSON.parse(localStorage.getItem('gl_pushed')||'[]'));
let portfolio=JSON.parse(localStorage.getItem('gl_portfolio')||'[]');
let tgPushTimer=null;
let flt={mcap:0, liq:0, age:0, sig:'all'};
