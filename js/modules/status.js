import {CONFIG} from '../config.js';

export function renderStatus(){
  return `<section class="card">
    <h2>Status da integração</h2>
    <div class="kpis">
      <div class="kpi"><b>${navigator.onLine?'Online':'Offline'}</b><span>Rede</span></div>
      <div class="kpi"><b>${CONFIG.MOCK_MODE?'Teste':'Real'}</b><span>Modo</span></div>
      <div class="kpi"><b>V${CONFIG.APP_VERSION}</b><span>Aplicativo</span></div>
    </div>
    <div id="apiStatus" class="banner ${CONFIG.MOCK_MODE?'warn':'ok'}">${CONFIG.MOCK_MODE?'Modo de demonstração ativo.':'Verificando Apps Script...'}</div>
    <div class="card integration-flow">
      <strong>Fluxo assistencial</strong>
      <p class="muted">Google Forms → Apps Script → Planilha Mestre → Indicadores → Dashboard</p>
    </div>
    <p class="muted">Na V5.5 o registro de atendimento é feito pelo Google Forms oficial; não existe fila local de atendimentos no aplicativo.</p>
  </section>`;
}

export async function bindStatus(){
  const el=document.querySelector('#apiStatus');
  if(CONFIG.MOCK_MODE||!CONFIG.API_URL)return;
  try{
    const url=CONFIG.API_URL+(CONFIG.API_URL.includes('?')?'&':'?')+'action=health';
    const r=await fetch(url,{cache:'no-store'});
    const d=await r.json();
    if(!d.ok)throw new Error(d.error||'Falha');
    el.className='banner ok';
    const backend=d.app?` Backend: ${d.app}.`:'';
    const who=d.user?.email?` Usuário: ${d.user.email}.`:'';
    el.textContent=d.structure?.ok?`API conectada e estrutura validada.${backend}${who}`:`API conectada, mas faltam abas: ${(d.structure?.missing||[]).join(', ')}`;
  }catch(e){
    el.className='banner bad';
    el.textContent='Não foi possível validar a API: '+e.message;
  }
}
