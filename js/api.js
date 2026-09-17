import {CONFIG} from './config.js';
import {demoDb} from './storage.js';

function requestId(){
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function post(action, payload, id=requestId()){
  if(CONFIG.MOCK_MODE){
    const map={salvarAuditoria:'auditorias',salvarTreinamento:'treinamentos'};
    if(map[action]) return {ok:true,requestId:id,data:demoDb.push(map[action],{...payload,id,createdAt:new Date().toISOString()})};
    if(action==='dashboard') return {ok:true,data:mockDash()};
  }
  if(!CONFIG.API_URL) throw new Error('API_URL não configurada.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
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
  }finally{clearTimeout(timeout)}
}

export const salvarAuditoria=payload=>post('salvarAuditoria',payload);
export const salvarTreinamento=payload=>post('salvarTreinamento',payload);
export const obterDashboard=()=>post('dashboard',{});

function mockDash(){
  const d=demoDb.get(),e=d.treinamentos.filter(x=>x.elegivel==='Sim'),a=d.auditorias;
  return {
    totalAtendimentos:0,
    tentativas:0,
    notificacao:null,
    cobertura:e.length?e.filter(x=>x.realizado==='Sim').length/e.length:null,
    assertividade:a.length?a.reduce((s,x)=>s+(x.assertividade||0),0)/a.length:null,
    indicadores:[]
  };
}
