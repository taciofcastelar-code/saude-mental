import {CONFIG} from './config.js';

function requestId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
async function post(action,payload={}){
  if(!CONFIG.API_URL)throw new Error('API_URL não configurada.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(CONFIG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload,requestId:requestId()}),signal:controller.signal});
    if(!r.ok)throw new Error(`Falha HTTP ${r.status}`);
    const d=await r.json();
    if(!d.ok)throw new Error(d.error||'Erro na API');
    return d;
  }catch(e){if(e.name==='AbortError')throw new Error('Tempo limite de comunicação excedido.');throw e}
  finally{clearTimeout(timeout)}
}
export const obterDashboard=()=>post('dashboard',{});
export const salvarAuditoria=payload=>post('salvarAuditoria',payload);
export const salvarTreinamento=payload=>post('salvarTreinamento',payload);
