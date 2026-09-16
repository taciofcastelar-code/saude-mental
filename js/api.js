import {CONFIG} from './config.js';
import {demoDb, safeQueue} from './storage.js';

function requestId(){
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function post(action, payload, id=requestId()){
  if(CONFIG.MOCK_MODE){
    const map={salvarAtendimento:'atendimentos',salvarAuditoria:'auditorias',salvarTreinamento:'treinamentos'};
    if(map[action]) return {ok:true, requestId:id, data:demoDb.push(map[action], {...payload,id,createdAt:new Date().toISOString()})};
    if(action==='dashboard') return {ok:true,data:mockDash()};
  }
  if(!CONFIG.API_URL) throw new Error('API_URL não configurada.');
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 15000);
  try{
    const r=await fetch(CONFIG.API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,payload,requestId:id}),
      signal:controller.signal
    });
    if(!r.ok) throw new Error(`Falha HTTP ${r.status}`);
    const d=await r.json();
    if(!d.ok) throw new Error(d.error||'Erro na API');
    return d;
  }catch(e){
    if(e.name==='AbortError') throw new Error('Tempo limite de comunicação excedido.');
    throw e;
  }finally{ clearTimeout(timeout); }
}

export async function salvarAtendimento(payload){
  const id=requestId();
  try { return await post('salvarAtendimento',payload,id); }
  catch(e){
    if(!navigator.onLine || /Failed to fetch|NetworkError|Tempo limite/i.test(String(e.message))){
      safeQueue.add({action:'salvarAtendimento',payload,requestId:id,queuedAt:new Date().toISOString()});
      return {ok:true,queued:true,requestId:id};
    }
    throw e;
  }
}

export const salvarAuditoria = payload => post('salvarAuditoria',payload);
export const salvarTreinamento = payload => post('salvarTreinamento',payload);
export const obterDashboard = () => post('dashboard',{});

export async function sincronizarFila(){
  if(CONFIG.MOCK_MODE || !CONFIG.API_URL || !navigator.onLine) return {sent:0,pending:safeQueue.count()};
  const current=safeQueue.get();
  if(!current.length) return {sent:0,pending:0};
  const pending=[]; let sent=0;
  for(const item of current){
    try{
      await post(item.action,item.payload,item.requestId);
      sent++;
    }catch(e){
      pending.push({...item,lastError:String(e.message||e),lastAttempt:new Date().toISOString()});
    }
  }
  safeQueue.replace(pending);
  return {sent,pending:pending.length};
}

function mockDash(){
  const d=demoDb.get(),t=d.atendimentos.filter(x=>x.tipo==='Tentativa de suicídio'),e=d.treinamentos.filter(x=>x.elegivel==='Sim'),a=d.auditorias;
  return {
    totalAtendimentos:d.atendimentos.length,
    tentativas:t.length,
    notificacao:t.length?t.filter(x=>x.notificacao==='Sim').length/t.length:null,
    cobertura:e.length?e.filter(x=>x.realizado==='Sim').length/e.length:null,
    assertividade:a.length?a.reduce((s,x)=>s+(x.assertividade||0),0)/a.length:null,
    indicadores:[]
  };
}
