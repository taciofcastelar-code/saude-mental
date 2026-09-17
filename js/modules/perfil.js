import {CONFIG} from '../config.js';
import {obterDashboard} from '../api.js';
const pct=(n,d)=>d?`${(100*n/d).toFixed(1)}%`:'—';
const rows=(obj,total)=>Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td><td>${pct(v,total)}</td></tr>`).join('');
const block=(title,obj,total)=>`<section class='profile-block'><h3>${title}</h3><div class='table-wrap'><table><thead><tr><th>Categoria</th><th>N</th><th>%</th></tr></thead><tbody>${rows(obj,total)||'<tr><td colspan="3">Sem dados</td></tr>'}</tbody></table></div></section>`;
export function renderPerfil(){return `<section class='card'><h2>Perfil dos atendimentos</h2><p class='muted'>Distribuição do perfil assistencial por unidade.</p><label>Unidade / visão</label><select id='perfilEscopo'>${CONFIG.ESCOPOS.map(x=>`<option>${x}</option>`).join('')}</select><div id='perfilBody' class='muted'>Carregando...</div></section>`}
export async function bindPerfil(){
  const body=document.querySelector('#perfilBody'),sel=document.querySelector('#perfilEscopo');
  try{
    const {data:d}=await obterDashboard();
    const draw=()=>{
      const a=d.unidades?.[sel.value]?.atendimentos||{};const total=a.total||0;
      body.innerHTML=`<div class='kpis'>
        <div class='kpi'><b>${total}</b><span>Total</span></div>
        <div class='kpi'><b>${a.criseAnsiosa||0}</b><span>Crise ansiosa</span></div>
        <div class='kpi'><b>${a.agitacao||0}</b><span>Agitação</span></div>
        <div class='kpi'><b>${a.tentativas||0}</b><span>Tentativas</span></div>
        <div class='kpi'><b>${a.rapsPrevio===null?'—':(a.rapsPrevio*100).toFixed(1)+'%'}</b><span>RAPS prévia</span></div>
      </div>
      <div class='profile-grid'>${block('Faixa etária',a.faixas,total)}${block('Tipo de crise',a.tipos,total)}${block('Desfecho',a.desfechos,total)}${block('Intervenções',a.intervencoes,a.totalIntervencoes||0)}</div>`;
    };
    sel.onchange=draw;draw();
  }catch(e){body.textContent=e.message}
}
