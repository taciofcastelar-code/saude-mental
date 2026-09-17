import {CONFIG} from '../config.js';
import {obterDashboard} from '../api.js';
const pct=v=>v===null||v===undefined?'—':(v*100).toFixed(1)+'%';
const escopoSelect=id=>`<label for='${id}'>Unidade / visão</label><select id='${id}'>${CONFIG.ESCOPOS.map(x=>`<option>${x}</option>`).join('')}</select>`;
export function renderDashboard(){return `<section class='card'><h2>Dashboard municipal</h2><p class='muted'>Visão inicial do protocolo. Selecione uma UPA para analisar separadamente.</p>${escopoSelect('dashEscopo')}<div id='dashBody' class='muted'>Carregando...</div></section>`}
export async function bindDashboard(){
  const body=document.querySelector('#dashBody'),sel=document.querySelector('#dashEscopo');
  try{
    const {data:d}=await obterDashboard();
    const draw=()=>{
      const x=d.unidades?.[sel.value]; if(!x){body.textContent='Sem dados para o escopo selecionado.';return}
      const a=x.atendimentos||{},t=x.treinamento||{},u=x.auditoria||{};
      const comp=(d.comparativo||[]).map(r=>`<tr><td>${r.unidade}</td><td>${r.atendimentos}</td><td>${r.criseAnsiosa}</td><td>${r.agitacao}</td><td>${r.tentativas}</td><td>${r.treinados}</td><td>${pct(r.assertividade)}</td></tr>`).join('');
      body.innerHTML=`<div class='kpis'>
        <div class='kpi'><b>${a.total||0}</b><span>Atendimentos</span></div>
        <div class='kpi'><b>${a.tentativas||0}</b><span>Tentativas de suicídio</span></div>
        <div class='kpi'><b>${pct(a.rapsPrevio)}</b><span>RAPS prévia</span></div>
        <div class='kpi'><b>${t.profissionaisTreinados||0}</b><span>Profissionais treinados</span></div>
        <div class='kpi'><b>${pct(u.assertividade)}</b><span>Adesão ao protocolo</span></div>
      </div>
      <div class='grid mini-grid'>
        <div class='metric-card'><strong>${a.criseAnsiosa||0}</strong><span>Crise ansiosa</span></div>
        <div class='metric-card'><strong>${a.agitacao||0}</strong><span>Agitação psicomotora</span></div>
        <div class='metric-card'><strong>${a.tentativas||0}</strong><span>Tentativa de suicídio</span></div>
        <div class='metric-card'><strong>${pct(a.notificacaoTentativas)}</strong><span>Tentativas notificadas</span></div>
      </div>
      <h3>Comparativo por unidade</h3><div class='table-wrap'><table><thead><tr><th>Unidade</th><th>Total</th><th>Ansiosa</th><th>Agitação</th><th>Tentativas</th><th>Treinados</th><th>Adesão</th></tr></thead><tbody>${comp}</tbody></table></div>
      <div class='button-row'><button class='secondary' data-go='status'>Status da integração</button></div>`;
      body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>location.hash=b.dataset.go);
    };
    sel.onchange=draw;draw();
  }catch(e){body.textContent=e.message}
}
