import {obterDashboard} from '../api.js';
const pct=v=>v===null||v===undefined?'—':(v*100).toFixed(1)+'%';
export function renderDashboard(){return `<section class='card'><h2>Dashboard</h2><div id='dashBody' class='muted'>Carregando...</div></section>`}
export async function bindDashboard(){
  const el=document.querySelector('#dashBody');
  try{
    const {data:d}=await obterDashboard();
    const rows=(d.indicadores||[]).filter(r=>r && r[0]).map(r=>`<tr>${r.slice(0,6).map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('');
    el.innerHTML=`<div class='kpis'>
      <div class='kpi'><b>${d.totalAtendimentos}</b><span>Atendimentos</span></div>
      <div class='kpi'><b>${d.tentativas}</b><span>Tentativas de suicídio</span></div>
      <div class='kpi'><b>${pct(d.notificacao)}</b><span>Tentativas notificadas</span></div>
      <div class='kpi'><b>${pct(d.cobertura)}</b><span>Cobertura treinamento</span></div>
      <div class='kpi'><b>${pct(d.assertividade)}</b><span>Assertividade assistencial</span></div>
    </div>${rows?`<div class='table-wrap'><table><tbody>${rows}</tbody></table></div>`:''}`;
  }catch(e){el.textContent=e.message}
}
