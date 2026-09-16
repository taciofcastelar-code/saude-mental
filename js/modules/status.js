import {CONFIG} from '../config.js';
import {safeQueue} from '../storage.js';
import {sincronizarFila} from '../api.js';

export function renderStatus(){
  return `<section class="card">
    <h2>Status da integração</h2>
    <div class="kpis">
      <div class="kpi"><b>${navigator.onLine?'Online':'Offline'}</b><span>Rede</span></div>
      <div class="kpi"><b>${CONFIG.MOCK_MODE?'Teste':'Real'}</b><span>Modo</span></div>
      <div class="kpi"><b id="queueCount">${safeQueue.count()}</b><span>Pendentes de sincronização</span></div>
    </div>
    <div id="apiStatus" class="banner ${CONFIG.MOCK_MODE?'warn':'ok'}">${CONFIG.MOCK_MODE?'Modo de demonstração ativo. Publique o Apps Script e configure API_URL.':'Verificando API...'}</div>
    <div class="button-row"><button id="syncBtn" class="secondary" type="button">Sincronizar pendências</button></div>
    <p class="muted">A validação desta tela não grava dados clínicos. A fila offline contém somente registros do módulo Atendimento.</p>
  </section>`;
}

export async function bindStatus(showToast){
  const el=document.querySelector('#apiStatus');
  const q=document.querySelector('#queueCount');
  const sync=document.querySelector('#syncBtn');
  const update=()=>q.textContent=String(safeQueue.count());
  window.addEventListener('queue-changed',update,{once:false});
  sync.onclick=async()=>{
    const r=await sincronizarFila(); update();
    showToast(`${r.sent} registro(s) sincronizado(s); ${r.pending} pendente(s).`);
  };
  if(CONFIG.MOCK_MODE || !CONFIG.API_URL) return;
  try{
    const url=CONFIG.API_URL+(CONFIG.API_URL.includes('?')?'&':'?')+'action=health';
    const r=await fetch(url,{cache:'no-store'});
    const d=await r.json();
    if(!d.ok) throw new Error(d.error||'Falha');
    el.className='banner ok';
    const who=d.user?.email?` Usuário: ${d.user.email}.`:'';
    el.textContent=d.structure?.ok?`API conectada e estrutura validada.${who}`:`API conectada, mas faltam abas: ${(d.structure?.missing||[]).join(', ')}`;
  }catch(e){
    el.className='banner bad';
    el.textContent='Não foi possível validar a API: '+e.message;
  }
}
