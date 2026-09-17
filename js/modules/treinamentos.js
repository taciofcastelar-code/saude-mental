import {obterDashboard} from '../api.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sorted=obj=>Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);
const rows=obj=>sorted(obj).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('');
const optionList=items=>items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');

export function renderTreinamentos(){
  return `<section class='card'>
    <h2>Treinamentos</h2>
    <div class='banner ok'><strong>Fonte oficial: Lista de Presença</strong><br>Todo profissional que consta na lista é contabilizado como treinado.</div>
    <div class='filter-grid'>
      <div><label>Instituição</label><select id='treinoInstituicao'><option value='__TODAS__'>Todas as instituições</option></select></div>
      <div><label>Categoria profissional</label><select id='treinoCategoria'><option value='__TODAS__'>Todas as categorias</option></select></div>
    </div>
    <div id='treinoBody' class='muted'>Carregando...</div>
  </section>`;
}

export async function bindTreinamentos(){
  const body=document.querySelector('#treinoBody');
  const instSel=document.querySelector('#treinoInstituicao');
  const catSel=document.querySelector('#treinoCategoria');
  try{
    const {data:d}=await obterDashboard();
    const t=d.treinamentos||{};
    const insts=Object.keys(t.instituicoes||{}).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const cats=Object.keys(t.categorias||{}).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    instSel.insertAdjacentHTML('beforeend',optionList(insts));
    catSel.insertAdjacentHTML('beforeend',optionList(cats));

    const draw=()=>{
      const inst=instSel.value,cat=catSel.value;
      const matriz=t.matriz||{};
      let profissionais=0;
      if(inst==='__TODAS__'&&cat==='__TODAS__') profissionais=t.profissionaisTreinados||0;
      else if(inst!=='__TODAS__'&&cat==='__TODAS__') profissionais=(t.instituicoes||{})[inst]||0;
      else if(inst==='__TODAS__'&&cat!=='__TODAS__') profissionais=(t.categorias||{})[cat]||0;
      else profissionais=(matriz[inst]||{})[cat]||0;

      const porInstituicao=cat==='__TODAS__'
        ? (t.instituicoes||{})
        : Object.fromEntries(insts.map(i=>[i,(matriz[i]||{})[cat]||0]).filter(([,v])=>v>0));
      const porCategoria=inst==='__TODAS__'
        ? (t.categorias||{})
        : (matriz[inst]||{});

      body.innerHTML=`<div class='kpis'>
        <div class='kpi'><b>${profissionais}</b><span>Profissionais treinados no filtro</span></div>
        <div class='kpi'><b>${t.profissionaisTreinados||0}</b><span>Profissionais únicos na lista</span></div>
        <div class='kpi'><b>${insts.length}</b><span>Instituições representadas</span></div>
        <div class='kpi'><b>${cats.length}</b><span>Categorias profissionais</span></div>
      </div>
      <div class='profile-grid'>
        <section class='profile-block'><h3>Treinados por instituição</h3><div class='table-wrap'><table><thead><tr><th>Instituição</th><th>Profissionais</th></tr></thead><tbody>${rows(porInstituicao)||'<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table></div></section>
        <section class='profile-block'><h3>Treinados por categoria</h3><div class='table-wrap'><table><thead><tr><th>Categoria</th><th>Profissionais</th></tr></thead><tbody>${rows(porCategoria)||'<tr><td colspan="2">Sem dados</td></tr>'}</tbody></table></div></section>
      </div>
      <h3>Instituição × categoria profissional</h3>
      <div class='table-wrap'><table><thead><tr><th>Instituição</th><th>Categoria</th><th>Profissionais</th></tr></thead><tbody>${insts.flatMap(i=>sorted(matriz[i]||{}).map(([c,n])=>`<tr><td>${esc(i)}</td><td>${esc(c)}</td><td>${n}</td></tr>`)).join('')||'<tr><td colspan="3">Sem dados</td></tr>'}</tbody></table></div>
      <p class='muted'>Os números representam profissionais únicos presentes na lista. Não exibimos nomes, e-mails ou telefones no aplicativo público. Cobertura percentual da instituição exige o total de profissionais elegíveis de cada instituição.</p>`;
    };
    instSel.onchange=draw;catSel.onchange=draw;draw();
  }catch(e){body.textContent=e.message}
}
