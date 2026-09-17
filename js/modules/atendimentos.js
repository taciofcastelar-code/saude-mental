import {CONFIG} from '../config.js';

export function renderAtendimentos(){
  return `<section class="card">
    <h2>Registrar atendimento</h2>
    <div class="banner ok"><strong>Coleta oficial pelo Google Forms</strong></div>
    <p>Os atendimentos são registrados no formulário padronizado e enviados automaticamente para a Planilha Mestre pelo Apps Script V5.3.</p>
    <p class="muted">O aplicativo não mantém uma segunda ficha de atendimento. Isso evita duplicidade e mantém uma única fonte oficial de coleta.</p>
    <div class="button-row"><button id="openFormAtendimento" class="primary" type="button">Abrir formulário de atendimento</button></div>
  </section>
  <section class="card">
    <h3>Fluxo de integração</h3>
    <p class="muted">Google Forms → Apps Script V5.3 → Planilha Mestre → Indicadores → Dashboard do aplicativo.</p>
  </section>`;
}

export function bindAtendimentos(showToast){
  const btn=document.querySelector('#openFormAtendimento');
  btn.onclick=()=>{
    if(!CONFIG.FORM_ATENDIMENTOS_URL){showToast('Formulário de atendimento não configurado.');return}
    window.open(CONFIG.FORM_ATENDIMENTOS_URL,'_blank','noopener,noreferrer');
  };
}
